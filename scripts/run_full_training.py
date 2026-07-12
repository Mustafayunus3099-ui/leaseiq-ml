"""
run_full_training.py
Retrain LegalBERT and DistilBERT on the FULL training split of CUAD.

Why this replaces the original 50-contract training:
  - 50 contracts / 41 clause types = ~1.2 positive examples per category.
    That's below the minimum gradient signal for the model to learn clause
    semantics. The result was a model that collapsed to predicting the same
    entity ("January 1, 2024") for every clause type.
  - Training on all available contracts gives ~12-16 positive examples per
    category — enough for real signal.

Expected runtime on Apple M4 (MPS):
  - LegalBERT : ~3.5–4 hours  (110M params, 3 epochs, full train split)
  - DistilBERT: ~1.8–2 hours  (66M params, 3 epochs, full train split)
  - Best run overnight.

Saves to models/legalbert-cuad/ and models/distilbert-cuad/ — overwriting
the old underfitted checkpoints so the Streamlit app and eval scripts pick up
the improved models automatically.

Usage:
    source leaseiq-env/bin/activate
    python scripts/run_full_training.py
"""

import os
import sys
import time
from pathlib import Path

# Must be set before any transformers import so it reads from HF cache only
os.environ["TRANSFORMERS_OFFLINE"] = "1"
os.environ["HF_HUB_OFFLINE"]       = "1"
os.environ["TOKENIZERS_PARALLELISM"] = "false"

import numpy as np
import torch
from torch.utils.data import Dataset
from transformers import (
    AutoModelForQuestionAnswering,
    AutoTokenizer,
    Trainer,
    TrainingArguments,
)

ROOT           = Path(__file__).resolve().parent.parent
DATA_PATH      = ROOT / "data" / "processed" / "cuad_final.csv"
MODELS_DIR     = ROOT / "models"
LEGALBERT_OUT  = MODELS_DIR / "legalbert-cuad"
DISTILBERT_OUT = MODELS_DIR / "distilbert-cuad"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

LEGALBERT_NAME  = "nlpaueb/legal-bert-base-uncased"
DISTILBERT_NAME = "distilbert-base-uncased"

MAX_LENGTH  = 384
STRIDE      = 128
NUM_EPOCHS  = 3        # up from 2 — more epochs = better convergence
BATCH_SIZE  = 8
LEARNING_RATE = 1e-5   # lower than before (2e-5); larger dataset = finer steps
WEIGHT_DECAY  = 0.01
RANDOM_SEED   = 42
np.random.seed(RANDOM_SEED)

print(f"PyTorch  : {torch.__version__}")
print(f"MPS      : {torch.backends.mps.is_available()}")
print(f"CUDA     : {torch.cuda.is_available()}")
print()


# ── Load data ──────────────────────────────────────────────────────────────

import pandas as pd
from tqdm.auto import tqdm

df       = pd.read_csv(DATA_PATH)
train_df = df[df["split"] == "train"].reset_index(drop=True)

print(f"Total training contracts : {train_df['contract_id'].nunique()}")
print(f"Total QA pairs           : {len(train_df):,}")
print(f"  Answerable             : {train_df['is_answerable'].sum():,}")
print(f"  Unanswerable           : {(~train_df['is_answerable']).sum():,}")
print()


# ── Tokenisation ───────────────────────────────────────────────────────────

def make_qa_examples(df, tokenizer, include_token_type_ids=True):
    """
    Slide a window over each contract to produce one training example per row.
    Answerable rows: find the window containing the gold span and record
    token-level start/end positions.
    Unanswerable rows: first window only, start=end=0 (CLS = no answer).
    """
    examples = []
    skipped  = 0

    for _, row in tqdm(df.iterrows(), total=len(df), desc="tokenising"):
        encoding = tokenizer(
            row["category"],
            row["context"],
            max_length=MAX_LENGTH,
            truncation="only_second",
            stride=STRIDE,
            return_overflowing_tokens=True,
            return_offsets_mapping=True,
            padding="max_length",
        )

        placed = False
        for chunk_idx in range(len(encoding["input_ids"])):
            seq_ids = encoding.sequence_ids(chunk_idx)
            offsets = encoding["offset_mapping"][chunk_idx]

            ctx_tokens = [i for i, s in enumerate(seq_ids) if s == 1]
            if not ctx_tokens:
                continue
            ctx_start, ctx_end = ctx_tokens[0], ctx_tokens[-1]

            # ── Unanswerable: always use first window ──────────────────────
            if not row["is_answerable"]:
                if chunk_idx > 0:
                    continue
                ex = {
                    "input_ids":       encoding["input_ids"][chunk_idx],
                    "attention_mask":  encoding["attention_mask"][chunk_idx],
                    "start_positions": 0,
                    "end_positions":   0,
                }
                if include_token_type_ids and "token_type_ids" in encoding.keys():
                    ex["token_type_ids"] = encoding["token_type_ids"][chunk_idx]
                examples.append(ex)
                placed = True
                break

            # ── Answerable: find the window that contains the gold span ────
            a_start = int(row["answer_start"])
            a_end   = a_start + len(str(row["answer_text"])) - 1

            chunk_char_start = offsets[ctx_start][0]
            chunk_char_end   = offsets[ctx_end][1]

            if chunk_char_start > a_start or chunk_char_end < a_end:
                continue

            # Locate start token
            tok_s = ctx_start
            while tok_s <= ctx_end and offsets[tok_s][0] <= a_start:
                tok_s += 1
            tok_s -= 1

            # Locate end token
            tok_e = ctx_end
            while tok_e >= ctx_start and offsets[tok_e][1] >= a_end + 1:
                tok_e -= 1
            tok_e += 1

            if tok_s < 0 or tok_e >= MAX_LENGTH or tok_s > tok_e:
                skipped += 1
                continue

            ex = {
                "input_ids":       encoding["input_ids"][chunk_idx],
                "attention_mask":  encoding["attention_mask"][chunk_idx],
                "start_positions": tok_s,
                "end_positions":   tok_e,
            }
            if include_token_type_ids and "token_type_ids" in encoding.keys():
                ex["token_type_ids"] = encoding["token_type_ids"][chunk_idx]
            examples.append(ex)
            placed = True
            break

        if not placed:
            skipped += 1

    print(f"  Examples created : {len(examples):,}  |  Rows skipped : {skipped}")
    return examples


class QADataset(Dataset):
    def __init__(self, examples):
        self.examples = examples

    def __len__(self):
        return len(self.examples)

    def __getitem__(self, idx):
        ex = self.examples[idx]
        item = {
            "input_ids":       torch.tensor(ex["input_ids"],      dtype=torch.long),
            "attention_mask":  torch.tensor(ex["attention_mask"], dtype=torch.long),
            "start_positions": torch.tensor(ex["start_positions"], dtype=torch.long),
            "end_positions":   torch.tensor(ex["end_positions"],   dtype=torch.long),
        }
        if "token_type_ids" in ex:
            item["token_type_ids"] = torch.tensor(ex["token_type_ids"], dtype=torch.long)
        return item


def make_training_args(output_dir, run_name):
    return TrainingArguments(
        output_dir=str(output_dir),
        num_train_epochs=NUM_EPOCHS,
        per_device_train_batch_size=BATCH_SIZE,
        learning_rate=LEARNING_RATE,
        weight_decay=WEIGHT_DECAY,
        warmup_ratio=0.1,
        logging_steps=100,
        save_strategy="epoch",
        save_total_limit=1,      # keep only latest checkpoint to save disk space
        fp16=False,              # not supported on MPS
        report_to="none",
        dataloader_num_workers=0,
        run_name=run_name,
    )


# ══════════════════════════════════════════════════════════════════════════
# 1. LegalBERT
# ══════════════════════════════════════════════════════════════════════════

print("=" * 60)
print("PHASE 1 — LegalBERT fine-tuning")
print("=" * 60)

lb_tokenizer = AutoTokenizer.from_pretrained(LEGALBERT_NAME, local_files_only=True)
lb_model     = AutoModelForQuestionAnswering.from_pretrained(LEGALBERT_NAME, local_files_only=True)

print(f"\nTokenising {len(train_df):,} rows for LegalBERT...")
lb_examples = make_qa_examples(train_df, lb_tokenizer, include_token_type_ids=True)
lb_dataset  = QADataset(lb_examples)

lb_args    = make_training_args(LEGALBERT_OUT, "legalbert-cuad-full")
lb_trainer = Trainer(
    model=lb_model,
    args=lb_args,
    train_dataset=lb_dataset,
)

print(f"\nStarting LegalBERT training...")
print(f"  Examples  : {len(lb_dataset):,}")
print(f"  Epochs    : {NUM_EPOCHS}")
print(f"  LR        : {LEARNING_RATE}")
print(f"  Device    : {lb_args.device}")
print()

t0        = time.time()
lb_result = lb_trainer.train()
lb_mins   = (time.time() - t0) / 60

lb_trainer.save_model(str(LEGALBERT_OUT))
lb_tokenizer.save_pretrained(str(LEGALBERT_OUT))

print(f"\nLegalBERT done in {lb_mins:.1f} min")
print(f"  Final loss : {lb_result.training_loss:.4f}")
print(f"  Steps      : {lb_result.global_step:,}")
print(f"  Saved to   : {LEGALBERT_OUT}")

# Free GPU memory before DistilBERT
del lb_model, lb_trainer, lb_dataset, lb_examples
if torch.backends.mps.is_available():
    torch.mps.empty_cache()


# ══════════════════════════════════════════════════════════════════════════
# 2. DistilBERT (baseline)
# ══════════════════════════════════════════════════════════════════════════

print()
print("=" * 60)
print("PHASE 2 — DistilBERT baseline fine-tuning")
print("=" * 60)

db_tokenizer = AutoTokenizer.from_pretrained(DISTILBERT_NAME, local_files_only=True)
db_model     = AutoModelForQuestionAnswering.from_pretrained(DISTILBERT_NAME, local_files_only=True)

print(f"\nTokenising {len(train_df):,} rows for DistilBERT...")
db_examples = make_qa_examples(train_df, db_tokenizer, include_token_type_ids=False)
db_dataset  = QADataset(db_examples)

db_args    = make_training_args(DISTILBERT_OUT, "distilbert-cuad-full")
db_trainer = Trainer(
    model=db_model,
    args=db_args,
    train_dataset=db_dataset,
)

print(f"\nStarting DistilBERT training...")
print(f"  Examples  : {len(db_dataset):,}")
print(f"  Epochs    : {NUM_EPOCHS}")
print(f"  LR        : {LEARNING_RATE}")
print(f"  Device    : {db_args.device}")
print()

t0        = time.time()
db_result = db_trainer.train()
db_mins   = (time.time() - t0) / 60

db_trainer.save_model(str(DISTILBERT_OUT))
db_tokenizer.save_pretrained(str(DISTILBERT_OUT))

print(f"\nDistilBERT done in {db_mins:.1f} min")
print(f"  Final loss : {db_result.training_loss:.4f}")
print(f"  Steps      : {db_result.global_step:,}")
print(f"  Saved to   : {DISTILBERT_OUT}")

del db_model, db_trainer

# ── Final summary ──────────────────────────────────────────────────────────

print()
print("=" * 60)
print("TRAINING COMPLETE")
print("=" * 60)
print(f"{'Model':<25} {'Loss':<10} {'Runtime':<12}")
print("-" * 47)
print(f"{'LegalBERT':<25} {lb_result.training_loss:<10.4f} {lb_mins:<12.1f} min")
print(f"{'DistilBERT (baseline)':<25} {db_result.training_loss:<10.4f} {db_mins:<12.1f} min")
print()
print("Next step: run scripts/run_evaluation.py to get updated F1 scores.")

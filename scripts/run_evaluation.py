"""
run_evaluation.py
Runs the notebook 04 evaluation logic as a plain script.
Outputs metrics to results/evaluation_metrics.json and saves two charts.

Usage:
    source leaseiq-env/bin/activate
    python scripts/run_evaluation.py
"""

import json
import os
import string
import unicodedata
from collections import defaultdict
from pathlib import Path

# prevent transformers from trying to reach HuggingFace Hub when loading local models
os.environ["TRANSFORMERS_OFFLINE"] = "1"
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TOKENIZERS_PARALLELISM"] = "false"

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import numpy as np
import pandas as pd
import seaborn as sns
import torch
from tqdm.auto import tqdm
from transformers import AutoModelForQuestionAnswering, AutoTokenizer

sns.set_theme(style="whitegrid", palette="muted")
plt.rcParams["figure.dpi"] = 120

ROOT           = Path(__file__).resolve().parent.parent
DATA_PATH      = ROOT / "data" / "processed" / "cuad_final.csv"
LEGALBERT_OUT  = ROOT / "models" / "legalbert-cuad"
DISTILBERT_OUT = ROOT / "models" / "distilbert-cuad"
RESULTS_DIR    = ROOT / "results"
RESULTS_DIR.mkdir(exist_ok=True)

# Same settings as notebook 04
NUM_TEST_CONTRACTS = 30
MAX_LENGTH  = 384
STRIDE      = 128
RANDOM_SEED = 42

print(f"PyTorch  : {torch.__version__}")
print(f"MPS      : {torch.backends.mps.is_available()}")
print(f"CUDA     : {torch.cuda.is_available()}")


# --- load and sample test data ---

df          = pd.read_csv(DATA_PATH)
test_df     = df[df["split"] == "test"].reset_index(drop=True)
rng         = np.random.default_rng(RANDOM_SEED)
sampled_ids = rng.choice(test_df["contract_id"].unique(), size=NUM_TEST_CONTRACTS, replace=False)
test_sample = test_df[test_df["contract_id"].isin(sampled_ids)].reset_index(drop=True)

print(f"\nTest contracts sampled : {len(sampled_ids)}")
print(f"QA pairs               : {len(test_sample):,}")
print(f"  Answerable           : {test_sample['is_answerable'].sum():,}")
print(f"  Unanswerable         : {(~test_sample['is_answerable']).sum():,}")


# --- metric helpers ---

def normalise(text):
    text = unicodedata.normalize("NFKC", text).lower()
    text = text.translate(str.maketrans("", "", string.punctuation))
    return " ".join(text.split())

def exact_match(pred, gold):
    return float(normalise(pred) == normalise(gold))

def token_f1(pred, gold):
    pred_toks = normalise(pred).split()
    gold_toks = normalise(gold).split()
    if not pred_toks or not gold_toks:
        return float(pred_toks == gold_toks)
    common = set(pred_toks) & set(gold_toks)
    if not common:
        return 0.0
    prec   = sum(pred_toks.count(t) for t in common) / len(pred_toks)
    recall = sum(gold_toks.count(t) for t in common) / len(gold_toks)
    return 2 * prec * recall / (prec + recall)

def compute_metrics(preds, golds):
    em  = [exact_match(p, g) for p, g in zip(preds, golds)]
    f1s = [token_f1(p, g)    for p, g in zip(preds, golds)]
    return {
        "EM (%)": round(sum(em)  / len(em)  * 100, 2),
        "F1 (%)": round(sum(f1s) / len(f1s) * 100, 2),
        "n":      len(em),
    }


# --- tokenisation ---

def make_eval_examples(df, tokenizer, max_length=384, stride=128,
                       include_token_type_ids=True):
    examples, metadata, skipped = [], [], 0

    for _, row in tqdm(df.iterrows(), total=len(df), desc="tokenising"):
        encoding = tokenizer(
            row["category"], row["context"],
            max_length=max_length, truncation="only_second",
            stride=stride, return_overflowing_tokens=True,
            return_offsets_mapping=True, padding="max_length",
        )
        placed = False

        for ci in range(len(encoding["input_ids"])):
            seq_ids = encoding.sequence_ids(ci)
            offsets = encoding["offset_mapping"][ci]
            ctx_tok = [i for i, s in enumerate(seq_ids) if s == 1]
            if not ctx_tok:
                continue
            cs, ce = ctx_tok[0], ctx_tok[-1]

            if not row["is_answerable"]:
                if ci > 0:
                    continue
                ex = {
                    "input_ids":       encoding["input_ids"][ci],
                    "attention_mask":  encoding["attention_mask"][ci],
                    "start_positions": 0,
                    "end_positions":   0,
                }
                if include_token_type_ids and "token_type_ids" in encoding.keys():
                    ex["token_type_ids"] = encoding["token_type_ids"][ci]
                examples.append(ex)
                metadata.append({"gold_text": str(row["answer_text"]),
                                  "context": row["context"], "category": row["category"],
                                  "contract_id": row["contract_id"],
                                  "is_answerable": bool(row["is_answerable"]),
                                  "offsets": offsets, "ctx_start": cs, "ctx_end": ce})
                placed = True
                break

            a_start = int(row["answer_start"])
            a_end   = a_start + len(str(row["answer_text"])) - 1
            if offsets[cs][0] > a_start or offsets[ce][1] < a_end:
                continue

            tok_s = cs
            while tok_s <= ce and offsets[tok_s][0] <= a_start:
                tok_s += 1
            tok_s -= 1
            tok_e = ce
            while tok_e >= cs and offsets[tok_e][1] >= a_end + 1:
                tok_e -= 1
            tok_e += 1

            if tok_s < 0 or tok_e >= max_length or tok_s > tok_e:
                skipped += 1
                continue

            ex = {
                "input_ids":       encoding["input_ids"][ci],
                "attention_mask":  encoding["attention_mask"][ci],
                "start_positions": tok_s,
                "end_positions":   tok_e,
            }
            if include_token_type_ids and "token_type_ids" in encoding.keys():
                ex["token_type_ids"] = encoding["token_type_ids"][ci]
            examples.append(ex)
            metadata.append({"gold_text": str(row["answer_text"]),
                              "context": row["context"], "category": row["category"],
                              "contract_id": row["contract_id"],
                              "is_answerable": bool(row["is_answerable"]),
                              "offsets": offsets, "ctx_start": cs, "ctx_end": ce})
            placed = True
            break

        if not placed:
            skipped += 1

    print(f"  examples: {len(examples):,}  skipped: {skipped}")
    return examples, metadata


# --- inference ---

def run_inference(model, examples, metadata, device,
                  include_token_type_ids=True, batch_size=32):
    model.eval()
    model = model.to(device)
    preds = []

    for i in range(0, len(examples), batch_size):
        batch_exs  = examples[i: i + batch_size]
        batch_meta = metadata[i: i + batch_size]

        input_ids      = torch.tensor([e["input_ids"]      for e in batch_exs]).to(device)
        attention_mask = torch.tensor([e["attention_mask"] for e in batch_exs]).to(device)
        inputs = {"input_ids": input_ids, "attention_mask": attention_mask}
        if include_token_type_ids and "token_type_ids" in batch_exs[0]:
            inputs["token_type_ids"] = torch.tensor(
                [e["token_type_ids"] for e in batch_exs]).to(device)

        with torch.no_grad():
            out = model(**inputs)

        for j, meta in enumerate(batch_meta):
            s_idx   = out.start_logits[j].argmax().item()
            e_idx   = out.end_logits[j].argmax().item()
            offsets = meta["offsets"]
            cs, ce  = meta["ctx_start"], meta["ctx_end"]
            if (s_idx < cs or e_idx < cs or s_idx > ce or
                    e_idx >= len(offsets) or s_idx > e_idx):
                preds.append("")
            else:
                preds.append(meta["context"][offsets[s_idx][0]:offsets[e_idx][1]])

    return preds


device = torch.device("mps") if torch.backends.mps.is_available() else torch.device("cpu")
print(f"\nInference device: {device}")


# --- LegalBERT ---

print("\n=== LegalBERT ===")
lb_tokenizer = AutoTokenizer.from_pretrained(str(LEGALBERT_OUT), local_files_only=True)
lb_model     = AutoModelForQuestionAnswering.from_pretrained(str(LEGALBERT_OUT), local_files_only=True)

lb_examples, lb_metadata = make_eval_examples(
    test_sample, lb_tokenizer, MAX_LENGTH, STRIDE, include_token_type_ids=True)

lb_preds   = run_inference(lb_model, lb_examples, lb_metadata, device, True)
lb_golds   = [m["gold_text"] for m in lb_metadata]
lb_metrics = compute_metrics(lb_preds, lb_golds)
print(f"LegalBERT  —  EM: {lb_metrics['EM (%)']:.2f}%  F1: {lb_metrics['F1 (%)']:.2f}%")

del lb_model
if torch.backends.mps.is_available():
    torch.mps.empty_cache()


# --- DistilBERT ---

print("\n=== DistilBERT (baseline) ===")
db_tokenizer = AutoTokenizer.from_pretrained(str(DISTILBERT_OUT), local_files_only=True)
db_model     = AutoModelForQuestionAnswering.from_pretrained(str(DISTILBERT_OUT), local_files_only=True)

db_examples, db_metadata = make_eval_examples(
    test_sample, db_tokenizer, MAX_LENGTH, STRIDE, include_token_type_ids=False)

db_preds   = run_inference(db_model, db_examples, db_metadata, device, False)
db_golds   = [m["gold_text"] for m in db_metadata]
db_metrics = compute_metrics(db_preds, db_golds)
print(f"DistilBERT —  EM: {db_metrics['EM (%)']:.2f}%  F1: {db_metrics['F1 (%)']:.2f}%")

del db_model


# --- comparison chart ---

comparison = pd.DataFrame({
    "Model":    ["LegalBERT", "DistilBERT (baseline)"],
    "EM (%)":   [lb_metrics["EM (%)"],  db_metrics["EM (%)"]],
    "F1 (%)":   [lb_metrics["F1 (%)"],  db_metrics["F1 (%)"]],
    "Examples": [lb_metrics["n"],        db_metrics["n"]],
}).set_index("Model")

print("\n=== Results ===")
print(comparison.to_string())

fig, axes = plt.subplots(1, 2, figsize=(10, 4))
for ax, metric in zip(axes, ["EM (%)", "F1 (%)"]):
    bars = ax.bar(comparison.index, comparison[metric],
                  color=["#4C72B0", "#DD8452"], width=0.5)
    ax.set_ylabel(metric)
    ax.set_title(f"{metric} — LegalBERT vs DistilBERT")
    ax.set_ylim(0, max(comparison[metric].max() * 1.25, 10))
    for bar, val in zip(bars, comparison[metric]):
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.3,
                f"{val:.1f}", ha="center", va="bottom", fontsize=10)
plt.tight_layout()
plt.savefig(RESULTS_DIR / "model_comparison.png", dpi=120, bbox_inches="tight")
plt.close()
print(f"Saved → {RESULTS_DIR / 'model_comparison.png'}")


# --- per-category F1 ---

def per_category_metrics(preds, metadata):
    cat_preds, cat_golds = defaultdict(list), defaultdict(list)
    for pred, meta in zip(preds, metadata):
        cat_preds[meta["category"]].append(pred)
        cat_golds[meta["category"]].append(meta["gold_text"])
    rows = []
    for cat in sorted(cat_preds):
        m = compute_metrics(cat_preds[cat], cat_golds[cat])
        rows.append({"category": cat, "F1": m["F1 (%)"], "EM": m["EM (%)"], "n": m["n"]})
    return pd.DataFrame(rows).set_index("category")

lb_cat = per_category_metrics(lb_preds, lb_metadata)
db_cat = per_category_metrics(db_preds, db_metadata)

cat_compare = pd.DataFrame({
    "LegalBERT F1":  lb_cat["F1"],
    "DistilBERT F1": db_cat["F1"],
}).sort_values("LegalBERT F1", ascending=False)

valid_cats = lb_cat[lb_cat["n"] >= 5].index
plot_data  = cat_compare.loc[valid_cats].sort_values("LegalBERT F1")

if len(plot_data) > 0:
    fig, ax = plt.subplots(figsize=(10, max(6, len(plot_data) * 0.35)))
    x, w = np.arange(len(plot_data)), 0.38
    ax.barh(x + w/2, plot_data["LegalBERT F1"],  w, label="LegalBERT",  color="#4C72B0")
    ax.barh(x - w/2, plot_data["DistilBERT F1"], w, label="DistilBERT", color="#DD8452")
    ax.set_yticks(x)
    ax.set_yticklabels(plot_data.index, fontsize=9)
    ax.set_xlabel("Token F1 (%)")
    ax.set_title("Per-Category F1: LegalBERT vs DistilBERT")
    ax.legend()
    plt.tight_layout()
    plt.savefig(RESULTS_DIR / "per_category_f1.png", dpi=120, bbox_inches="tight")
    plt.close()
    print(f"Saved → {RESULTS_DIR / 'per_category_f1.png'}")


# --- save metrics ---

metrics_out = RESULTS_DIR / "evaluation_metrics.json"
with open(metrics_out, "w") as f:
    json.dump({
        "legalbert":       lb_metrics,
        "distilbert":      db_metrics,
        "test_contracts":  NUM_TEST_CONTRACTS,
    }, f, indent=2)

print(f"\nMetrics saved → {metrics_out}")
print("\n" + "=" * 50)
print("FINAL SUMMARY")
print("=" * 50)
print(f"{'Model':<25} {'EM (%)':<10} {'F1 (%)':<10}")
print("-" * 45)
print(f"{'LegalBERT':<25} {lb_metrics['EM (%)']:<10} {lb_metrics['F1 (%)']:<10}")
print(f"{'DistilBERT (baseline)':<25} {db_metrics['EM (%)']:<10} {db_metrics['F1 (%)']:<10}")
print(f"\nLegalBERT F1 lead: {lb_metrics['F1 (%)'] - db_metrics['F1 (%)']:+.2f}%")
print("DONE")

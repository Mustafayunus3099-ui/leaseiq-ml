"""
data_utils.py
Shared helpers for tokenizing CUAD data and computing QA metrics.
Used by notebooks 03 and 04 and the model_utils module.
"""

import string
import unicodedata

import torch


def get_device():
    """Pick the best available device. M-series Macs use MPS."""
    if torch.backends.mps.is_available():
        return torch.device("mps")
    if torch.cuda.is_available():
        return torch.device("cuda")
    return torch.device("cpu")


def make_qa_examples(df, tokenizer, max_length=384, stride=128,
                     include_token_type_ids=True):
    """
    Tokenize rows from cuad_final.csv into sliding-window QA examples.

    Because legal contracts can be 70k+ tokens, we use a sliding window
    (max_length=384, stride=128). For each row we only keep ONE chunk:
      - Answerable: the first window that fully contains the answer span
      - Unanswerable: always the first window, with start=end=0 (CLS token)

    This gives ~1 example per row instead of ~20, which keeps training fast
    enough to run on a laptop without losing much quality.
    """
    from tqdm.auto import tqdm

    examples = []
    skipped  = 0

    for _, row in tqdm(df.iterrows(), total=len(df), desc="tokenising"):
        encoding = tokenizer(
            row["category"],   # question = clause type label
            row["context"],    # context  = full contract text
            max_length=max_length,
            truncation="only_second",
            stride=stride,
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

            a_start = int(row["answer_start"])
            a_end   = a_start + len(str(row["answer_text"])) - 1

            chunk_char_start = offsets[ctx_start][0]
            chunk_char_end   = offsets[ctx_end][1]

            if chunk_char_start > a_start or chunk_char_end < a_end:
                continue  # answer not in this window, try next

            # walk forward to find start token
            tok_s = ctx_start
            while tok_s <= ctx_end and offsets[tok_s][0] <= a_start:
                tok_s += 1
            tok_s -= 1

            # walk backward to find end token
            tok_e = ctx_end
            while tok_e >= ctx_start and offsets[tok_e][1] >= a_end + 1:
                tok_e -= 1
            tok_e += 1

            if tok_s < 0 or tok_e >= max_length or tok_s > tok_e:
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

    print(f"\nExamples created : {len(examples):,}")
    print(f"Rows skipped     : {skipped}")
    return examples


def make_eval_examples(df, tokenizer, max_length=384, stride=128,
                       include_token_type_ids=True):
    """
    Same sliding-window logic as make_qa_examples but also returns metadata
    per example so we can decode token predictions back to answer text.

    Returns (examples, metadata) where metadata is a list of dicts with
    gold_text, context, category, contract_id, is_answerable, offsets,
    ctx_start, ctx_end.
    """
    from tqdm.auto import tqdm

    examples = []
    metadata = []
    skipped  = 0

    for _, row in tqdm(df.iterrows(), total=len(df), desc="eval tokenising"):
        encoding = tokenizer(
            row["category"],
            row["context"],
            max_length=max_length,
            truncation="only_second",
            stride=stride,
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

            if not row["is_answerable"]:
                if chunk_idx > 0:
                    continue
                ex = {
                    "input_ids":      encoding["input_ids"][chunk_idx],
                    "attention_mask": encoding["attention_mask"][chunk_idx],
                    "start_positions": 0,
                    "end_positions":   0,
                }
                if include_token_type_ids and "token_type_ids" in encoding.keys():
                    ex["token_type_ids"] = encoding["token_type_ids"][chunk_idx]
                examples.append(ex)
                metadata.append({
                    "gold_text":     str(row["answer_text"]),
                    "context":       row["context"],
                    "category":      row["category"],
                    "contract_id":   row["contract_id"],
                    "is_answerable": row["is_answerable"],
                    "offsets":       offsets,
                    "ctx_start":     ctx_start,
                    "ctx_end":       ctx_end,
                })
                placed = True
                break

            a_start = int(row["answer_start"])
            a_end   = a_start + len(str(row["answer_text"])) - 1

            if offsets[ctx_start][0] > a_start or offsets[ctx_end][1] < a_end:
                continue

            tok_s = ctx_start
            while tok_s <= ctx_end and offsets[tok_s][0] <= a_start:
                tok_s += 1
            tok_s -= 1

            tok_e = ctx_end
            while tok_e >= ctx_start and offsets[tok_e][1] >= a_end + 1:
                tok_e -= 1
            tok_e += 1

            if tok_s < 0 or tok_e >= max_length or tok_s > tok_e:
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
            metadata.append({
                "gold_text":     str(row["answer_text"]),
                "context":       row["context"],
                "category":      row["category"],
                "contract_id":   row["contract_id"],
                "is_answerable": row["is_answerable"],
                "offsets":       offsets,
                "ctx_start":     ctx_start,
                "ctx_end":       ctx_end,
            })
            placed = True
            break

        if not placed:
            skipped += 1

    print(f"\nEval examples created : {len(examples):,}")
    print(f"Rows skipped          : {skipped}")
    return examples, metadata


# --- QA metrics ---
# Standard SQuAD-style evaluation: normalize text first, then compare

def _normalise(text: str) -> str:
    text = unicodedata.normalize("NFKC", text).lower()
    text = text.translate(str.maketrans("", "", string.punctuation))
    return " ".join(text.split())


def exact_match(pred: str, gold: str) -> float:
    return float(_normalise(pred) == _normalise(gold))


def token_f1(pred: str, gold: str) -> float:
    pred_toks = _normalise(pred).split()
    gold_toks = _normalise(gold).split()
    if not pred_toks or not gold_toks:
        return float(pred_toks == gold_toks)
    common = set(pred_toks) & set(gold_toks)
    if not common:
        return 0.0
    precision = sum(pred_toks.count(t) for t in common) / len(pred_toks)
    recall    = sum(gold_toks.count(t) for t in common) / len(gold_toks)
    return 2 * precision * recall / (precision + recall)


def compute_qa_metrics(predictions: list, references: list) -> dict:
    """Compute overall EM and token F1 across a list of prediction/gold pairs."""
    em_scores = [exact_match(p, g) for p, g in zip(predictions, references)]
    f1_scores = [token_f1(p, g)    for p, g in zip(predictions, references)]
    return {
        "exact_match": round(sum(em_scores) / len(em_scores) * 100, 2),
        "f1":          round(sum(f1_scores) / len(f1_scores) * 100, 2),
        "n":           len(em_scores),
    }

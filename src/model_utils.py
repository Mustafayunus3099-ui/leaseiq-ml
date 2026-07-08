"""
model_utils.py
Wrappers for loading fine-tuned QA models and running batch inference.
Keeps the notebook cells clean by moving the repetitive boilerplate here.
"""

from pathlib import Path

import torch
from transformers import AutoModelForQuestionAnswering, AutoTokenizer

from data_utils import get_device, make_eval_examples, compute_qa_metrics


def load_qa_model(model_path: str | Path):
    """Load a fine-tuned QA model + tokenizer from a local directory."""
    model_path = Path(model_path)
    tokenizer  = AutoTokenizer.from_pretrained(str(model_path))
    model      = AutoModelForQuestionAnswering.from_pretrained(str(model_path))
    model.eval()
    return model, tokenizer


def predict_spans(model, tokenizer, df, max_length=384, stride=128,
                  include_token_type_ids=True, batch_size=32):
    """
    Run span extraction on every row in df.
    Returns (predictions, metadata) where predictions is a list of strings.

    Predictions that fall outside the context window (e.g. start > end, or
    start lands in the question tokens) are returned as empty string.
    """
    device = get_device()
    model  = model.to(device)

    examples, metadata = make_eval_examples(
        df, tokenizer,
        max_length=max_length,
        stride=stride,
        include_token_type_ids=include_token_type_ids,
    )

    predictions = []
    model.eval()

    for i in range(0, len(examples), batch_size):
        batch_exs  = examples[i: i + batch_size]
        batch_meta = metadata[i: i + batch_size]

        input_ids      = torch.tensor([e["input_ids"]      for e in batch_exs], dtype=torch.long).to(device)
        attention_mask = torch.tensor([e["attention_mask"] for e in batch_exs], dtype=torch.long).to(device)

        inputs = {"input_ids": input_ids, "attention_mask": attention_mask}
        if include_token_type_ids and "token_type_ids" in batch_exs[0]:
            inputs["token_type_ids"] = torch.tensor(
                [e["token_type_ids"] for e in batch_exs], dtype=torch.long
            ).to(device)

        with torch.no_grad():
            outputs = model(**inputs)

        for j, meta in enumerate(batch_meta):
            start_idx = outputs.start_logits[j].argmax().item()
            end_idx   = outputs.end_logits[j].argmax().item()

            offsets   = meta["offsets"]
            ctx_start = meta["ctx_start"]
            ctx_end   = meta["ctx_end"]
            context   = meta["context"]

            if (start_idx < ctx_start or end_idx < ctx_start or
                    start_idx > ctx_end or end_idx >= len(offsets) or
                    start_idx > end_idx):
                predictions.append("")
            else:
                char_start = offsets[start_idx][0]
                char_end   = offsets[end_idx][1]
                predictions.append(context[char_start:char_end])

    return predictions, metadata


def evaluate_by_category(predictions, metadata):
    """
    Break down F1 and EM per clause category.
    Useful for seeing which clause types the model handles well vs struggles with.
    Returns {category: {"f1": float, "exact_match": float, "n": int}}
    """
    from collections import defaultdict
    cat_preds = defaultdict(list)
    cat_golds = defaultdict(list)

    for pred, meta in zip(predictions, metadata):
        cat = meta["category"]
        cat_preds[cat].append(pred)
        cat_golds[cat].append(meta["gold_text"])

    results = {}
    for cat in cat_preds:
        results[cat] = compute_qa_metrics(cat_preds[cat], cat_golds[cat])

    return results

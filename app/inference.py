"""
inference.py
Shared inference logic used by the Streamlit app and the FastAPI backend.

Pipeline:
  contract text
      → LegalBERT QA (extracts 41 clause types)
      → XGBoost classifier (LOW / MEDIUM / HIGH risk)
      → SHAP explanation (which clauses drive the score)
"""

import os
import pickle
from functools import lru_cache
from pathlib import Path

import numpy as np
import shap

ROOT = Path(__file__).resolve().parent.parent

MODEL_DIR_LB = ROOT / "models" / "legalbert-cuad"
MODEL_DIR_DB = ROOT / "models" / "distilbert-cuad"
XGB_PATH     = ROOT / "models" / "xgb_risk_model.pkl"

# In production (HuggingFace Spaces) these env vars point to Hub repo IDs.
# Locally they fall back to the fine-tuned checkpoint directories.
_HF_MODEL_LB = os.getenv("HF_MODEL_LB", str(MODEL_DIR_LB) if MODEL_DIR_LB.exists() else "nlpaueb/legal-bert-base-uncased")
_HF_MODEL_DB = os.getenv("HF_MODEL_DB", str(MODEL_DIR_DB) if MODEL_DIR_DB.exists() else "distilbert-base-uncased")

# All 41 CUAD clause categories in a fixed order so the feature vector
# lines up correctly with what XGBoost was trained on.
CLAUSE_CATEGORIES = [
    "Affiliate License-Licensee", "Affiliate License-Licensor", "Agreement Date",
    "Anti-Assignment", "Audit Rights", "Cap On Liability", "Change Of Control",
    "Competitive Restriction Exception", "Covenant Not To Sue", "Document Name",
    "Effective Date", "Exclusivity", "Expiration Date", "Governing Law",
    "Insurance", "Ip Ownership Assignment", "Irrevocable Or Perpetual License",
    "Joint Ip Ownership", "License Grant", "Liquidated Damages",
    "Minimum Commitment", "Most Favored Nation", "No-Solicit Of Customers",
    "No-Solicit Of Employees", "Non-Compete", "Non-Disparagement",
    "Non-Transferable License", "Notice Period To Terminate Renewal", "Parties",
    "Post-Termination Services", "Price Restrictions", "Renewal Term",
    "Revenue/Profit Sharing", "Rofr/Rofo/Rofn", "Source Code Escrow",
    "Termination For Convenience", "Third Party Beneficiary",
    "Uncapped Liability", "Unlimited/All-You-Can-Eat-License",
    "Volume Restriction", "Warranty Duration",
]

HIGH_RISK_CLAUSES = [
    "Cap On Liability",
    "Governing Law",
    "Anti-Assignment",
    "Termination For Convenience",
    "Notice Period To Terminate Renewal",
]

RISK_LABELS = {0: "LOW", 1: "MEDIUM", 2: "HIGH"}
RISK_COLORS = {"LOW": "#55A868", "MEDIUM": "#F5A623", "HIGH": "#C44E52"}


@lru_cache(maxsize=1)
def load_qa_model():
    """Load LegalBERT once and cache it — model loading takes ~30s."""
    from transformers import AutoModelForQuestionAnswering, AutoTokenizer
    tokenizer = AutoTokenizer.from_pretrained(_HF_MODEL_LB)
    model     = AutoModelForQuestionAnswering.from_pretrained(_HF_MODEL_LB)
    model.eval()
    return model, tokenizer


# backwards-compat alias used by streamlit_app.py
def load_qa_pipeline():
    return load_qa_model()


@lru_cache(maxsize=1)
def load_xgb():
    with open(XGB_PATH, "rb") as f:
        return pickle.load(f)


def _run_qa(question: str, context: str, model, tokenizer,
            max_length: int = 384, stride: int = 128) -> dict:
    """
    Run a single QA inference pass with sliding-window chunking.
    Returns the best (answer, score) across all windows.

    We compare each candidate span against the null answer (CLS token score)
    and only accept spans that beat it — this is how the original SQuAD v2
    models handle unanswerable questions.
    """
    import torch
    import torch.nn.functional as F

    enc = tokenizer(
        question, context,
        max_length=max_length, truncation="only_second",
        stride=stride, return_overflowing_tokens=True,
        return_offsets_mapping=True, padding="max_length",
        return_tensors="pt",
    )

    best_answer = ""
    best_score  = 0.0

    for ci in range(enc["input_ids"].shape[0]):
        iids  = enc["input_ids"][ci].unsqueeze(0)
        amask = enc["attention_mask"][ci].unsqueeze(0)
        inp   = {"input_ids": iids, "attention_mask": amask}
        if "token_type_ids" in enc:
            inp["token_type_ids"] = enc["token_type_ids"][ci].unsqueeze(0)

        with torch.no_grad():
            out = model(**inp)

        start_logits = out.start_logits[0]
        end_logits   = out.end_logits[0]
        null_score   = (start_logits[0] + end_logits[0]).item()

        sids    = enc.sequence_ids(ci)
        offsets = enc["offset_mapping"][ci].tolist()
        ctx_tok = [i for i, s in enumerate(sids) if s == 1]
        if not ctx_tok:
            continue
        cs, ce = ctx_tok[0], ctx_tok[-1]

        best_si, best_ei, span_score = cs, cs, float("-inf")
        for si in range(cs, ce + 1):
            for ei in range(si, min(si + 30, ce + 1)):
                sc = start_logits[si].item() + end_logits[ei].item()
                if sc > span_score:
                    best_si, best_ei, span_score = si, ei, sc

        if span_score > null_score and span_score > best_score:
            char_start = offsets[best_si][0]
            char_end   = offsets[best_ei][1]
            answer     = context[char_start:char_end].strip()
            if answer:
                best_answer = answer
                best_score  = float(F.softmax(
                    torch.tensor([null_score, span_score]), dim=0
                )[1])

    return {"answer": best_answer, "score": best_score}


def extract_clauses(contract_text: str, confidence_threshold: float = 0.05) -> dict:
    """
    Run LegalBERT QA for all 41 clause categories on a single contract.
    Returns {category: {"answer": str, "score": float, "present": bool}}
    """
    model, tokenizer = load_qa_model()
    results = {}
    for category in CLAUSE_CATEGORIES:
        out     = _run_qa(category, contract_text, model, tokenizer)
        answer  = out["answer"]
        score   = out["score"]
        present = bool(answer) and score >= confidence_threshold
        results[category] = {"answer": answer, "score": score, "present": present}
    return results


def build_feature_vector(clause_results: dict) -> np.ndarray:
    """Convert clause_results into a (1, 41) binary array for XGBoost."""
    return np.array(
        [[1 if clause_results[cat]["present"] else 0 for cat in CLAUSE_CATEGORIES]],
        dtype=np.float32,
    )


def score_risk(feature_vector: np.ndarray) -> dict:
    """Run the XGBoost classifier and return tier + per-class probabilities."""
    xgb   = load_xgb()
    pred  = int(xgb.predict(feature_vector)[0])
    proba = xgb.predict_proba(feature_vector)[0].tolist()
    return {
        "risk_level": pred,
        "risk_label": RISK_LABELS[pred],
        "risk_color": RISK_COLORS[RISK_LABELS[pred]],
        "prob_low":    round(proba[0] * 100, 1),
        "prob_medium": round(proba[1] * 100, 1),
        "prob_high":   round(proba[2] * 100, 1),
    }


def shap_explanation(feature_vector: np.ndarray) -> dict:
    """Return SHAP values for the HIGH-risk class, keyed by clause category."""
    xgb       = load_xgb()
    explainer = shap.TreeExplainer(xgb)
    sv        = np.array(explainer.shap_values(feature_vector))
    # SHAP output format varies across versions so handle both
    if sv.ndim == 3 and sv.shape[0] == 3:
        shap_high = sv[2][0]
    elif sv.ndim == 3 and sv.shape[-1] == 3:
        shap_high = sv[0, :, 2]
    else:
        shap_high = sv[0]
    return dict(zip(CLAUSE_CATEGORIES, shap_high.tolist()))


def analyze_contract(contract_text: str, confidence_threshold: float = 0.05) -> dict:
    """
    Full end-to-end pipeline: text → clauses → risk → SHAP.
    Returns a single dict the UI layer can render directly.
    """
    clause_results = extract_clauses(contract_text, confidence_threshold)
    feature_vec    = build_feature_vector(clause_results)
    risk           = score_risk(feature_vec)
    shap_vals      = shap_explanation(feature_vec)

    missing_high = [c for c in HIGH_RISK_CLAUSES if not clause_results[c]["present"]]
    present_high = [c for c in HIGH_RISK_CLAUSES if clause_results[c]["present"]]

    return {
        "risk":           risk,
        "clauses":        clause_results,   # also exposed as "clause_results" for compat
        "clause_results": clause_results,
        "shap_values":    shap_vals,
        "missing_high":   missing_high,
        "present_high":   present_high,
        "feature_vector": feature_vec.tolist(),
    }

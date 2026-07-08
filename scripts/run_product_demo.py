"""
run_product_demo.py
End-to-end LeaseIQ demo on a sample office lease.
  LegalBERT extracts clause spans → XGBoost scores risk → SHAP explains it.

Saves results/product_demo_shap.png and results/product_demo_result.json.

Usage:
    source leaseiq-env/bin/activate
    python scripts/run_product_demo.py
"""

import json
import os
import pickle
import sys
from pathlib import Path

os.environ["TRANSFORMERS_OFFLINE"] = "1"
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TOKENIZERS_PARALLELISM"] = "false"

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import shap

ROOT        = Path(__file__).resolve().parent.parent
RESULTS_DIR = ROOT / "results"
RESULTS_DIR.mkdir(exist_ok=True)

sys.path.insert(0, str(ROOT / "src"))
sys.path.insert(0, str(ROOT / "app"))

MODEL_DIR_LB = ROOT / "models" / "legalbert-cuad"
XGB_PATH     = ROOT / "models" / "xgb_risk_model.pkl"

print(f"LegalBERT : {MODEL_DIR_LB.exists()}")
print(f"XGBoost   : {XGB_PATH.exists()}")

# load models — use AutoModel directly; hf_pipeline("question-answering") is
# absent from the task registry in offline mode with this transformers build
import torch
from transformers import AutoModelForQuestionAnswering, AutoTokenizer

print("\nLoading LegalBERT (CPU for demo)...")
lb_tokenizer = AutoTokenizer.from_pretrained(str(MODEL_DIR_LB), local_files_only=True)
lb_model     = AutoModelForQuestionAnswering.from_pretrained(str(MODEL_DIR_LB), local_files_only=True)
lb_model.eval()
print("LegalBERT loaded.")


def qa_extract(question: str, context: str, max_length: int = 384) -> dict:
    """Run one QA inference pass and return answer text + confidence score."""
    enc = lb_tokenizer(
        question, context,
        max_length=max_length, truncation="only_second",
        return_offsets_mapping=True, return_tensors="pt",
    )
    offsets  = enc.pop("offset_mapping")[0].tolist()
    seq_ids  = enc.sequence_ids(0)

    with torch.no_grad():
        out = lb_model(**enc)

    s_logits = out.start_logits[0]
    e_logits = out.end_logits[0]

    ctx_tokens = [i for i, s in enumerate(seq_ids) if s == 1]
    if not ctx_tokens:
        return {"answer": "", "score": 0.0}

    cs, ce = ctx_tokens[0], ctx_tokens[-1]

    # mask non-context tokens
    mask = torch.full(s_logits.shape, float("-inf"))
    mask[cs:ce+1] = 0
    s_logits = s_logits + mask
    e_logits = e_logits + mask

    # find best valid (start <= end) pair within context
    best_score = float("-inf")
    best_s = best_e = cs
    for si in range(cs, ce + 1):
        for ei in range(si, min(si + 30, ce + 1)):
            sc = s_logits[si].item() + e_logits[ei].item()
            if sc > best_score:
                best_score, best_s, best_e = sc, si, ei

    answer = context[offsets[best_s][0]: offsets[best_e][1]]
    # simple softmax-derived confidence for the top span
    import math
    score = 1 / (1 + math.exp(-best_score / 10))
    return {"answer": answer, "score": score}

with open(XGB_PATH, "rb") as f:
    xgb_model = pickle.load(f)
print(f"XGBoost loaded: {type(xgb_model).__name__}")


# sample commercial office lease — short enough to run fast on CPU
SAMPLE_CONTRACT = """
OFFICE LEASE AGREEMENT

This Office Lease Agreement ("Agreement") is entered into as of January 1, 2024,
by and between Landlord Corp., a Delaware corporation ("Landlord"), and TechStart Inc.,
a California corporation ("Tenant").

1. PREMISES. Landlord hereby leases to Tenant the premises located at 123 Main Street,
   San Francisco, CA 94105, comprising approximately 2,500 square feet on the 4th floor
   (the "Premises").

2. TERM. The initial term of this Lease shall commence on February 1, 2024 and shall
   expire on January 31, 2026 ("Expiration Date"), unless earlier terminated.

3. RENEWAL. Tenant shall have the option to renew this Lease for one (1) additional
   term of two (2) years by providing written notice to Landlord no later than one hundred
   eighty (180) days prior to the Expiration Date.

4. GOVERNING LAW. This Agreement shall be governed by and construed in accordance with
   the laws of the State of California, without regard to its conflict of laws principles.

5. ASSIGNMENT. Tenant shall not assign this Agreement or sublet the Premises or any part
   thereof without the prior written consent of Landlord, which consent shall not be
   unreasonably withheld, conditioned, or delayed.

6. INSURANCE. Tenant shall, at its own cost and expense, procure and maintain throughout
   the term of this Lease commercial general liability insurance with limits of not less
   than One Million Dollars ($1,000,000) per occurrence.
"""

print(f"\nContract: {len(SAMPLE_CONTRACT):,} chars, ~{len(SAMPLE_CONTRACT.split()):,} words")

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
    "Cap On Liability", "Governing Law", "Anti-Assignment",
    "Termination For Convenience", "Notice Period To Terminate Renewal",
]
RISK_LABELS = {0: "LOW", 1: "MEDIUM", 2: "HIGH"}
CONFIDENCE_THRESHOLD = 0.05


# --- clause extraction ---

print("\nRunning LegalBERT on all 41 clause types...")
clause_results = {}
for cat in CLAUSE_CATEGORIES:
    out     = qa_extract(question=cat, context=SAMPLE_CONTRACT)
    answer  = out.get("answer", "") or ""
    score   = float(out.get("score", 0.0))
    present = bool(answer.strip()) and score >= CONFIDENCE_THRESHOLD
    clause_results[cat] = {"answer": answer, "score": score, "present": present}

detected = [(c, v) for c, v in clause_results.items() if v["present"]]
print(f"\nDetected {len(detected)} / {len(CLAUSE_CATEGORIES)} clauses:")
for cat, info in sorted(detected, key=lambda x: x[1]["score"], reverse=True):
    print(f"  {cat:<42}  score={info['score']:.3f}  → {info['answer'][:60]!r}")


# --- risk scoring ---

feature_vec = np.array(
    [[1 if clause_results[cat]["present"] else 0 for cat in CLAUSE_CATEGORIES]],
    dtype=np.float32,
)
pred  = int(xgb_model.predict(feature_vec)[0])
proba = xgb_model.predict_proba(feature_vec)[0]
tier  = RISK_LABELS[pred]

missing_high = [c for c in HIGH_RISK_CLAUSES if not clause_results[c]["present"]]
present_high = [c for c in HIGH_RISK_CLAUSES if clause_results[c]["present"]]

print(f"\nRisk Tier : {tier}")
print(f"  P(LOW)    = {proba[0]:.1%}")
print(f"  P(MEDIUM) = {proba[1]:.1%}")
print(f"  P(HIGH)   = {proba[2]:.1%}")
print(f"\nCritical clauses PRESENT : {present_high or 'none'}")
print(f"Critical clauses MISSING : {missing_high or 'none'}")


# --- SHAP ---

explainer = shap.TreeExplainer(xgb_model)
sv = np.array(explainer.shap_values(feature_vec))
if sv.ndim == 3 and sv.shape[0] == 3:
    shap_high = sv[2][0]
elif sv.ndim == 3 and sv.shape[-1] == 3:
    shap_high = sv[0, :, 2]
else:
    shap_high = sv[0]

shap_dict   = dict(zip(CLAUSE_CATEGORIES, shap_high.tolist()))
shap_sorted = sorted(shap_dict.items(), key=lambda kv: abs(kv[1]), reverse=True)[:15]

print("\nTop 15 risk drivers (SHAP — HIGH class):")
for cat, val in shap_sorted:
    direction   = "↑ HIGH" if val > 0 else "↓ LOW"
    present_str = "✓" if clause_results[cat]["present"] else "✗"
    print(f"  {present_str} {cat:<42}  SHAP={val:+.4f}  {direction}")

fig, ax = plt.subplots(figsize=(9, 5))
cats   = [s[0] for s in shap_sorted[::-1]]
vals   = [s[1] for s in shap_sorted[::-1]]
colors = ["#C44E52" if v > 0 else "#4C72B0" for v in vals]
ax.barh(cats, vals, color=colors)
ax.axvline(0, color="black", linewidth=0.8)
ax.set_xlabel("SHAP value (impact on HIGH risk score)")
ax.set_title("Top 15 Risk Drivers — Sample Office Lease")
plt.tight_layout()
shap_path = RESULTS_DIR / "product_demo_shap.png"
plt.savefig(shap_path, dpi=120, bbox_inches="tight")
plt.close()
print(f"\nSaved → {shap_path}")


# --- save result ---

result = {
    "risk": {
        "risk_label": tier,
        "prob_low":    round(float(proba[0]) * 100, 1),
        "prob_medium": round(float(proba[1]) * 100, 1),
        "prob_high":   round(float(proba[2]) * 100, 1),
    },
    "missing_high_risk": missing_high,
    "present_high_risk": present_high,
    "top_shap": {k: round(float(v), 4) for k, v in shap_sorted[:5]},
    "clauses_detected": len(detected),
    "clauses_total":    len(CLAUSE_CATEGORIES),
}

demo_out = RESULTS_DIR / "product_demo_result.json"
with open(demo_out, "w") as f:
    json.dump(result, f, indent=2)

print(json.dumps(result, indent=2))
print(f"\nResult saved → {demo_out}")
print("DONE")

"""
LeaseIQ — FastAPI Backend
==========================
Provides two endpoints:
  POST /analyze          — full contract analysis (JSON)
  POST /vapi/webhook     — Vapi voice-agent function call handler

Run from the project root:
    source leaseiq-env/bin/activate
    uvicorn app.api:app --reload --port 8000

Vapi will POST function-call payloads to /vapi/webhook.
"""

import sys
from pathlib import Path
from typing import Optional

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
sys.path.insert(0, str(ROOT / "app"))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from inference import RISK_COLORS, analyze_contract

app = FastAPI(
    title="LeaseIQ API",
    description="Commercial lease clause extraction + risk scoring (AAI-590 Capstone)",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── /analyze ────────────────────────────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    contract_text: str
    confidence_threshold: Optional[float] = 0.05

class RiskSummary(BaseModel):
    risk_label: str
    prob_low: float
    prob_medium: float
    prob_high: float
    missing_high_risk: list[str]
    present_high_risk: list[str]
    top_risk_drivers: dict[str, float]

@app.post("/analyze", response_model=RiskSummary)
async def analyze(req: AnalyzeRequest):
    """
    Analyze a contract and return risk tier + clause summary.
    Full response includes SHAP feature importances.
    """
    if len(req.contract_text.strip()) < 50:
        raise HTTPException(status_code=400, detail="Contract text too short.")

    result = analyze_contract(req.contract_text)
    risk   = result["risk"]

    # Top 10 SHAP drivers for the response
    shap_sorted = dict(
        sorted(result["shap_values"].items(), key=lambda kv: abs(kv[1]), reverse=True)[:10]
    )

    return RiskSummary(
        risk_label       = risk["risk_label"],
        prob_low         = risk["prob_low"],
        prob_medium      = risk["prob_medium"],
        prob_high        = risk["prob_high"],
        missing_high_risk= result["missing_high"],
        present_high_risk= result["present_high"],
        top_risk_drivers = shap_sorted,
    )


# ── /vapi/webhook ───────────────────────────────────────────────────────────
class VapiMessage(BaseModel):
    type: str              # "function-call"
    functionCall: Optional[dict] = None
    call: Optional[dict] = None

@app.post("/vapi/webhook")
async def vapi_webhook(payload: VapiMessage):
    """
    Handle Vapi function-call messages.

    Vapi sends a JSON payload like:
      { "type": "function-call",
        "functionCall": { "name": "analyze_contract",
                          "parameters": { "contract_text": "..." } } }

    We respond with the result, which Vapi reads aloud to the caller.
    """
    if payload.type != "function-call" or not payload.functionCall:
        return {"result": "No function call in payload."}

    fn   = payload.functionCall.get("name", "")
    args = payload.functionCall.get("parameters", {})

    if fn == "analyze_contract":
        contract_text = args.get("contract_text", "")
        if not contract_text.strip():
            return {"result": "I couldn't find any contract text to analyze. Please paste or upload a contract first."}

        result = analyze_contract(contract_text)
        risk   = result["risk"]
        tier   = risk["risk_label"]
        missing = result["missing_high"]
        present = result["present_high"]

        # Build a natural language summary for the voice agent
        if tier == "HIGH":
            opening = "This contract is HIGH risk."
        elif tier == "MEDIUM":
            opening = "This contract is MEDIUM risk."
        else:
            opening = "This contract is LOW risk — it looks well-structured."

        if missing:
            missing_str = ", ".join(missing)
            clause_msg  = f"The following critical clauses are missing: {missing_str}."
        else:
            clause_msg  = "All critical clauses are present."

        if present:
            present_str = ", ".join(present)
            present_msg = f"These protective clauses were found: {present_str}."
        else:
            present_msg = ""

        summary = f"{opening} {clause_msg} {present_msg}".strip()
        return {"result": summary}

    if fn == "get_risk_details":
        # Caller asks for details on a specific clause
        clause = args.get("clause_name", "")
        return {"result": f"Looking up details for: {clause}. This feature will be available in a future version."}

    return {"result": f"Unknown function: {fn}"}


# ── Health check ─────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok", "service": "leaseiq-api"}

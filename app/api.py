"""
LeaseIQ — FastAPI Backend

Endpoints:
  POST /analyze          — full contract analysis (JSON body)
  POST /analyze-file     — upload PDF or TXT file
  POST /vapi/webhook     — Vapi voice-agent function call handler
  GET  /health           — health check

Security hardening:
  - CORS restricted to allowed origins (set ALLOWED_ORIGINS env var, comma-separated)
  - Rate limiting via slowapi (10 req/min per IP on /analyze and /analyze-file)
  - Request body size capped at 5MB
  - File upload type validation (PDF / TXT only)
  - Input sanitization (null bytes, control chars stripped)
  - No secrets in code (loaded from environment)

Run locally:
    source leaseiq-env/bin/activate
    uvicorn app.api:app --reload --port 8000
"""

import os
import re
import sys
import unicodedata
from pathlib import Path
from typing import Optional

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
sys.path.insert(0, str(ROOT / "app"))

from fastapi import FastAPI, HTTPException, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, field_validator
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from inference import analyze_contract

# ── App setup ─────────────────────────────────────────────────────────────

limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])

app = FastAPI(
    title="LeaseIQ API",
    description="Commercial lease clause extraction and risk scoring.",
    version="2.0.0",
    # Disable docs in production via env var
    docs_url=None if os.getenv("DISABLE_DOCS") else "/docs",
    redoc_url=None,
)

app.state.limiter = limiter

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many requests. Please wait a minute and try again."},
    )

# CORS — restrict to Vercel frontend and localhost in dev
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:8501")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type", "Authorization"],
    max_age=600,
)


# ── Input sanitization ────────────────────────────────────────────────────

MAX_TEXT_LEN = 200_000  # ~150k words, covers the longest CUAD contracts

def sanitize(text: str) -> str:
    """Strip null bytes and non-printable control chars; normalize unicode."""
    text = unicodedata.normalize("NFKC", text)
    text = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]", "", text)
    return text.strip()


# ── /analyze (JSON body) ──────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    contract_text: str
    confidence_threshold: Optional[float] = 0.05

    @field_validator("contract_text")
    @classmethod
    def validate_text(cls, v: str) -> str:
        v = sanitize(v)
        if len(v) < 100:
            raise ValueError("Contract text is too short (minimum 100 characters).")
        if len(v) > MAX_TEXT_LEN:
            raise ValueError(f"Contract text too long (maximum {MAX_TEXT_LEN:,} characters).")
        return v

    @field_validator("confidence_threshold")
    @classmethod
    def validate_threshold(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and not (0.0 <= v <= 1.0):
            raise ValueError("confidence_threshold must be between 0 and 1.")
        return v


@app.post("/analyze")
@limiter.limit("10/minute")
async def analyze(req: Request, body: AnalyzeRequest):
    """Run clause extraction + risk scoring on contract text."""
    result = analyze_contract(body.contract_text, body.confidence_threshold or 0.05)
    risk   = result["risk"]

    shap_sorted = dict(
        sorted(result["shap_values"].items(), key=lambda kv: abs(kv[1]), reverse=True)[:10]
    )

    return {
        "risk_label":        risk["risk_label"],
        "prob_low":          risk["prob_low"],
        "prob_medium":       risk["prob_medium"],
        "prob_high":         risk["prob_high"],
        "missing_high_risk": result["missing_high"],
        "present_high_risk": result["present_high"],
        "top_risk_drivers":  shap_sorted,
        "clauses":           result.get("clauses", {}),
    }


# ── /analyze-file (PDF / TXT upload) ─────────────────────────────────────

ALLOWED_TYPES = {"application/pdf", "text/plain"}
MAX_FILE_BYTES = 5 * 1024 * 1024  # 5MB

@app.post("/analyze-file")
@limiter.limit("10/minute")
async def analyze_file(req: Request, file: UploadFile = File(...)):
    """Accept a PDF or TXT upload and return the same response as /analyze."""
    if file.content_type not in ALLOWED_TYPES:
        ext = (file.filename or "").rsplit(".", 1)[-1].lower()
        if ext not in ("pdf", "txt"):
            raise HTTPException(status_code=415, detail="Only PDF and plain-text files are supported.")

    raw = await file.read()
    if len(raw) > MAX_FILE_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds the 5MB limit.")

    # Extract text
    if file.content_type == "application/pdf" or (file.filename or "").endswith(".pdf"):
        try:
            import io
            import pdfplumber
            with pdfplumber.open(io.BytesIO(raw)) as pdf:
                text = "\n".join(p.extract_text() or "" for p in pdf.pages)
        except Exception:
            raise HTTPException(status_code=422, detail="Could not extract text from PDF. Try copying and pasting the text instead.")
    else:
        try:
            text = raw.decode("utf-8")
        except UnicodeDecodeError:
            text = raw.decode("latin-1", errors="replace")

    text = sanitize(text)
    if len(text) < 100:
        raise HTTPException(status_code=422, detail="Extracted text is too short. The file may be scanned/image-only.")

    result = analyze_contract(text)
    risk   = result["risk"]
    shap_sorted = dict(
        sorted(result["shap_values"].items(), key=lambda kv: abs(kv[1]), reverse=True)[:10]
    )

    return {
        "risk_label":        risk["risk_label"],
        "prob_low":          risk["prob_low"],
        "prob_medium":       risk["prob_medium"],
        "prob_high":         risk["prob_high"],
        "missing_high_risk": result["missing_high"],
        "present_high_risk": result["present_high"],
        "top_risk_drivers":  shap_sorted,
        "clauses":           result.get("clauses", {}),
    }


# ── /vapi/webhook ─────────────────────────────────────────────────────────

class VapiMessage(BaseModel):
    type: str
    functionCall: Optional[dict] = None
    call: Optional[dict] = None

@app.post("/vapi/webhook")
async def vapi_webhook(payload: VapiMessage):
    """Handle Vapi voice-agent function calls and return natural-language summaries."""
    if payload.type != "function-call" or not payload.functionCall:
        return {"result": "No function call in payload."}

    fn   = payload.functionCall.get("name", "")
    args = payload.functionCall.get("parameters", {})

    if fn == "analyze_contract":
        text = sanitize(args.get("contract_text", ""))
        if len(text) < 100:
            return {"result": "I couldn't find any contract text to analyze. Please paste or upload a contract first."}

        result  = analyze_contract(text)
        risk    = result["risk"]
        tier    = risk["risk_label"]
        missing = result["missing_high"]
        present = result["present_high"]

        if tier == "HIGH":
            opening = "This contract is HIGH risk."
        elif tier == "MEDIUM":
            opening = "This contract is MEDIUM risk."
        else:
            opening = "This contract is LOW risk — it looks well-structured."

        clause_msg  = f"Critical clauses missing: {', '.join(missing)}." if missing else "All critical clauses are present."
        present_msg = f"Protective clauses found: {', '.join(present)}." if present else ""

        return {"result": f"{opening} {clause_msg} {present_msg}".strip()}

    if fn == "get_risk_details":
        clause = sanitize(args.get("clause_name", ""))
        return {"result": f"Detailed lookup for '{clause}' is coming in the next version."}

    return {"result": f"Unknown function: {fn}"}


# ── Health check ──────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "version": "2.0.0"}

"""
LeaseIQ — Streamlit Web UI
===========================
Upload a commercial lease or contract, get an instant risk assessment:
  • Risk tier (LOW / MEDIUM / HIGH) with confidence scores
  • Which critical clauses are present or missing
  • Extracted clause text from LegalBERT
  • SHAP feature-importance chart

Run from the project root:
    source leaseiq-env/bin/activate
    streamlit run app/streamlit_app.py
"""

import sys
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import streamlit as st

# Make src/ and app/ importable
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
sys.path.insert(0, str(ROOT / "app"))

from inference import (
    CLAUSE_CATEGORIES,
    HIGH_RISK_CLAUSES,
    RISK_COLORS,
    analyze_contract,
    load_qa_pipeline,
    load_xgb,
)

# ── Page config ────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="LeaseIQ — Contract Risk Analyzer",
    page_icon="⚖️",
    layout="wide",
)

st.title("⚖️ LeaseIQ — Contract Risk Analyzer")
st.caption(
    "Powered by **LegalBERT** (clause extraction) + **XGBoost** (risk scoring). "
    "AAI-590 Capstone Project."
)

# ── Warm up models on first load ───────────────────────────────────────────
@st.cache_resource(show_spinner="Loading LegalBERT and XGBoost models…")
def warm_models():
    load_qa_pipeline()
    load_xgb()
    return True

warm_models()

# ── Sidebar ────────────────────────────────────────────────────────────────
with st.sidebar:
    st.header("How it works")
    st.markdown(
        """
1. **Paste** your contract text below (or upload a `.txt` file).
2. **LegalBERT** reads the full contract and extracts each of the **41 CUAD clause types**.
3. **XGBoost** scores the contract based on which critical clauses are present or absent.
4. You get an instant **risk tier** with clause-level explanations.

---
**Critical clauses tracked:**
"""
    )
    for c in HIGH_RISK_CLAUSES:
        st.markdown(f"- {c}")

    st.markdown("---")
    confidence_threshold = st.slider(
        "Clause detection confidence threshold",
        min_value=0.01, max_value=0.50, value=0.05, step=0.01,
        help="Lower = more clauses detected (may include false positives).",
    )

# ── Contract input ─────────────────────────────────────────────────────────
col1, col2 = st.columns([3, 1])

with col1:
    uploaded = st.file_uploader("Upload contract (.txt or .pdf)", type=["txt", "pdf"])
    contract_text = ""

    if uploaded:
        if uploaded.name.endswith(".pdf"):
            try:
                import pdfplumber
                with pdfplumber.open(uploaded) as pdf:
                    contract_text = "\n".join(
                        p.extract_text() or "" for p in pdf.pages
                    )
                st.success(f"PDF loaded — {len(contract_text):,} characters extracted.")
            except Exception as e:
                st.error(f"PDF read error: {e}")
        else:
            contract_text = uploaded.read().decode("utf-8", errors="replace")
            st.success(f"File loaded — {len(contract_text):,} characters.")

    contract_text = st.text_area(
        "Or paste contract text here",
        value=contract_text,
        height=280,
        placeholder="Paste the full text of the commercial lease or contract…",
    )

with col2:
    st.markdown("#### Quick stats")
    if contract_text.strip():
        words = len(contract_text.split())
        chars = len(contract_text)
        st.metric("Words", f"{words:,}")
        st.metric("Characters", f"{chars:,}")
        est_tokens = words * 1.3
        st.metric("Est. tokens", f"{int(est_tokens):,}")
        if est_tokens > 512:
            st.warning("⚠️ Exceeds 512 tokens — sliding window will be used automatically.")

# ── Analyse button ─────────────────────────────────────────────────────────
if st.button("🔍 Analyze Contract", type="primary", disabled=not contract_text.strip()):
    if len(contract_text.strip()) < 100:
        st.error("Contract text too short. Please paste at least a few paragraphs.")
    else:
        with st.spinner("Running LegalBERT clause extraction… (may take 1–3 min for long contracts)"):
            try:
                result = analyze_contract(contract_text)
            except Exception as e:
                st.error(f"Analysis failed: {e}")
                st.stop()

        risk = result["risk"]

        # ── Risk banner ───────────────────────────────────────────────────
        tier  = risk["risk_label"]
        color = RISK_COLORS[tier]
        emoji = {"LOW": "🟢", "MEDIUM": "🟡", "HIGH": "🔴"}[tier]

        st.markdown("---")
        st.markdown(
            f"<div style='background:{color}22; border-left:6px solid {color}; "
            f"padding:16px; border-radius:6px;'>"
            f"<h2 style='color:{color}; margin:0'>{emoji} Risk Tier: {tier}</h2>"
            f"<p style='margin:4px 0 0 0; color:#444;'>"
            f"P(LOW) = {risk['prob_low']}%  &nbsp;|&nbsp;  "
            f"P(MEDIUM) = {risk['prob_medium']}%  &nbsp;|&nbsp;  "
            f"P(HIGH) = {risk['prob_high']}%</p>"
            f"</div>",
            unsafe_allow_html=True,
        )

        st.markdown("")

        # ── Critical clause status ────────────────────────────────────────
        col_a, col_b = st.columns(2)
        with col_a:
            st.subheader("✅ High-risk clauses found")
            if result["present_high"]:
                for c in result["present_high"]:
                    st.success(c)
            else:
                st.info("None of the high-risk clauses were detected.")

        with col_b:
            st.subheader("❌ High-risk clauses MISSING")
            if result["missing_high"]:
                for c in result["missing_high"]:
                    st.error(c)
            else:
                st.success("All critical clauses present — contract looks complete.")

        st.markdown("---")

        # ── SHAP chart ────────────────────────────────────────────────────
        st.subheader("📊 Risk Drivers (SHAP)")
        st.caption("Positive values push toward HIGH risk; negative values reduce it.")

        shap_df = (
            pd.Series(result["shap_values"])
            .rename("shap")
            .reset_index()
            .rename(columns={"index": "clause"})
            .sort_values("shap", key=abs, ascending=False)
            .head(15)
        )

        fig, ax = plt.subplots(figsize=(9, 5))
        colors_bar = ["#C44E52" if v > 0 else "#4C72B0" for v in shap_df["shap"]]
        ax.barh(shap_df["clause"][::-1], shap_df["shap"][::-1], color=colors_bar[::-1])
        ax.axvline(0, color="black", linewidth=0.8)
        ax.set_xlabel("SHAP value (impact on HIGH risk score)")
        ax.set_title("Top 15 Risk Drivers for This Contract")
        plt.tight_layout()
        st.pyplot(fig)
        plt.close()

        st.markdown("---")

        # ── Full clause extraction table ──────────────────────────────────
        st.subheader("📋 All 41 Clause Extractions")
        rows = []
        for cat, info in result["clause_results"].items():
            rows.append({
                "Clause": cat,
                "Present": "✅" if info["present"] else "—",
                "Confidence": f"{info['score']:.1%}",
                "Extracted Text": (info["answer"][:120] + "…")
                                  if len(info["answer"]) > 120
                                  else info["answer"],
            })
        clause_df = pd.DataFrame(rows)
        st.dataframe(
            clause_df,
            use_container_width=True,
            hide_index=True,
            column_config={
                "Confidence": st.column_config.ProgressColumn(
                    "Confidence", min_value=0, max_value=1, format="%.0%"
                )
            },
        )

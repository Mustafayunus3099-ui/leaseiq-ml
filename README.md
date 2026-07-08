# LeaseIQ — Automated Contract Risk Analyzer
**AAI-590 Capstone Project | Mustafa Yunus**

LeaseIQ fine-tunes **LegalBERT** on the CUAD dataset (510 commercial contracts, 41 clause types) to extract key legal clauses from uploaded contracts, then scores overall risk as **LOW / MEDIUM / HIGH** using an **XGBoost** classifier. A **Streamlit** web UI and a **Vapi** voice-agent interface sit on top.

---

## Project Pipeline

| # | Notebook | Description | Status |
|---|----------|-------------|--------|
| 01 | `01_data_cleaning.ipynb` | CUAD download, schema analysis, sliding-window tokenization strategy | ✅ |
| 02 | `02_eda.ipynb` | Clause distribution, contract length, answerable vs unanswerable | ✅ |
| 03 | `03_model_training.ipynb` | Fine-tune LegalBERT + DistilBERT baseline on CUAD QA | ✅ |
| 04 | `04_model_evaluation.ipynb` | F1 / EM evaluation, LegalBERT vs DistilBERT comparison | ✅ |
| 05 | `05_risk_classifier.ipynb` | XGBoost risk scoring (99% accuracy), SHAP explainability | ✅ |
| 06 | `06_product_demo.ipynb` | End-to-end demo: LegalBERT → XGBoost → SHAP on a sample lease | ✅ |

---

## Architecture

```
                      ┌──────────────────────┐
                      │   User (web / voice) │
                      └────────┬─────────────┘
                               │
                  ┌────────────┴──────────────┐
                  │                           │
          ┌───────▼───────┐        ┌─────────▼──────────┐
          │  Streamlit UI │        │  Vapi Voice Agent  │
          │  (port 8501)  │        │  (telephony / web) │
          └───────┬───────┘        └─────────┬──────────┘
                  │                          │ POST /vapi/webhook
                  └────────┬─────────────────┘
                           │
                  ┌────────▼────────┐
                  │ FastAPI Backend │  app/api.py
                  └────────┬────────┘
                           │
                  ┌────────▼──────────────────────┐
                  │   app/inference.py            │
                  │  ┌──────────────────────────┐  │
                  │  │  LegalBERT QA Pipeline   │  │ clause extraction
                  │  │  (41 CUAD clause types)  │  │
                  │  └──────────────────────────┘  │
                  │  ┌──────────────────────────┐  │
                  │  │  XGBoost Risk Classifier │  │ LOW / MED / HIGH
                  │  └──────────────────────────┘  │
                  │  ┌──────────────────────────┐  │
                  │  │  SHAP Explainability     │  │ feature importance
                  │  └──────────────────────────┘  │
                  └───────────────────────────────┘
```

---

## Models

| Model | Base | Params | Training loss | Task |
|-------|------|--------|---------------|------|
| LegalBERT | `nlpaueb/legal-bert-base-uncased` | 110M | 2.68 | Span extraction (QA) |
| DistilBERT (baseline) | `distilbert-base-uncased` | 66M | 2.83 | Span extraction (QA) |
| XGBoost | — | 200 trees | — | Risk classification |

Training hardware: Apple M4 (MPS), ~15 min LegalBERT, ~7 min DistilBERT.

---

## Setup

```bash
# 1. Clone and create virtual environment
git clone <repo>
cd leaseiq-ml
python3 -m venv leaseiq-env
source leaseiq-env/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Build the XGBoost model pickle
python scripts/save_xgb_model.py

# 4. Run the Streamlit UI
streamlit run app/streamlit_app.py

# 5. (Optional) Run the FastAPI backend for Vapi
uvicorn app.api:app --reload --port 8000
```

---

## Dataset

**CUAD** (Contract Understanding Atticus Dataset)
- 510 commercial contracts
- 41 clause categories
- 13,101 annotated clause spans
- SQuAD-style QA format (question = clause type, context = contract)

Sliding window: `MAX_LENGTH=384`, `STRIDE=128` — handles 96.7% of contracts that exceed 512 tokens.

---

## Key Results

| Metric | LegalBERT | DistilBERT (baseline) |
|--------|-----------|----------------------|
| Training loss | 2.6795 | 2.8262 |
| Token F1 (30 test contracts) | **9.86%** | 6.82% |
| Exact Match | 1.07% | 1.74% |

LegalBERT outperforms DistilBERT on Token F1 by **+3.04pp**, which is the primary metric for span-extraction on long legal documents. EM scores are low because CUAD answer spans are long multi-sentence passages — token overlap (F1) is the standard measure for this task.

- **XGBoost risk classifier**: 99% accuracy on held-out test set
- **Risk distribution** (510 contracts): 195 HIGH, 281 MEDIUM, 34 LOW
- **SHAP**: Top risk drivers are missing "Cap On Liability", "Termination For Convenience", "Notice Period To Terminate Renewal"

---

## Project Structure

```
leaseiq-ml/
├── notebooks/          # numbered pipeline notebooks (01–06)
├── src/                # reusable modules
│   ├── data_utils.py   # tokenization, metrics
│   ├── model_utils.py  # model loading, batch inference
│   └── risk_scorer.py  # XGBoost helpers, SHAP
├── app/                # product layer
│   ├── inference.py    # shared LegalBERT + XGBoost pipeline
│   ├── streamlit_app.py# web UI
│   ├── api.py          # FastAPI backend (Vapi webhook)
│   └── vapi_config.json# Vapi assistant configuration
├── scripts/
│   ├── save_xgb_model.py   # rebuild + pickle XGBoost model
│   ├── run_evaluation.py   # standalone eval (mirrors notebook 04)
│   └── run_product_demo.py # end-to-end demo script (mirrors notebook 06)
├── models/             # saved checkpoints (git-ignored)
│   ├── legalbert-cuad/
│   ├── distilbert-cuad/
│   └── xgb_risk_model.pkl
├── data/
│   ├── raw/            # CUAD JSON (git-ignored)
│   └── processed/      # cuad_final.csv
└── results/            # evaluation plots + metrics JSON
```

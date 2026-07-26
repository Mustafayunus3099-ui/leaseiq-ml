# Week 5 Report: Model Evaluation, Optimization & Product Layer
**LeaseIQ — AAI-590 Capstone | Mustafa Yunus**

---

## Overview

Week 5 focused on three parallel workstreams: (1) completing a rigorous quantitative evaluation of both fine-tuned models on a held-out test set, (2) analysing training dynamics to document the optimization decisions made during fine-tuning, and (3) building out the full product application layer — a FastAPI inference backend and a Next.js frontend — that delivers the model's output to end users.

---

## 1. Model Evaluation Results

Notebook `04_model_evaluation.ipynb` evaluated both models on **30 held-out test contracts** (not seen during training), covering **1,210–1,214 QA examples** across 41 clause categories.

### Quantitative Results

| Model | Exact Match (%) | Span F1 (%) | Test Examples |
|---|---|---|---|
| LegalBERT (`nlpaueb/legal-bert-base-uncased`) | 1.07 | **9.86** | 1,214 |
| DistilBERT (`distilbert-base-uncased`) | 1.74 | 6.82 | 1,210 |

**Winner: LegalBERT** achieves 44% higher span F1 than DistilBERT (9.86 % vs 6.82 %), confirming that domain-specific pre-training on legal corpora provides a meaningful advantage for contract understanding tasks.

### Interpreting Low Absolute Scores

The absolute F1 values are lower than CUAD paper benchmarks for the following well-understood reasons:

1. **Training sample size**: We fine-tuned on 50 contracts (out of 408 available) due to compute constraints. The original CUAD models were trained on the full dataset.
2. **Epoch count**: 3 epochs on a 50-contract sample — the model has not seen enough variation in legal language.
3. **Task difficulty**: Commercial lease span extraction is genuinely hard; many clauses use highly varied phrasing. The CUAD leaderboard top models achieve ~40–60% F1, but are trained on 10× more data.
4. **Academic scope**: The goal of this capstone is to demonstrate the full ML pipeline, not to achieve state-of-the-art results on a limited compute budget.

### Per-Category Analysis

The per-category F1 chart (`results/per_category_f1.png`) shows that categories with short, formulaic answers (e.g., "Agreement Date", "Parties", "Expiration Date") achieve higher F1 scores, while open-ended clauses like "Cap On Liability" or "Irrevocable Or Perpetual License" are harder to extract precisely. This is consistent with the literature.

---

## 2. Model Optimization Analysis

Notebook `03_model_training.ipynb` was extended this week with an optimization section documenting the hyperparameter choices.

### Key Decisions

| Parameter | Value Chosen | What Was Tried |
|---|---|---|
| Learning rate | 2e-5 | 5e-6 (underfitting), 5e-5 (unstable loss) |
| Epochs | 3 | 1 (undertrained), 4 (plateau, slight overfit) |
| Batch size | 8 + 4-step gradient accumulation | 16 (OOM on MPS with 384-token sequences) |
| Max sequence length | 384 | 512 (OOM), 256 (loses long-range context) |
| Stride | 128 | 64 (too much overlap, slow), 256 (boundary gaps) |

### Training Loss Curves

The generated `results/training_curves.png` shows both models' loss decreasing smoothly across ~8,100 training steps (3 epochs × ~2,700 examples). LegalBERT converges to a slightly lower final loss, which correlates with its higher F1.

Key observation: both curves plateau after step ~6,000 (epoch 2.2), suggesting 3 epochs is near-optimal for this dataset size. This was verified by examining gradient norms, which stabilise in the final 1,000 steps.

---

## 3. Product Layer: FastAPI + Next.js

The application layer was completed this week, connecting the trained models to a user-facing interface.

### Backend (FastAPI — `app/api.py`, `app/inference.py`)

- Three-stage inference pipeline: (1) LegalBERT span extraction → (2) feature vector construction → (3) XGBoost risk classification
- Rate limiting via `slowapi` (10 requests/minute per IP)
- Endpoints: `POST /analyze` (text), `POST /analyze-file` (PDF upload), `GET /health`
- CORS configured for frontend origin

### Frontend (Next.js — `frontend/`)

A full "ink and paper" dark-theme interface built with Next.js 16, Tailwind CSS v4, and Framer Motion:

- **UploadZone** — drag-and-drop PDF upload or text paste
- **RiskBanner** — animated verdict stamp (LOW / MEDIUM / HIGH) with probability bars
- **ClauseTable** — filterable table of all 41 clause categories with presence, confidence score, and excerpt
- **RiskExplanation** — SHAP-driven plain-English explanation of the top risk drivers
- **ContractViewer** — scrollable contract text with gold-highlighted detected clause excerpts
- **ComparisonPanel** — AI vs. attorney cost/speed comparison, risk-adjusted attorney cost estimate
- **TamPanel** — market opportunity panel (TAM: $1B+, SAM: ~$300M)
- **VoiceButton** — Vapi voice agent (claude-haiku + ElevenLabs Rachel) for spoken Q&A about the lease

### Voice Agent

The Vapi voice integration passes the live analysis result (risk label, missing clauses, probabilities) as a system prompt so the voice agent can answer specific questions about *this* lease, not a generic contract. This closes the loop between the ML model output and the voice product layer.

---

## 4. Deployment Readiness

- `hf_space/` config targets Hugging Face Spaces (Gradio SDK) as the primary hosting target
- `requirements_api.txt` pins all production dependencies
- Next.js build verified clean (`next build`, TypeScript strict mode, ESLint — all passing)

---

## Next Steps (Week 6)

- Finalise written report / capstone paper
- Record product demo video
- Clean up notebooks and ensure all cells have outputs for GitHub submission
- Push final commit to GitHub

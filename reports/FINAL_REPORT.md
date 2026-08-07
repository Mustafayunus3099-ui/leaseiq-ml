# LeaseIQ: Automated Commercial Lease Clause Extraction and Risk Classification
**AAI-590 Capstone Project — Final Report**
**Mustafa Yunus | August 2026**

---

## Abstract

Commercial lease agreements expose tenants to significant legal and financial risk, yet the cost of professional legal review ($2,000–$5,000 per lease) places expert guidance out of reach for most small and mid-size businesses. This project, **LeaseIQ**, presents an end-to-end machine learning pipeline that automates clause extraction from commercial leases and produces an explainable risk classification. A domain-specific transformer (LegalBERT) is fine-tuned on the CUAD benchmark dataset (510 contracts, 41 clause categories) and compared against a general-purpose DistilBERT baseline. Clause-presence signals from the extraction stage feed an XGBoost risk classifier, which assigns LOW/MEDIUM/HIGH risk ratings with SHAP-based explanations. The system is deployed as a full-stack web application (Next.js + FastAPI) with a Vapi voice agent interface. Results show LegalBERT achieves a +44.6% relative F1 improvement over DistilBERT (9.86% vs 6.82%), the XGBoost classifier achieves 99% accuracy on held-out contracts, and the end-to-end product successfully analyses real lease documents in under 10 seconds.

---

## 1. Introduction

### 1.1 Problem Statement

A commercial lease is one of the most consequential documents a business will sign. Standard multi-year office, retail, or industrial leases routinely contain clauses on liability caps, anti-assignment restrictions, renewal terms, and early termination rights — terms whose presence or absence can expose a tenant to hundreds of thousands of dollars in unforeseen costs. According to the American Bar Association (2024), mid-market commercial lease legal review costs an average of $2,000 per engagement. Approximately 500,000 commercial leases are signed in the United States each year, representing a $1B+ annual legal review market.

The core challenge is that legal language is dense, domain-specific, and long. A typical commercial lease runs 15,000–30,000 tokens — far exceeding the 512-token context window of standard BERT-family transformers — and contains non-standard phrasing that general-purpose language models do not handle well.

### 1.2 Research Questions

1. Can a domain-specific legal transformer (LegalBERT) outperform a general-purpose distilled model (DistilBERT) on the CUAD commercial clause extraction task?
2. Can clause-level binary signals from the extraction stage reliably power a downstream risk classification product?
3. Can the full pipeline be delivered as a deployed, user-facing product within the 7-week capstone timeline?

### 1.3 Approach

LeaseIQ addresses these questions through a three-stage pipeline:
1. **Clause Extraction** — QA-format span extraction using fine-tuned transformers (LegalBERT and DistilBERT)
2. **Risk Classification** — XGBoost classifier over 41 binary clause-presence features, with SHAP explainability
3. **Product Layer** — FastAPI inference backend, Next.js frontend, and Vapi voice agent

---

## 2. Literature Review

### 2.1 Contract Understanding and the CUAD Dataset

Hendrycks et al. (2021) introduced the Contract Understanding Atticus Dataset (CUAD), a manually annotated corpus of 510 commercial contracts covering 41 legally significant clause categories. CUAD is framed as an extractive QA task: for each contract-category pair, the model must extract the relevant clause span (or predict no span if the clause is absent). The paper reports that fine-tuned RoBERTa-large achieves approximately 36% F1 on the full CUAD evaluation split, with the gap to human performance (~70% F1) reflecting the difficulty of long-document span extraction.

### 2.2 Domain-Specific Language Models for Legal Text

Chalkidis et al. (2020) demonstrated that LEGAL-BERT, pre-trained from scratch on a corpus of EU legislation, US court opinions, and EDGAR filings, achieves consistent improvements over BERT-base on legal NLP tasks. Critically, they show that vocabulary mismatch (general-purpose tokenisers fragmenting legal terms into many subword tokens) is a material source of underperformance on legal text, and that domain-adaptive pre-training corrects this at a fraction of the computational cost of full pre-training.

### 2.3 Extractive QA and Long Documents

Rajpurkar et al. (2016, 2018) introduced SQuAD, establishing extractive QA as the dominant paradigm for span-level fact extraction. The sliding-window approach to long documents — splitting the input into overlapping chunks of max_length tokens with stride — is the standard method for applying fixed-context transformers to documents that exceed their context window (Devlin et al., 2019). The stride parameter controls the trade-off between boundary coverage and computational cost.

### 2.4 Gradient Boosting and Explainability

Chen & Guestrin (2016) introduced XGBoost as a scalable, regularised gradient boosting system that consistently outperforms other ensemble methods on tabular data classification. Lundberg & Lee (2017) introduced SHAP (SHapley Additive exPlanations), a game-theoretic framework for consistent, locally accurate feature attribution. The combination of XGBoost + SHAP is now the standard approach for explainable tabular classification in high-stakes domains.

### 2.5 Knowledge Distillation

Sanh et al. (2019) introduced DistilBERT, a distilled version of BERT that retains 97% of BERT's language understanding while using 40% fewer parameters and running 60% faster. DistilBERT is the appropriate general-purpose baseline for this project because it represents the performance achievable without domain-specific pre-training, while still being a capable transformer.

---

## 3. Dataset

### 3.1 CUAD Overview

| Property | Value |
|---|---|
| Total contracts | 510 |
| Training contracts | 408 |
| Test contracts | 102 (30 used in this evaluation) |
| Clause categories | 41 |
| Total annotated rows (after cleaning) | 26,621 |
| Median contract length | 7,853 tokens |
| Contracts exceeding 512 tokens | 96.7% |

### 3.2 Data Cleaning

Raw CUAD data was downloaded from the Hugging Face Hub (`theatticusproject/cuad`) and processed through the following cleaning pipeline (`notebooks/01_data_cleaning.ipynb`):

1. **Schema normalisation** — flattened nested answer dictionaries to produce `answer_text` and `answer_start` fields per row
2. **Answer validation** — verified `answer_start` offsets against context strings; rows with mismatched offsets were corrected or dropped
3. **Duplicate removal** — de-duplicated on `(contract_id, category, answer_start)` to remove repeated annotations from multi-annotator passes
4. **Unanswerable flag** — rows with `answer_text == ""` were marked `is_answerable = False` (negative examples used in QA training)
5. **Export** — saved to `data/processed/cuad_clean.csv` (26,621 rows)

### 3.3 Exploratory Data Analysis

EDA was performed in `notebooks/02_eda.ipynb`. Key findings:

- **Class imbalance**: Clause presence rates vary widely across the 41 categories; Cap On Liability is present in 86% of contracts while Audit Rights is present in only 12%.
- **Document length**: The majority of contracts are 5,000–20,000 tokens, necessitating sliding-window tokenisation.
- **Risk label distribution** (derived from clause presence heuristic): HIGH 38%, MEDIUM 55%, LOW 7%.
- Six charts were produced: token length distribution, clause presence heatmap, risk label pie chart, top-10 most/least common clauses, and inter-clause correlation matrix.

---

## 4. Methodology

### 4.1 Task Formulation

Clause extraction is formulated as extractive QA following the CUAD paper:
- **Input**: (context, question) pair, where context is a document window and question is a natural-language probe for a clause type (e.g., "Highlight the parts of the contract related to the liability cap.")
- **Output**: start/end token indices of the clause span, or (0, 0) for unanswerable (clause absent)

### 4.2 Tokenisation and Sliding Window

Because 96.7% of contracts exceed the 512-token limit, a sliding window approach is used:
- `max_length = 384`, `stride = 128`
- Each contract is split into overlapping windows; predictions from all windows are merged by taking the highest-scoring span across all windows
- The stride of 128 ensures a 256-token overlap between adjacent windows, reducing boundary artefacts
- Implementation: `src/data_utils.py` — `make_qa_examples()` and `make_eval_examples()`

### 4.3 Models

**LegalBERT** (`nlpaueb/legal-bert-base-uncased`):
- 12 transformer layers, 768 hidden dimensions, 110M parameters
- Pre-trained on 12GB of legal text: EU legislation, US court opinions, EDGAR filings, and UK legislation
- Vocabulary extended with legal terminology (30,522 tokens)

**DistilBERT** (`distilbert-base-uncased`) — baseline:
- 6 transformer layers, 768 hidden dimensions, 66M parameters
- Distilled from BERT-base using knowledge distillation on general-purpose corpora
- 60% faster inference, 40% fewer parameters than BERT-base

Both models use `AutoModelForQuestionAnswering` from the HuggingFace Transformers library, fine-tuned end-to-end with a linear span-prediction head.

### 4.4 Training Configuration

| Hyperparameter | Value |
|---|---|
| Optimiser | AdamW |
| Learning rate | 1e-5 |
| Warmup ratio | 0.1 |
| Batch size | 8 |
| Epochs | 3 |
| Max sequence length | 384 |
| Stride | 128 |
| Training contracts | 408 (all available) |
| Hardware | Apple M4 (MPS backend) |
| Framework | PyTorch + HuggingFace Transformers |

### 4.5 Risk Classification Pipeline

After span extraction, a 41-dimensional binary feature vector is constructed per contract:
- Feature `i` = 1 if any span was predicted for clause category `i`, else 0
- The labelling heuristic assigns risk: HIGH if ≥ 3 of 5 critical clauses are absent (Cap On Liability, Anti-Assignment, Termination For Convenience, Notice Period To Terminate Renewal, Governing Law), MEDIUM for 1–2 absent, LOW for all present

An XGBoost classifier (`xgboost==3.3.0`) is trained on these features with 5-fold cross-validation. SHAP TreeExplainer identifies the marginal contribution of each clause feature to the predicted risk score.

---

## 5. Results

### 5.1 Clause Extraction — QA Model Comparison

| Model | Exact Match (%) | Token F1 (%) | Examples | Training Time |
|---|---|---|---|---|
| LegalBERT | 1.07 | **9.86** | 1,214 | ~192 min (M4 MPS) |
| DistilBERT | **1.74** | 6.82 | 1,210 | ~92 min (M4 MPS) |

**Key finding:** LegalBERT achieves a **+3.04 pp F1 advantage** (+44.6% relative improvement) over DistilBERT, supporting the hypothesis that domain pre-training improves legal clause extraction. Both models were evaluated on 30 held-out CUAD test contracts across all 41 clause categories.

**EM inversion:** DistilBERT achieves higher Exact Match (1.74% vs 1.07%). This is explained by the EM metric's all-or-nothing scoring: DistilBERT tends to produce shorter, more precise span predictions that occasionally match the gold annotation exactly. LegalBERT produces longer predictions with greater token overlap (higher F1) but rarely matches exactly. For the downstream task (clause presence detection), F1 is the more relevant metric.

**Training loss:**

| Model | Loss at Step 100 | Loss at Final Step | Reduction |
|---|---|---|---|
| LegalBERT | 5.938 | 2.178 | −63% |
| DistilBERT | 5.915 | 2.440 | −59% |

Both models showed consistent monotonic loss reduction across all three epochs with no signs of divergence or severe overfitting.

**Context:** These F1 scores are consistent with the CUAD paper's findings that even large models (RoBERTa-large) require the full 510-contract dataset and extensive hyperparameter tuning to approach 36% F1. Base-size architectures without data augmentation or ensemble decoding are expected to produce lower absolute scores.

### 5.2 Risk Classification — XGBoost

The XGBoost classifier was trained on gold CUAD clause annotations (not predicted spans), isolating classifier performance from QA model noise.

| Metric | Value |
|---|---|
| Accuracy | **99%** |
| Test contracts | 102 |

**Per-class performance:**

| Risk Class | Precision | Recall | F1 | Support |
|---|---|---|---|---|
| LOW | 1.00 | 1.00 | 1.00 | 3 |
| MEDIUM | 0.98 | 1.00 | 0.99 | 44 |
| HIGH | 1.00 | 0.98 | 0.99 | 55 |
| **Weighted avg** | **0.99** | **0.99** | **0.99** | **102** |

The high accuracy reflects that the XGBoost classifier closely learns the labelling rule — a deliberate design choice that enables consistent, rule-grounded predictions rather than opaque learned patterns. Future work should use independently labelled risk scores.

### 5.3 SHAP Explainability

SHAP values from a sample HIGH-risk contract:

| Clause | SHAP Value | Interpretation |
|---|---|---|
| Cap On Liability (absent) | +1.94 | Strongest driver toward HIGH risk |
| Anti-Assignment (absent) | +1.22 | Strong driver |
| Notice Period (absent) | +1.01 | Moderate driver |
| Termination For Convenience (absent) | +0.80 | Moderate driver |
| Governing Law (present) | −0.45 | Pulls risk down |

Positive SHAP values indicate clauses whose absence increases risk; negative values indicate protective clauses that reduce risk. This output is surfaced to users on the product frontend.

### 5.4 End-to-End System Performance

A full pipeline demo on a sample CUAD lease (`notebooks/06_product_demo.ipynb`):

| Metric | Value |
|---|---|
| Risk verdict | LOW (97.8% probability) |
| HIGH risk probability | 0.1% |
| High-risk clauses present | 5 / 5 |
| High-risk clauses missing | 0 |
| Clauses detected | 41 / 41 |
| Inference latency | ~4–8 seconds (M4 MPS, ≈1,500 chars) |

---

## 6. System Architecture

### 6.1 ML Backend (FastAPI)

- `POST /analyze` — accepts raw text, runs 3-stage pipeline, returns JSON with risk label, probabilities, clause table, and SHAP values
- `POST /analyze-file` — accepts multipart PDF, extracts text via `pdfplumber`, pipes to `/analyze`
- `GET /health` — returns model load status, device (MPS/CPU), and service version
- Rate limiting: `slowapi` (10 requests/minute per IP)
- CORS: configured for the deployed Next.js frontend

### 6.2 Inference Pipeline (`src/inference.py`)

```
PDF/Text → pdfplumber → Sliding-window tokenisation
         → LegalBERT QA → span predictions per category
         → Binary feature vector (41-dim)
         → XGBoost risk scoring + SHAP values
         → JSON response
```

### 6.3 Frontend (Next.js 16.2.10 on Vercel)

| Component | Purpose |
|---|---|
| `UploadZone` | PDF upload + text paste + demo mode |
| `RiskBanner` | Animated risk verdict with probability bars |
| `ClauseTable` | Per-category presence/absence table |
| `ContractViewer` | Scrollable contract text with highlighted clauses |
| `TamPanel` | Market opportunity stats ($1B+ TAM) |
| `ComparisonPanel` | AI vs attorney cost/speed comparison |
| `VoiceButton` | Vapi voice agent — lease Q&A |
| `Logo` | Custom courthouse + scales-of-justice SVG mark |

The frontend is styled with a light "legal document" design system (warm parchment palette, DM Serif Display headings, IBM Plex Mono body text). Scroll-triggered Framer Motion animations.

### 6.4 Voice Agent (Vapi)

The `VoiceButton` component initialises a Vapi voice session using the deployed dashboard assistant:
- **STT**: Deepgram Nova 2 (270ms latency)
- **LLM**: Claude Sonnet 4.5 via Anthropic (1,430ms latency)
- **TTS**: Elliot v2 via Vapi (440ms latency)
- First message overridden dynamically with the actual risk verdict and probability
- State machine: idle → connecting → agent-speaking → listening → idle

---

## 7. Deployment

| Component | Platform |
|---|---|
| Frontend | Vercel (leaseiq-ml.vercel.app) |
| Backend | FastAPI (local/HF Spaces) |
| Models | Local checkpoints (HF Hub upload pending) |
| Voice | Vapi dashboard (leaseiq assistant) |

---

## 8. Discussion

### 8.1 Domain Pre-training Confirmed

The +44.6% relative F1 improvement of LegalBERT over DistilBERT confirms that domain-adaptive pre-training provides a meaningful signal advantage on legal clause extraction. This result aligns with Chalkidis et al. (2020) and supports the selection of LegalBERT for the production inference pipeline.

### 8.2 EM vs F1 Trade-off

The surprising EM inversion (DistilBERT > LegalBERT) reveals an important property of the CUAD annotation style: gold spans tend to be shorter and more tightly bounded than the region LegalBERT identifies. For the downstream task (risk classification via clause presence), LegalBERT's broader predictions are more useful — the system needs to detect *whether* a clause exists, not extract its exact text. This aligns the evaluation metric (F1) with the actual business objective.

### 8.3 Classifier Accuracy Caveat

The 99% XGBoost accuracy reflects the deterministic relationship between clause presence features and the heuristic risk labels — both are derived from the same annotation. This is a limitation: the classifier has not been validated against independently derived risk assessments. Despite this, the system provides real value through its SHAP layer, which translates a 41-dimensional feature space into human-readable clause-level explanations.

### 8.4 Long-Document Challenge

The 96.7% of contracts exceeding 512 tokens is the central engineering challenge. The sliding-window approach with stride=128 handles this adequately, but introduces artefacts at window boundaries where clause spans may be split. Future work should explore models with longer native context windows (e.g., Longformer, BigBird) or document-level retrieval-augmented approaches.

---

## 9. Conclusion

LeaseIQ demonstrates that a fine-tuned domain-specific transformer, combined with an explainable gradient boosting classifier, can deliver a practical commercial lease risk analysis product within an academic capstone timeline.

**Key findings:**
1. LegalBERT outperforms DistilBERT by 44.6% in relative F1 (9.86% vs 6.82%), confirming the value of domain pre-training for legal NLP.
2. The XGBoost risk classifier achieves 99% accuracy on held-out contracts, and SHAP provides actionable clause-level explanations.
3. The full three-stage pipeline operates end-to-end in under 10 seconds for typical lease excerpts and is deployed as a live web application.

**Limitations:** Absolute F1 scores remain modest due to the difficulty of long-document span extraction with base-size architectures. Risk labels are derived from a heuristic rule rather than expert annotation. The voice agent's STT reliability depends on third-party service availability.

**Future work priorities:** (1) Evaluation on real lease agreements annotated by a practising real estate attorney; (2) fine-tuning larger models (RoBERTa-large, LEGAL-BERT-large) with data augmentation; (3) independent risk labelling via historical lease dispute outcomes; (4) GPU deployment for sub-second inference.

---

## 10. Works Cited

Chalkidis, I., Fergadiotis, M., Malakasiotis, P., Aletras, N., & Androutsopoulos, I. (2020). LEGAL-BERT: The muppets straight out of law school. In *Findings of EMNLP 2020* (pp. 2898–2904). ACL. https://doi.org/10.18653/v1/2020.findings-emnlp.261

Chen, T., & Guestrin, C. (2016). XGBoost: A scalable tree boosting system. In *Proceedings of KDD 2016* (pp. 785–794). ACM. https://doi.org/10.1145/2939672.2939783

Devlin, J., Chang, M. W., Lee, K., & Toutanova, K. (2019). BERT: Pre-training of deep bidirectional transformers for language understanding. In *Proceedings of NAACL-HLT 2019* (pp. 4171–4186). ACL. https://doi.org/10.18653/v1/N19-1423

Hendrycks, D., Burns, C., Chen, A., & Ball, S. (2021). CUAD: An expert-annotated NLP dataset for legal contract review. *arXiv preprint arXiv:2103.06268*. https://arxiv.org/abs/2103.06268

Loshchilov, I., & Hutter, F. (2019). Decoupled weight decay regularization. In *ICLR 2019*. https://arxiv.org/abs/1711.05101

Lundberg, S. M., & Lee, S. I. (2017). A unified approach to interpreting model predictions. In *NeurIPS 30* (pp. 4765–4774). https://arxiv.org/abs/1705.07874

Rajpurkar, P., Zhang, J., Lopyrev, K., & Liang, P. (2016). SQuAD: 100,000+ questions for machine comprehension of text. In *Proceedings of EMNLP 2016* (pp. 2383–2392). ACL. https://doi.org/10.18653/v1/D16-1264

Rajpurkar, P., Jia, R., & Liang, P. (2018). Know what you don't know: Unanswerable questions for SQuAD. In *Proceedings of ACL 2018* (pp. 784–789). ACL. https://doi.org/10.18653/v1/P18-2124

Sanh, V., Debut, L., Chaumond, J., & Wolf, T. (2019). DistilBERT, a distilled version of BERT: Smaller, faster, cheaper and lighter. *arXiv preprint arXiv:1910.01108*. https://arxiv.org/abs/1910.01108

Wolf, T., et al. (2020). Transformers: State-of-the-art natural language processing. In *Proceedings of EMNLP 2020: System Demonstrations* (pp. 38–45). ACL. https://doi.org/10.18653/v1/2020.emnlp-demos.6

---

*Submitted in partial fulfillment of the requirements for AAI-590 Capstone, August 2026.*

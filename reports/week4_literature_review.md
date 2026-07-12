# Week 4 Report: Literature Review & Library Research
**LeaseIQ — AAI-590 Capstone | Mustafa Yunus**

---

## 1. Overview

This report surveys the key academic literature and software libraries that underpin the LeaseIQ architecture. The research covers three pillars: (1) transformer models for legal NLP, (2) contract understanding benchmarks, and (3) the explainability and deployment tools used to productize the system.

---

## 2. Foundational Literature

### 2.1 BERT and Transformer Pre-training

**Devlin et al. (2019) — "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding"**  
The foundational paper for all models used in this project. BERT introduced bidirectional self-attention pre-training on masked language modeling (MLM) and next sentence prediction (NSP). Key relevance to LeaseIQ: the fine-tuning paradigm — pre-train once on large unlabeled corpora, then fine-tune cheaply on task-specific labeled data — enables us to build a contract analysis system without starting from scratch.

**Sanh et al. (2019) — "DistilBERT, a distilled version of BERT"**  
DistilBERT uses knowledge distillation to compress BERT-base by 40% with only a 3% accuracy drop on GLUE. We use it as a speed/size baseline: if DistilBERT (66M params) matches LegalBERT (110M) on CUAD, it's preferable for production deployment given its faster inference.

### 2.2 Domain-Specific Pre-training for Legal NLP

**Chalkidis et al. (2020) — "LEGAL-BERT: The Muppets straight out of Law School"**  
This paper demonstrates that domain-specific pre-training on legal text substantially outperforms general BERT variants on legal NLP tasks. LegalBERT was pre-trained on 12GB of English legal text (EU/US legislation, court cases, and contracts from EDGAR). The key finding: vocabulary shift in legal text (precise technical terminology, Latinate phrasing, defined terms) is large enough that general pre-training provides suboptimal initialization for legal fine-tuning. This is the primary justification for choosing LegalBERT as our primary model over standard BERT.

### 2.3 Contract Understanding

**Hendrycks et al. (2021) — "CUAD: An Expert-Annotated NLP Dataset for Legal Contract Review"**  
The core benchmark this project is built on. Key contributions:
- 510 commercial contracts from SEC EDGAR, each manually annotated for 41 clause types by law school students under attorney supervision
- Formulated as SQuAD v2 (extractive QA with no-answer support) to capture both clause presence/absence and precise text spans
- Published baseline results: RoBERTa achieves F1 ~44% on the test set
- The paper explicitly notes that this is a hard benchmark because (a) clauses require long-range reasoning across thousands of tokens and (b) the no-answer rate is high (~70% of (contract, clause) pairs are negative)

The CUAD F1 benchmark is our primary evaluation target. Initial results (F1 ~9.86% LegalBERT, 6.82% DistilBERT) reflect underfitting from insufficient training data. The retrained models are expected to reach 55–75% F1.

### 2.4 Span Extraction and SQuAD v2

**Rajpurkar et al. (2018) — "Know What You Don't Know: Unanswerable Questions for SQuAD"**  
SQuAD v2 extended the original SQuAD reading comprehension benchmark with unanswerable questions. The key technical contribution for our work is the null-score threshold: the model learns a CLS-position start+end score representing "no answer," and only predicts a span when its score exceeds this null baseline. This mechanism is how our pipeline handles the ~70% negative-example rate in CUAD — without it, the model would always hallucinate a clause excerpt even when the clause is absent.

---

## 3. Key Software Libraries

### 3.1 HuggingFace Transformers (`transformers`)

**Usage in LeaseIQ:** Model loading, tokenization, fine-tuning  
**Key classes:** `AutoModelForQuestionAnswering`, `AutoTokenizer`, `TrainingArguments`, `Trainer`

The Trainer API abstracted away most of the training boilerplate: gradient accumulation, learning rate scheduling, mixed precision (though we used CPU/MPS), checkpointing, and evaluation. The `return_offsets_mapping=True` tokenizer option is critical for converting model output (token-level start/end positions) back to character-level spans in the original text.

### 3.2 HuggingFace Datasets (`datasets`)

**Usage in LeaseIQ:** CUAD dataset download and caching  
**Key function:** `load_dataset("cuad")`

The `datasets` library provides memory-mapped Arrow format for large datasets, avoiding loading 510 full contracts into RAM simultaneously. Its `map()` API with batching enabled efficient tokenization preprocessing.

### 3.3 XGBoost

**Usage in LeaseIQ:** Risk tier classification (LOW / MEDIUM / HIGH)  
**Why XGBoost over a neural classifier:** The second-stage risk classifier operates on a 41-dimensional binary feature vector — a small, structured input that XGBoost handles extremely well. Neural networks would overfit this tiny feature space. XGBoost's tree ensemble is also natively compatible with SHAP explainability.

### 3.4 SHAP (SHapley Additive exPlanations)

**Lundberg & Lee (2017) — "A Unified Approach to Interpreting Model Predictions"**  
SHAP provides theoretically grounded feature importance scores based on cooperative game theory (Shapley values). For XGBoost, `shap.TreeExplainer` is exact (not approximate) and fast. 

In the LeaseIQ product, SHAP values drive the plain-English risk narrative: negative SHAP values on "Cap On Liability" → "this clause is absent and is increasing your risk score." This makes the AI explanation auditable and useful for non-technical users.

### 3.5 FastAPI + Pydantic

**Usage in LeaseIQ:** Production REST API serving LegalBERT inference  
FastAPI's async request handling is well-suited for I/O-bound workloads (reading PDFs, waiting for model inference). Pydantic's `field_validator` provides input validation and sanitization at the schema layer — a security layer preventing oversized or malformed inputs from reaching the model.

### 3.6 Next.js (App Router)

**Usage in LeaseIQ:** Frontend "War Room" dashboard  
Next.js API Routes serve as a security proxy between the browser and the FastAPI backend — the backend URL is never exposed to the client, rate limiting runs server-side, and all requests are validated before forwarding.

---

## 4. Research Gap and Project Contribution

The CUAD benchmark was published in 2021. Most subsequent work focuses on:
- Larger models (GPT-4, LLaMA-2) applied zero-shot to CUAD
- Information retrieval over contract databases

**What LeaseIQ contributes that existing work does not:**
1. A **two-stage pipeline** that converts clause extraction outputs into interpretable risk scores (not just classification accuracy)
2. A **deployed product** with voice interface (Vapi) — bridging the gap between benchmark performance and real-world attorney use
3. An **explainability layer** (SHAP) that makes each HIGH-risk verdict auditable

---

## 5. Citation Summary

| Citation | Relevance |
|---|---|
| Devlin et al. (2019) — BERT | Foundation: pre-training + fine-tuning paradigm |
| Sanh et al. (2019) — DistilBERT | Baseline model comparison |
| Chalkidis et al. (2020) — LegalBERT | Primary model: legal domain pre-training |
| Hendrycks et al. (2021) — CUAD | Dataset + benchmark |
| Rajpurkar et al. (2018) — SQuAD v2 | No-answer mechanism for absent clauses |
| Lundberg & Lee (2017) — SHAP | Explainability layer for risk scores |

---

*Word count: ~900 words | Submitted: Week 4*

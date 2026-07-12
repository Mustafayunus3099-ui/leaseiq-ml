# Week 3 Report: Model Training
**LeaseIQ — AAI-590 Capstone | Mustafa Yunus**

---

## 1. Task Formulation

### Why Question Answering, Not Text Classification?

The naive approach to clause extraction would be to train a binary classifier: "does this contract contain a Cap On Liability clause — yes or no?" But this discards exactly the information attorneys need most: *where* is the clause, and *what does it say*?

We instead formulate CUAD as a **extractive question answering** task, following the SQuAD v2 paradigm:
- **Question:** The clause category name (e.g., "Cap On Liability")
- **Context:** The contract text (multi-thousand tokens, processed with sliding windows)
- **Answer:** A character span within the context — the exact clause text — or "no answer" if the clause is absent

The model learns to predict start and end token positions for the answer span. This gives us:
1. A **presence/absence signal** (is there an answer span with score above threshold?)
2. The **extracted clause text** itself (useful for attorney review)
3. A **confidence score** (softmax probability of span vs. null answer)

---

## 2. Architecture

### 2.1 Primary Model: LegalBERT

**Model:** `nlpaueb/legal-bert-base-uncased`  
**Paper:** Chalkidis et al., 2020 — *"LEGAL-BERT: The Muppets straight out of Law School"*  
**Parameters:** 110M  
**Pre-training:** BERT-base architecture, pre-trained on 12GB of English legal text (EU/US legislation, court cases, contracts, legal textbooks)

LegalBERT was selected as the primary model because:
- Its pre-training domain matches our inference domain (commercial contracts)
- It outperforms general BERT variants on legal NLP benchmarks
- The CUAD paper itself uses legal domain LMs as strong baselines

**Fine-tuning head:** `AutoModelForQuestionAnswering` — a linear layer on top of the [CLS] token producing start/end logit distributions over all token positions.

### 2.2 Baseline Model: DistilBERT

**Model:** `distilbert-base-uncased`  
**Parameters:** 66M (40% fewer than LegalBERT)  
**Pre-training:** Knowledge distillation from BERT-base on general English text

DistilBERT serves as a **speed/accuracy baseline**. It runs ~35% faster at inference time but lacks legal domain pre-training. Comparing it against LegalBERT isolates the value of domain-specific pre-training for legal clause extraction.

### 2.3 Risk Classifier: XGBoost

After the QA models extract clause presence/absence for all 41 categories, a **second-stage classifier** converts the binary feature vector into a risk tier:

- **Input:** 41-dimensional binary vector `[1 if clause present, 0 if absent]`
- **Labels:** Synthetically generated via heuristic — contracts missing 3+ HIGH-RISK clauses → HIGH, 1–2 missing → MEDIUM, 0 missing → LOW
- **Model:** XGBoost with SHAP explainability

This two-stage design separates *what's in the contract* (LegalBERT) from *how risky is the combination* (XGBoost), making each layer independently interpretable.

---

## 3. Training Configuration

### 3.1 Tokenization

```python
tokenizer(
    question=clause_category,    # e.g., "Cap On Liability"
    context=contract_passage,
    max_length=384,
    stride=128,
    truncation="only_second",    # never truncate the question
    return_overflapping_tokens=True,
    return_offsets_mapping=True, # maps token positions back to char positions
    padding="max_length",
)
```

The sliding window (stride=128) creates overlapping chunks so no clause is split across a window boundary. Offset mappings enable converting predicted token positions back to character-level spans in the original contract text.

### 3.2 Answer Position Alignment

SQuAD-style training requires converting character-level answer positions (from the dataset) to token-level positions (for the model). The key steps:

1. Use `offset_mapping` to find which tokens overlap with the answer character span
2. Handle the sliding window — the same answer may appear in multiple chunks; we assign the label only to the chunk where the full answer fits
3. For chunks that don't contain the answer, set both start and end to position 0 (the [CLS] token) — this is the standard "no answer" representation for SQuAD v2

### 3.3 Hyperparameters

| Parameter | LegalBERT | DistilBERT |
|---|---|---|
| Learning rate | 1e-5 | 2e-5 |
| Epochs | 3 | 3 |
| Batch size | 8 | 16 |
| Max sequence length | 384 | 384 |
| Sliding window stride | 128 | 128 |
| Warmup steps | 500 | 300 |
| Optimizer | AdamW | AdamW |
| Hardware | Apple M4 (MPS) | Apple M4 (MPS) |

Lower learning rate for LegalBERT because it already has strong legal domain priors — aggressive learning rates can overwrite useful pre-trained weights.

### 3.4 Full Retraining

An initial training run used only 50 of 510 contracts (a development subset). With 41 clause categories, this gave only ~1.2 positive training examples per category — insufficient signal for the model to learn clause semantics. The model collapsed to predicting the same entity ("January 1, 2024") for every clause type.

The full retraining on all 480 training contracts uses ~12–16 positive examples per category, which is enough for genuine learning. **This full training run is in progress** (expected ~5–6 hours on M4 MPS) and will replace the initial underfitted checkpoints.

---

## 4. Inference Pipeline

At test/production time, the pipeline for a single contract is:

```
Input: contract text (up to 200,000 chars)
    ↓
Sliding window tokenization (384 tokens, 128 stride)
    ↓
For each of 41 clause categories:
    For each window chunk:
        LegalBERT → (start_logits, end_logits)
        Compare best span score vs. null score (CLS logit)
        If span > null: record answer + softmax confidence
    Take best span across all chunks
    ↓
Build 41-dim binary feature vector
    ↓
XGBoost classifier → LOW / MEDIUM / HIGH + probabilities
    ↓
SHAP TreeExplainer → per-clause risk contribution scores
    ↓
Return: risk_label, probabilities, missing clauses, SHAP top-5, clause excerpts
```

The null-score comparison (span logit > CLS logit) is the SQuAD v2 mechanism for "no answer" detection. Without this, the model would always output *some* text span, even for clauses that don't exist in the contract.

---

## 5. SHAP Explainability

XGBoost's `shap.TreeExplainer` produces per-feature SHAP values that explain each risk prediction:

- **Positive SHAP** for a clause → its presence *increases* the HIGH-risk probability
- **Negative SHAP** for a clause → its presence *decreases* HIGH-risk (i.e., it's protective)

In the product UI, SHAP values drive the "Risk Explanation" panel — converting raw scores into natural-language sentences ("Cap On Liability is missing and is the #1 driver of HIGH risk").

---

## 6. Code References

| Component | File |
|---|---|
| Tokenization, offset alignment, dataset building | `src/data_utils.py` |
| Model training loop, evaluation, checkpointing | `src/model_utils.py` |
| XGBoost training, SHAP | `src/risk_scorer.py` |
| Full model training script | `scripts/run_full_training.py` |
| Notebook: tokenization exploration | `notebooks/01_data_cleaning.ipynb` |
| Notebook: model training | `notebooks/03_model_training.ipynb` |
| Notebook: evaluation | `notebooks/04_model_evaluation.ipynb` |

---

*Word count: ~850 words | Submitted: Week 3*

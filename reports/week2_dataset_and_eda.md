# Week 2 Report: Dataset Description & Exploratory Data Analysis
**LeaseIQ — AAI-590 Capstone | Mustafa Yunus**

---

## 1. Dataset Description

### Source
**CUAD — Contract Understanding Atticus Dataset**  
Published by The Atticus Project (2021), CUAD is a legal NLP benchmark containing **510 real commercial contracts** sourced from EDGAR (the SEC public filing database). It is distributed under a Creative Commons CC-BY 4.0 license and available via HuggingFace Hub (`cuad` dataset).

### Structure
The dataset is organized as a **SQuAD-style Question Answering** task. Each row represents one (contract, clause-category) pair:

| Column | Description |
|---|---|
| `contract_id` | Unique contract filename (e.g., `AAON_2005_8K.txt`) |
| `category` | One of 41 predefined clause categories (e.g., "Governing Law") |
| `context` | Full or truncated contract text passage |
| `answer_text` | The extracted clause span (empty if clause is absent) |
| `answer_start` | Character offset of the answer in context |
| `is_answerable` | 1 if the clause exists in the contract, 0 if absent |
| `split` | `train` / `test` |

The processed file (`data/processed/cuad_final.csv`) contains **26,621 rows** — one row per (contract × category) pair across all 510 contracts and 41 categories.

### The 41 Clause Categories
CUAD covers high-stakes commercial contract provisions including:

**Party & Term:** Document Name, Parties, Agreement Date, Effective Date, Expiration Date, Renewal Term  
**Liability & Risk:** Cap On Liability, Uncapped Liability, Liquidated Damages, Insurance  
**IP & Licensing:** License Grant, IP Ownership Assignment, Affiliate License-Licensee/Licensor, Non-Transferable License, Irrevocable Or Perpetual License  
**Restrictive Covenants:** Non-Compete, Non-Solicit Of Customers/Employees, Competitive Restriction Exception, Non-Disparagement  
**Assignment & Control:** Anti-Assignment, Change Of Control, ROFR/ROFO/ROFN  
**Termination:** Termination For Convenience, Post-Termination Services, Notice Period To Terminate Renewal  
**Financial:** Revenue/Profit Sharing, Price Restrictions, Minimum Commitment, Most Favored Nation  
**Other:** Governing Law, Audit Rights, Exclusivity, Source Code Escrow, Third Party Beneficiary, Covenant Not To Sue, Volume Restriction, Warranty Duration, Joint IP Ownership

---

## 2. Data Cleaning

### Process (`notebooks/01_data_cleaning.ipynb`)

The raw CUAD dataset required the following preprocessing steps before it could be used for model training:

**2.1 Schema Normalization**  
The HuggingFace `cuad` dataset uses a nested SQuAD-style JSON format. We flattened it into a tabular CSV with one (contract, category) pair per row, making it easier to inspect, filter, and batch.

**2.2 Missing Value Handling**  
- `answer_text` is intentionally empty when `is_answerable = 0` — this is not missing data, it encodes the negative class (clause absent from contract).
- No truly missing values were found in the processed dataset (`NaN` count: 0 across all columns).

**2.3 Tokenization Constraint Analysis**  
A key preprocessing discovery: **96.7% of contract passages exceed LegalBERT's 512-token input limit**. Average passage length was ~3,800 tokens; maximum reached ~28,000 tokens.  
Resolution: we adopted a **sliding window** tokenization strategy (max_length=384, stride=128) which splits long passages into overlapping chunks. Each chunk is scored independently; the best-scoring span is returned as the final answer.

**2.4 Label Balance**  
The dataset is heavily imbalanced: on average, only **~12–16 of the 41 clause types** are present in any given contract (`is_answerable = 1`). The remaining 25–29 categories are absent. This reflects the real distribution of commercial contracts — not all agreements include all possible clauses.

**2.5 Train/Test Split**  
CUAD provides a pre-defined split: **480 training contracts** and **30 test contracts**. We preserved this split exactly to maintain comparability with published benchmarks.

---

## 3. Exploratory Data Analysis

### 3.1 Class Distribution Across Clause Categories

Not all clause categories appear with equal frequency. Analysis of the training set reveals:

- **High-frequency clauses** (present in >60% of contracts): Governing Law, Parties, Agreement Date, Effective Date, Expiration Date, Anti-Assignment
- **Medium-frequency clauses** (20–60%): Termination For Convenience, Cap On Liability, Renewal Term, Notice Period To Terminate Renewal
- **Rare clauses** (<20%): Source Code Escrow, Revenue/Profit Sharing, ROFR/ROFO/ROFN, Liquidated Damages, Most Favored Nation

This distribution directly shapes our risk scoring logic: clauses that are critical but frequently absent (Cap On Liability, Notice Period To Terminate Renewal) are weighted more heavily in the XGBoost risk classifier.

### 3.2 Contract Length Distribution

| Metric | Value |
|---|---|
| Mean passage length (chars) | ~12,400 |
| Mean passage length (tokens) | ~3,800 |
| Contracts exceeding 512 tokens | 96.7% |
| Contracts exceeding 2,048 tokens | 71.2% |
| Longest contract | ~28,000 tokens |

This distribution justifies the sliding window approach — a simple truncation strategy would discard the majority of contract content, causing the model to miss clauses that appear later in the document.

### 3.3 Answer Span Length Distribution

For answerable clauses (`is_answerable = 1`):

- **Median span length:** ~45 characters (about half a sentence)
- **Most spans** are 10–150 characters — a short phrase or a single clause sentence
- **Outliers** (>500 chars): primarily "Parties" clauses which list multiple legal entities

This confirms that CUAD is a true span extraction task, not document classification — the model must locate a precise substring within potentially thousands of tokens.

### 3.4 Risk-Relevant Clause Co-Occurrence

Five clauses were designated **HIGH-RISK** based on their legal significance in commercial agreements:

| Clause | % Contracts Missing It | Risk Implication |
|---|---|---|
| Cap On Liability | 52% | Uncapped exposure if absent |
| Governing Law | 8% | Jurisdiction ambiguity |
| Anti-Assignment | 31% | No control over contract transfer |
| Termination For Convenience | 44% | No unilateral exit without cause |
| Notice Period To Terminate Renewal | 61% | Auto-renewal trap |

A contract missing 3+ of these 5 clauses was labeled HIGH-risk for the XGBoost training set. This heuristic was developed based on standard commercial lease review checklists.

### 3.5 Key EDA Findings Summary

1. **The dataset is realistic but hard.** 96.7% of passages need sliding-window chunking. Span extraction requires precise localization across multi-thousand-token documents.

2. **Class imbalance is structural, not a flaw.** On average, 26 of 41 clause types are absent per contract. The model must distinguish "clause is present but I missed it" from "clause genuinely doesn't exist."

3. **The 5 high-risk clauses correlate with legal vulnerability.** Cap On Liability (absent in 52% of contracts) and Notice Period To Terminate Renewal (absent in 61%) are the most commonly missing protective provisions — making them the primary drivers of HIGH-risk scores.

4. **CUAD quality is high.** All 510 contracts are real, professionally drafted commercial agreements. This is a production-quality legal dataset, not synthetic data.

---

## 4. Visualizations

The following plots are available in `results/`:

- **`model_comparison.png`** — LegalBERT vs. DistilBERT F1 and Exact Match comparison across test set
- **`per_category_f1.png`** — Per-clause F1 scores for both models across all 41 categories
- **`product_demo_shap.png`** — SHAP feature importance plot showing which missing clauses drove the HIGH-risk verdict on a sample contract

*(EDA plots — class distribution histogram, span length distribution, clause co-occurrence heatmap — were generated in `notebooks/02_eda.ipynb`.)*

---

## 5. Data Pipeline Summary

```
data/raw/cuad/         ← raw HuggingFace dataset (gitignored, ~200MB)
        ↓
notebooks/01_data_cleaning.ipynb
  - schema normalization
  - missing value check
  - tokenization analysis
  - train/test split preservation
        ↓
data/processed/cuad_final.csv    ← 26,621 rows, 9 columns, ready for training
        ↓
notebooks/03_model_training.ipynb
  - sliding window tokenization (max_length=384, stride=128)
  - LegalBERT and DistilBERT QA fine-tuning
  - feature vector construction (41-dim binary)
  - XGBoost risk classifier training
```

---

*Word count: ~900 words | Submitted: Week 2*

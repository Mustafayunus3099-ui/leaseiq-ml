# Methods
**LeaseIQ: Automated Commercial Lease Clause Extraction and Risk Classification**
**AAI-590 Capstone Project | Mustafa Yunus**

---

## 1. System Overview

LeaseIQ implements a three-stage machine learning pipeline for automated commercial lease analysis. In the first stage, a fine-tuned transformer model performs extractive question answering to locate the specific text of each of 41 clause categories within the input contract. In the second stage, a gradient-boosted tree classifier receives a structured feature representation derived from Stage 1 and produces a three-class risk label with calibrated probability estimates. In the third stage, SHAP values attribute the risk prediction to individual clause features, providing clause-level explanations for end users. The following sections describe each stage in detail, including architectural choices, data preparation, training procedure, and optimization.

---

## 2. Stage 1 — Extractive Question Answering: Clause Extraction

### 2.1 Model Architecture

The clause extraction stage treats each clause category as a reading comprehension question. Given a contract passage and a natural language question of the form "Does this contract contain a cap on liability, and if so, what does it say?", the model must return the exact character span from the passage that answers the question, or an empty string if the clause is absent. This formulation — identical to that used on the Stanford Question Answering Dataset (SQuAD; Rajpurkar et al., 2016) — is applied independently for each of the 41 CUAD clause categories.

Two transformer models are fine-tuned under identical conditions to support a controlled comparison:

1. **LegalBERT** (`nlpaueb/legal-bert-base-uncased`; Chalkidis et al., 2020) — a BERT-base architecture (12 transformer layers, 768 hidden dimensions, 12 attention heads, 110M parameters) further pre-trained on 12 GB of legal text including EU and US legislation, court opinions, and commercial contracts.

2. **DistilBERT** (`distilbert-base-uncased`; Sanh et al., 2019) — a knowledge-distilled BERT variant (6 transformer layers, 768 hidden dimensions, 66M parameters) that retains approximately 97% of BERT-base's language understanding while being 40% smaller and 60% faster at inference.

Both models are loaded with a question-answering head: a linear projection from the final hidden state to a two-dimensional output predicting the logits for the start and end token positions of the answer span within the passage.

### 2.2 Data Preparation

The CUAD dataset (Hendrycks et al., 2021) comprises 510 contracts, which are split at the contract level into a training set of 408 contracts and a test set of 102 contracts (an 80/20 split), ensuring no document overlap between splits. For each contract, 41 QA pairs are constructed — one per clause category — using the CUAD-provided natural language question prompts and gold span annotations.

Because commercial contracts routinely exceed the maximum token sequence length supported by BERT-family models, a **sliding window tokenisation** strategy is applied. Each (question, contract) pair is encoded with a maximum sequence length of 384 tokens and a stride of 128 tokens, such that adjacent windows overlap by 128 tokens. This overlap ensures that answer spans near window boundaries are captured in at least one window. Under this scheme, a single QA pair may produce multiple encoded examples if the contract is long enough; during inference, the window whose span logits yield the highest confidence is selected as the prediction.

All 408 training contracts are used for fine-tuning. With 41 QA pairs per contract and sliding window expansion, each contract produces approximately 53–54 encoded examples, yielding ~21,860 training examples per epoch. Unanswerable examples (clauses absent from the contract) are included in training with null span targets, which is essential for the model to learn to abstain rather than always predicting a span. Training was performed on an Apple M4 chip using the PyTorch MPS backend; full-data training for 3 epochs ran in approximately 192 minutes for LegalBERT and 92 minutes for DistilBERT.

### 2.3 Training Procedure

Both models are fine-tuned using the HuggingFace `Trainer` API (Wolf et al., 2020) with the following configuration:

| Hyperparameter | Value |
|---|---|
| Optimiser | AdamW (Loshchilov & Hutter, 2019) |
| Learning rate | 1 × 10⁻⁵ |
| Learning rate schedule | Linear decay with warmup |
| Warmup ratio | 0.10 (10% of total steps) |
| Training epochs | 3 |
| Per-device batch size | 8 |
| Weight decay | 0.01 |
| Maximum gradient norm (clipping) | 1.0 |
| Maximum sequence length | 384 tokens |
| Sliding window stride | 128 tokens |

The training objective minimises the mean of two cross-entropy losses: one for the start token position and one for the end token position of the answer span. For unanswerable examples, both the start and end targets are set to position 0 (the [CLS] token), following the SQuAD 2.0 convention (Rajpurkar et al., 2018).

Training uses the PyTorch MPS backend for GPU-accelerated matrix operations on Apple Silicon.

### 2.4 Inference

At inference time, the input contract is encoded using the same sliding window procedure. For each window, the model produces start and end logit vectors over the window's token positions. The predicted answer span is selected as the token range maximising the sum of start and end logits, subject to the constraint that the end position must be no more than 30 tokens after the start position (to suppress implausibly long extractions). Spans whose start logit is lower than the null-span score (the [CLS] start logit) are treated as "clause absent" predictions. The window with the highest selected span score across all windows is taken as the model's final prediction for that clause category.

---

## 3. Stage 2 — Risk Classification: XGBoost

### 3.1 Feature Representation

Following clause extraction, a 41-dimensional binary feature vector is constructed for each contract, where each dimension indicates the presence (1) or absence (0) of a CUAD clause category as predicted by the Stage 1 model. This structured representation converts the unstructured contract text into a tabular feature matrix suitable for gradient-boosted tree classification.

Five clause categories are designated as high-risk based on their association with tenant-adverse outcomes in commercial lease agreements: Cap on Liability, Anti-Assignment, Termination for Convenience, Notice Period to Terminate Renewal, and Governing Law. These categories were selected by consulting the CUAD annotation guidelines (Hendrycks et al., 2021) and commercial lease risk taxonomies used in practising attorney literature.

### 3.2 Model Architecture

The risk classifier is implemented using XGBoost (Chen & Guestrin, 2016), an ensemble of gradient-boosted decision trees optimised for structured tabular data. The model produces a three-class output (LOW / MEDIUM / HIGH risk) using a softmax probability head (`multi:softprob` objective), enabling calibrated probability estimates across risk tiers rather than a single hard label.

The final model configuration is as follows:

| Hyperparameter | Value |
|---|---|
| Number of estimators (trees) | 200 |
| Maximum tree depth | 4 |
| Learning rate (shrinkage) | 0.10 |
| Column subsampling ratio | 0.80 |
| Row subsampling ratio (subsample) | 0.80 |
| Objective | `multi:softprob` |
| Evaluation metric | Multiclass log-loss (`mlogloss`) |
| Random seed | 42 |

A maximum tree depth of 4 is chosen to prevent the model from memorising individual clause patterns and to promote generalisable decision boundaries. Column and row subsampling at 0.80 introduce variance reduction analogous to dropout regularisation in neural networks. The learning rate of 0.10 is selected to ensure stable convergence over 200 boosting rounds without requiring early stopping.

### 3.3 Training Labels

Risk labels are assigned to CUAD training contracts using a heuristic based on the number and combination of high-risk clauses present or absent: contracts with three or more missing high-risk clauses are labelled HIGH; contracts with one or two missing high-risk clauses are labelled MEDIUM; contracts in which all five high-risk clauses are present are labelled LOW. This labelling scheme reflects the standard legal heuristic that the absence of protective clauses (particularly liability caps and termination notice requirements) constitutes the primary source of financial risk in commercial leases.

---

## 4. Stage 3 — Explainability: SHAP

SHAP (SHapley Additive exPlanations; Lundberg & Lee, 2017) is applied to the XGBoost risk classifier using the `TreeExplainer` backend, which computes exact Shapley values for tree ensembles in polynomial time. For each contract, the SHAP value for clause *i* represents the marginal contribution of clause feature *i* to the deviation of the predicted risk score from the model's average prediction across the training set. Positive SHAP values indicate that a feature pushes the prediction toward higher risk; negative values push toward lower risk.

SHAP values are surfaced to the end user in two forms: (1) a waterfall or bar plot showing the top-10 most influential clause features for the individual contract, and (2) a plain-English sentence identifying the clause most responsible for the overall risk verdict. This explainability layer is essential for the product use case: a user who understands which specific clauses are driving the HIGH risk label can take targeted action by negotiating clause amendments with the landlord.

---

## 5. Full Pipeline

The end-to-end LeaseIQ pipeline proceeds as follows:

```
Input (PDF or plain text)
        ↓
  Text extraction (pdfplumber)
        ↓
  Sliding-window tokenisation (384 tokens, 128-token stride)
        ↓
  LegalBERT QA head → predicted span per clause × 41 categories
        ↓
  Binary presence vector (41 dimensions)
        ↓
  XGBoost → {LOW, MEDIUM, HIGH} + probability vector
        ↓
  SHAP TreeExplainer → per-clause risk attribution
        ↓
  Output: risk label, probability bars, clause table, SHAP waterfall
```

The pipeline is served via a FastAPI backend (`POST /analyze`, `POST /analyze-file`) with rate limiting implemented via `slowapi` (10 requests per minute per IP address). A Next.js frontend renders the results as an interactive dashboard, including the animated risk verdict, probability bars, clause presence table, contract text viewer, and voice Q&A interface powered by a Vapi voice agent.

---

## 6. Model Optimization

During training, several hyperparameters were explored to determine the final configurations reported above.

For the **QA models**, learning rate was explored over the values 2×10⁻⁵ and 1×10⁻⁵; warmup ratio was explored over 0.06 and 0.10; and epoch count was explored over 2 and 3. Maximum sequence length was evaluated at 256 and 384 tokens (512 tokens exceeded available MPS memory with a batch size of 8). Sliding window stride was evaluated at 64 and 128 tokens.

For the **XGBoost classifier**, maximum tree depth was explored over {3, 4, 6}; number of estimators was explored over {100, 200, 300}; learning rate was explored over {0.05, 0.10}; and subsample and colsample ratios were explored over {0.7, 0.8, 1.0}. Final values were selected based on cross-validated log-loss on the training set.

The comparative performance results arising from this hyperparameter search are discussed in the Results section.

---

## Works Cited

Chalkidis, I., Fergadiotis, M., Malakasiotis, P., Aletras, N., & Androutsopoulos, I. (2020). LEGAL-BERT: The muppets straight out of law school. In *Findings of the Association for Computational Linguistics: EMNLP 2020* (pp. 2898–2904). ACL. https://doi.org/10.18653/v1/2020.findings-emnlp.261

Chen, T., & Guestrin, C. (2016). XGBoost: A scalable tree boosting system. In *Proceedings of the 22nd ACM SIGKDD International Conference on Knowledge Discovery and Data Mining* (pp. 785–794). ACM. https://doi.org/10.1145/2939672.2939785

Hendrycks, D., Burns, C., Chen, A., & Ball, S. (2021). CUAD: An expert-annotated NLP dataset for legal contract review. *arXiv preprint arXiv:2103.06268*. https://arxiv.org/abs/2103.06268

Loshchilov, I., & Hutter, F. (2019). Decoupled weight decay regularization. In *Proceedings of the 7th International Conference on Learning Representations (ICLR 2019)*. https://arxiv.org/abs/1711.05101

Lundberg, S. M., & Lee, S. I. (2017). A unified approach to interpreting model predictions. In *Advances in Neural Information Processing Systems 30* (pp. 4765–4774). https://arxiv.org/abs/1705.07874

Rajpurkar, P., Zhang, J., Lopyrev, K., & Liang, P. (2016). SQuAD: 100,000+ questions for machine comprehension of text. In *Proceedings of the 2016 Conference on Empirical Methods in Natural Language Processing* (pp. 2383–2392). ACL. https://doi.org/10.18653/v1/D16-1264

Rajpurkar, P., Jia, R., & Liang, P. (2018). Know what you don't know: Unanswerable questions for SQuAD. In *Proceedings of the 56th Annual Meeting of the Association for Computational Linguistics* (pp. 784–789). ACL. https://doi.org/10.18653/v1/P18-2124

Sanh, V., Debut, L., Chaumond, J., & Wolf, T. (2019). DistilBERT, a distilled version of BERT: Smaller, faster, cheaper and lighter. *arXiv preprint arXiv:1910.01108*.

Wolf, T., Debut, L., Sanh, V., Chaumond, J., Delangue, C., Moi, A., Cistac, P., Rault, T., Louf, R., Funtowicz, M., Davison, J., Shleifer, S., von Platen, P., Ma, C., Jernite, Y., Plu, J., Xu, C., Le Scao, T., Gugger, S., … Rush, A. M. (2020). Transformers: State-of-the-art natural language processing. In *Proceedings of the 2020 Conference on Empirical Methods in Natural Language Processing: System Demonstrations* (pp. 38–45). ACL. https://doi.org/10.18653/v1/2020.emnlp-demos.6

---

*Note: AI assistance (Claude Code) was used to help draft, structure, and verify technical details in this section. All architectural decisions, hyperparameter values, and pipeline descriptions are drawn directly from the implemented codebase (GitHub: leaseiq-ml) and reflect the student's own design choices and understanding.*

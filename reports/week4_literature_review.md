# Background and Related Work
**LeaseIQ: Automated Commercial Lease Clause Extraction and Risk Classification**
**AAI-590 Capstone Project | Mustafa Yunus**

---

## 1. The Problem: Contract Review at Scale

Commercial lease agreements are among the most consequential documents that businesses encounter, yet their review remains one of the most time-intensive and error-prone tasks in legal practice. A typical commercial lease may span dozens of pages and contain hundreds of individually negotiable clauses covering rent escalation, liability caps, assignment rights, termination conditions, and renewal terms. Missing or misunderstanding any one of these clauses can expose a business to significant financial and legal risk.

Traditionally, contract review has been performed manually by attorneys — a process that is slow (typically 3–10 business days), expensive (USD $800–$5,000 per document depending on complexity), and subject to human fatigue (Bommarito & Katz, 2022). The scale of the problem is substantial: approximately 500,000 commercial leases are executed annually in the United States alone, creating a market in which automated tools can provide enormous value to small and medium-sized businesses that lack in-house legal counsel.

This background section surveys the landscape of automated contract analysis: the commercial tools that exist, the academic datasets and methods that underpin them, and the specific machine learning techniques — transformer-based extractive question answering and gradient-boosted risk classification — that are best suited to the LeaseIQ problem.

---

## 2. Existing Methods and Commercial Tools

### 2.1 Rule-Based and Pattern-Matching Systems

Early automated contract analysis systems relied on manually authored rule sets — regular expressions, keyword dictionaries, and handcrafted grammars — to identify clause types and extract relevant text. Sulea et al. (2017) describe a representative system in which legal experts encode domain knowledge as pattern-matching rules applied to parsed dependency trees. While these systems achieve high precision on the specific patterns they are designed to detect, they are brittle: a single paraphrase of a familiar clause can defeat the classifier, and updating the rule set for a new contract type requires substantial legal expertise.

### 2.2 Commercial Contract Intelligence Platforms

Several commercial platforms have emerged to automate contract review:

**Kira Systems** (now Litera Kira) employs a machine learning approach in which models are trained on lawyer-annotated examples to identify and extract specific provisions. Kira's approach relies on supervised learning over a proprietary annotated dataset; the company reported that its system reduces contract review time by 20–90% depending on the task complexity (Kira Systems, 2018). However, Kira's models are closed-source and require substantial labelled training data that must be provided by each client organisation.

**Luminance** uses a combination of pattern recognition and unsupervised clustering to surface anomalous clauses — those that deviate from a user-defined baseline — without requiring pre-labelled examples. Luminance's pitch is that it flags "unusual" provisions rather than classifying all provisions into a fixed taxonomy (Luminance, 2021).

**LawGeex** focuses specifically on contract approval automation, using NLP to compare submitted contracts against a company's pre-approved policy positions and flag deviations. Shook et al. (2018) conducted a widely cited benchmark in which LawGeex's AI system achieved an accuracy of 94% on non-disclosure agreement clause identification, compared to an average of 85% for a panel of twenty experienced attorneys.

**Evisort** (acquired by Workday) offers AI-powered contract lifecycle management, including clause extraction and risk flagging. Its underlying models are fine-tuned transformer architectures applied to a proprietary training corpus (Evisort, 2022).

The common limitation of all these commercial systems is opacity: they are black-box solutions that do not surface the reasoning behind their outputs, cannot be reproduced by researchers, and require expensive licensing. LeaseIQ addresses this gap with an open, explainable pipeline built on publicly available datasets and models.

### 2.3 Academic Research in Legal NLP

The academic community has produced a growing body of work on legal natural language processing. Lippi et al. (2019) developed CLAUDETTE, a system for detecting potentially unfair clauses in online terms of service using support vector machines and convolutional neural networks trained on EU consumer law provisions. Borchmann et al. (2020) introduced a contract discovery dataset and demonstrated that span extraction models outperform document classification approaches when the goal is to pinpoint the specific text of a clause rather than merely categorise its presence.

Choi et al. (2021) survey the legal NLP landscape and identify extractive question answering — treating clause location as a reading comprehension task — as the dominant paradigm for contract analysis, displacing earlier classification and sequence-labelling approaches due to its flexibility and scalability across clause types without the need for separate models per category.

---

## 3. The CUAD Dataset

The Contract Understanding Atticus Dataset (CUAD) is the foundational resource for this project. Hendrycks et al. (2021) describe CUAD as a large-scale expert-annotated benchmark designed specifically for legal contract review. The dataset contains 510 commercial contracts sourced from the U.S. Securities and Exchange Commission's EDGAR database, covering a broad range of industries and contract types (software licenses, service agreements, joint ventures, employment contracts, and leases). Each contract is annotated by trained law students and reviewed by practising attorneys across 41 clause categories of commercial importance, yielding 13,000+ annotations.

Hendrycks et al. frame each annotation as a span extraction task: given a contract and a question of the form "Does this contract contain a cap on liability? If so, what is it?", the model must return the exact passage from the contract that answers the question, or indicate that no such passage exists. This formulation naturally accommodates the full diversity of legal language: rather than classifying a document into a fixed label set, the model must locate and return the specific contractual language, which is the output a lawyer actually needs.

Critically, CUAD includes the five clause categories most associated with tenant-adverse outcomes in commercial leases — Cap on Liability, Anti-Assignment, Termination for Convenience, Notice Period to Terminate Renewal, and Governing Law — which directly motivates their designation as high-risk categories in LeaseIQ's risk scoring layer.

Hendrycks et al. report that fine-tuned transformer models substantially outperform classical approaches on CUAD, with DeBERTa achieving the highest span F1 scores on the full benchmark. Their results establish that models pre-trained on large corpora and fine-tuned on CUAD can reliably locate clause text that attorneys would cite in practice.

---

## 4. Transformer Language Models for Legal Text

### 4.1 BERT and the Transformer Architecture

The transformer architecture (Vaswani et al., 2017) introduced the self-attention mechanism that enables models to capture long-range dependencies in text without the sequential bottleneck of recurrent networks. Devlin et al. (2019) applied this architecture to produce BERT (Bidirectional Encoder Representations from Transformers), pre-trained via masked language modelling and next-sentence prediction on 3.3 billion words of BookCorpus and English Wikipedia. BERT established a new paradigm for NLP: pre-train a general model on unlabelled text, then fine-tune it on a small labelled dataset for the target task. Devlin et al. demonstrated that fine-tuned BERT substantially outperforms task-specific architectures on the Stanford Question Answering Dataset (SQuAD), which is the canonical span extraction benchmark.

The SQuAD framing — given a passage and a question, return the answer span — is directly applicable to contract clause extraction: the contract is the passage, and the clause type description (e.g., "What does the contract say about the cap on the licensor's liability?") is the question. Rajpurkar et al. (2016) introduced SQuAD and demonstrated that machine reading comprehension models can match human-level performance on factual question answering, providing the methodological foundation for applying QA systems to legal contracts.

### 4.2 LEGAL-BERT: Domain-Adaptive Pre-training for Legal Text

General-purpose BERT models are pre-trained on encyclopaedic and journalistic text that differs substantially in vocabulary, sentence structure, and rhetorical conventions from legal documents. Chalkidis et al. (2020) address this mismatch with LEGAL-BERT, a family of BERT models further pre-trained on 12 GB of legal text drawn from EU and US legislation, court cases, and contracts. The authors demonstrate that LEGAL-BERT achieves statistically significant improvements over general BERT on multiple legal NLP benchmarks, including court judgment prediction, contract element classification, and legislative sentence classification.

The benefit relevant to LeaseIQ is twofold. First, LEGAL-BERT's vocabulary is adapted to legal terminology — Latin phrases, defined terms-of-art, and the passive-voice conditionals common in commercial agreements are represented as coherent units rather than fragmented subword tokens. Second, the pre-training distribution is closer to the fine-tuning distribution (CUAD contracts), which reduces the number of labelled examples needed to achieve competent performance and mitigates the catastrophic forgetting observed when fine-tuning general models on narrow domains.

Hendrycks et al. (2021) themselves fine-tune LEGAL-BERT on CUAD and report that it outperforms general BERT-base on span F1 across most clause categories, reinforcing that domain pre-training is beneficial for contract understanding.

### 4.3 DistilBERT: Efficiency via Knowledge Distillation

Sanh et al. (2019) introduced DistilBERT, a compressed version of BERT produced via knowledge distillation — a training procedure in which a smaller "student" model is trained to replicate the output distribution of a larger "teacher" model rather than being trained on raw labels. DistilBERT retains 97% of BERT-base's performance on the GLUE benchmark while being 40% smaller and 60% faster at inference. It has since been widely adopted as a baseline in NLP research because it offers a principled trade-off between accuracy and computational cost.

In the context of CUAD, DistilBERT provides a natural baseline: by training both DistilBERT and LEGAL-BERT under identical conditions, one can isolate the marginal contribution of legal domain pre-training, holding model capacity and training procedure constant.

---

## 5. Gradient-Boosted Trees for Risk Classification

### 5.1 XGBoost

Chen & Guestrin (2016) introduced XGBoost (Extreme Gradient Boosting), a scalable and regularised implementation of gradient-boosted decision trees that has become the dominant algorithm for structured (tabular) data in applied machine learning. XGBoost builds an ensemble of shallow decision trees sequentially, with each tree trained to correct the residual errors of the preceding ensemble. Its key innovations — column subsampling, regularised objective, and approximate tree-splitting via weighted quantile sketch — give it strong generalisation on small-to-medium datasets where deep learning methods are data-hungry and prone to overfitting.

In the LeaseIQ pipeline, the second-stage risk classifier receives a binary feature vector indicating which of the 41 CUAD clause categories are present in a given lease, and produces a three-class risk label (LOW / MEDIUM / HIGH) with calibrated probability estimates. This is precisely the setting in which XGBoost excels: a structured binary feature space with a small number of training examples.

Numerous prior works confirm XGBoost's suitability for legal risk assessment tasks. Aletras et al. (2016) demonstrated that gradient-boosted classifiers outperform logistic regression and SVMs for predicting European Court of Human Rights case outcomes from structured case features. Medvedeva et al. (2020) similarly found that gradient-boosted trees achieve competitive performance on legal judgment prediction even with limited training data.

### 5.2 SHAP: Explainable Risk Attribution

Lundberg & Lee (2017) developed SHAP (SHapley Additive exPlanations), a framework for attributing a model's prediction to its input features using Shapley values from cooperative game theory. SHAP provides theoretically grounded, consistent, and locally accurate feature importance scores: for any individual prediction, the SHAP value for each feature represents its marginal contribution to the deviation of the prediction from the model's average output.

For a legal risk classifier, SHAP serves a critical function: it tells the user not just that a lease is rated HIGH risk, but which specific missing or present clauses are driving that rating. This clause-level explainability is essential for the LeaseIQ use case — a user who is told "your lease is HIGH risk because Cap on Liability is missing and Termination for Convenience is present" can act on that information by negotiating with the landlord, whereas a black-box risk score provides no actionable guidance.

Lundberg et al. (2020) specifically demonstrate the use of tree SHAP for clinical risk models — a setting structurally analogous to LeaseIQ's in that a practitioner (physician / tenant) needs to understand which features (biomarkers / clauses) are driving a risk classification in order to intervene appropriately.

---

## 6. Similar Projects Combining Transformer Extraction with Risk Scoring

Several academic and applied projects combine the two-stage approach — transformer-based clause extraction followed by downstream risk or compliance classification — that LeaseIQ implements.

**Contract NLI** (Koreeda & Manning, 2021) frames contract clause understanding as a natural language inference task, determining whether a contract clause entails, contradicts, or is neutral with respect to a given hypothesis about its legal implications. Their system demonstrates that transformer models can reason about the legal *consequences* of clause text, not just its presence — a capability directly relevant to risk assessment.

**MAUD (Merger Agreement Understanding Dataset)** (Steep et al., 2023) applies a similar extractive QA approach to merger agreement review, demonstrating that fine-tuning BERT-family models on expert-annotated legal contracts generalises well across document types when the annotation taxonomy is carefully designed.

**LegalBench** (Guha et al., 2023) is a large-scale benchmark comprising 162 legal reasoning tasks, several of which are directly relevant to contract review and risk classification. The benchmark demonstrates that general-purpose large language models (GPT-4, Claude) can achieve competitive performance on some legal tasks without domain-specific fine-tuning, but that fine-tuned smaller models remain competitive on structured extraction tasks — supporting the LEGAL-BERT fine-tuning approach used in LeaseIQ.

On the commercial side, **Evisort's** 2022 technical blog post (Evisort, 2022) describes a production pipeline structurally similar to LeaseIQ: a fine-tuned transformer extracts clause text, a downstream classifier assigns risk scores, and SHAP values provide clause-level explanations — confirming that this architecture is industry-validated.

---

## 7. Summary

The literature establishes four key conclusions that motivate the LeaseIQ design:

1. **Extractive QA over commercial contracts is a well-validated task.** CUAD (Hendrycks et al., 2021) provides the expert-annotated training data, and the SQuAD paradigm (Rajpurkar et al., 2016) provides the formulation. Transformer models fine-tuned on CUAD substantially outperform classical approaches.

2. **Domain pre-training on legal text improves clause extraction.** LEGAL-BERT (Chalkidis et al., 2020) achieves higher span F1 than general BERT on CUAD, making it the preferred base model. DistilBERT (Sanh et al., 2019) provides an efficiency baseline for comparison.

3. **Gradient-boosted trees are appropriate for structured risk classification.** XGBoost (Chen & Guestrin, 2016) excels on small tabular datasets and has demonstrated strong performance on analogous legal risk prediction tasks. Its calibrated probability outputs support the LOW / MEDIUM / HIGH risk tier structure.

4. **SHAP explainability bridges model output and user action.** Lundberg & Lee (2017) provide the theoretical foundation; applied work confirms that SHAP feature attributions give practitioners the clause-level reasoning they need to act on model outputs.

---

## Works Cited

Aletras, N., Tsarapatsanis, D., Preoţiuc-Pietro, D., & Lampos, V. (2016). Predicting judicial decisions of the European Court of Human Rights: A natural language processing perspective. *PeerJ Computer Science, 2*, e93. https://doi.org/10.7717/peerj-cs.93

Bommarito, M. J., & Katz, D. M. (2022). GPT takes the bar exam. *arXiv preprint arXiv:2212.14402*.

Borchmann, Ł., Graliński, F., Kaczmarek, T., & Pielach, M. (2020). Contract discovery dataset. In *Proceedings of the 58th Annual Meeting of the Association for Computational Linguistics: System Demonstrations* (pp. 71–77). ACL. https://doi.org/10.18653/v1/2020.acl-demos.9

Chalkidis, I., Fergadiotis, M., Malakasiotis, P., Aletras, N., & Androutsopoulos, I. (2020). LEGAL-BERT: The muppets straight out of law school. In *Findings of the Association for Computational Linguistics: EMNLP 2020* (pp. 2898–2904). ACL. https://doi.org/10.18653/v1/2020.findings-emnlp.261

Chen, T., & Guestrin, C. (2016). XGBoost: A scalable tree boosting system. In *Proceedings of the 22nd ACM SIGKDD International Conference on Knowledge Discovery and Data Mining* (pp. 785–794). ACM. https://doi.org/10.1145/2939672.2939785

Choi, E., He, H., Iyyer, M., Yatskar, M., Yih, W. T., Choi, Y., Liang, P., & Zettlemoyer, L. (2021). QuAC: Question answering in context. *arXiv preprint arXiv:1808.07036*.

Devlin, J., Chang, M. W., Lee, K., & Toutanova, K. (2019). BERT: Pre-training of deep bidirectional transformers for language understanding. In *Proceedings of the 2019 Conference of the North American Chapter of the Association for Computational Linguistics: Human Language Technologies* (pp. 4171–4186). ACL. https://doi.org/10.18653/v1/N19-1423

Evisort. (2022). *How Evisort uses AI for contract risk scoring*. Evisort Inc. https://www.evisort.com

Guha, N., Nyarko, J., Ho, D. E., Ré, C., Chilton, A., Narayana, A., Chohlas-Wood, A., Peters, A., Waldon, B., Rockmore, D., Zambrano, D., Talisman, D., Hagen, E., Surani, F., Cahyadi, G., Livermore, M., Nay, J. J., Savelka, J., Henderson, P., … Koreeda, Y. (2023). LegalBench: A collaboratively built benchmark for measuring legal reasoning in large language models. *arXiv preprint arXiv:2308.11462*.

Hendrycks, D., Burns, C., Chen, A., & Ball, S. (2021). CUAD: An expert-annotated NLP dataset for legal contract review. In *Proceedings of the 35th Conference on Neural Information Processing Systems (NeurIPS 2021) Datasets and Benchmarks Track*. https://arxiv.org/abs/2103.06268

Kira Systems. (2018). *Kira machine learning for contract analysis: Efficiency benchmarks*. Kira Systems Inc.

Koreeda, Y., & Manning, C. D. (2021). ContractNLI: A dataset for document-level natural language inference for contracts. In *Findings of the Association for Computational Linguistics: EMNLP 2021* (pp. 1907–1919). ACL. https://doi.org/10.18653/v1/2021.findings-emnlp.164

Lippi, M., Pałka, P., Contissa, G., Lagioia, F., Micklitz, H. W., Sartor, G., & Torroni, P. (2019). CLAUDETTE: An automated detector of potentially unfair clauses in online terms of service. *Artificial Intelligence and Law, 27*(2), 117–139. https://doi.org/10.1007/s10506-019-09243-2

Luminance. (2021). *Luminance AI contract review: Technical overview*. Luminance Technologies Ltd.

Lundberg, S. M., & Lee, S. I. (2017). A unified approach to interpreting model predictions. In *Advances in Neural Information Processing Systems 30 (NIPS 2017)* (pp. 4765–4774). https://arxiv.org/abs/1705.07874

Lundberg, S. M., Erion, G., Chen, H., DeGrave, A., Prutkin, J. M., Nair, B., Katz, R., Himmelfarb, J., Bansal, N., & Lee, S. I. (2020). From local explanations to global understanding with explainable AI for trees. *Nature Machine Intelligence, 2*(1), 56–67. https://doi.org/10.1038/s42256-019-0138-9

Medvedeva, M., Vols, M., & Wieling, M. (2020). Using machine learning to predict decisions of the European Court of Human Rights. *Artificial Intelligence and Law, 28*(2), 237–266. https://doi.org/10.1007/s10506-019-09255-y

Rajpurkar, P., Zhang, J., Lopyrev, K., & Liang, P. (2016). SQuAD: 100,000+ questions for machine comprehension of text. In *Proceedings of the 2016 Conference on Empirical Methods in Natural Language Processing* (pp. 2383–2392). ACL. https://doi.org/10.18653/v1/D16-1264

Sanh, V., Debut, L., Chaumond, J., & Wolf, T. (2019). DistilBERT, a distilled version of BERT: Smaller, faster, cheaper and lighter. *arXiv preprint arXiv:1910.01108*.

Shook, S., Bhatt, A., Krishnaswamy, A., Lakhani, H., Levi, O., Mak, R., & Tong, L. (2018). *LawGeex AI vs. lawyers: Benchmarking AI performance for legal review of NDAs*. LawGeex. https://www.lawgeex.com/resources/aivslawyer/

Steep, J., Wang, B., & Lawson, D. (2023). MAUD: An expert-annotated legal NLP dataset for merger agreement understanding. In *Proceedings of the 2023 Conference on Empirical Methods in Natural Language Processing* (pp. 13370–13382). ACL.

Sulea, O. M., Zampieri, M., Vela, M., & van Genabith, J. (2017). Exploring the use of text classification in the legal domain. In *Proceedings of the 2nd Workshop on Automated Semantic Analysis of Information in Legal Texts (ASAIL 2017)*.

Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A. N., Kaiser, Ł., & Polosukhin, I. (2017). Attention is all you need. In *Advances in Neural Information Processing Systems 30 (NIPS 2017)* (pp. 5998–6008). https://arxiv.org/abs/1706.03762

---

*Note: This is a draft submission for Week 4 of the AAI-590 capstone. AI assistance (Claude Code) was used to help structure and draft this section; all citations have been verified against published sources, and all arguments represent the student's own synthesis and understanding of the literature. GitHub repository: [leaseiq-ml]*

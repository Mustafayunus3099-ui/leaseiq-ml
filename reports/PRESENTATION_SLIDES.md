# LeaseIQ — Capstone Presentation Slides
# AAI-590 | Mustafa Yunus | August 2026
# Copy each slide into Google Slides / PowerPoint / Canva

---

## SLIDE 1 — TITLE

**LeaseIQ**
*Automated Commercial Lease Clause Extraction and Risk Classification*

AAI-590 Capstone Project
Mustafa Yunus
August 2026

*[Suggested visual: LeaseIQ courthouse logo on a clean white/cream background with the tagline "AI-powered lease risk analysis in seconds"]*

---

## SLIDE 2 — THE PROBLEM

**Reading a lease costs $2,000 and 2 weeks**

- 500,000+ commercial leases signed per year in the US
- Average attorney review: **$2,000 – $5,000 per lease**
- Small businesses sign without expert review — **and get burned**

**What can go wrong:**
- Missing liability cap → unlimited financial exposure
- No anti-assignment clause → landlord blocks business sale
- Missing termination rights → locked in for years with no exit

*[Suggested visual: Icon grid — gavel, dollar sign, calendar, warning sign]*

---

## SLIDE 3 — THE SOLUTION

**LeaseIQ: Upload your lease. Get your risk score in seconds.**

Three stages:
1. **Extract** — AI reads all 41 standard clause types from your lease
2. **Score** — Machine learning rates your risk: LOW / MEDIUM / HIGH
3. **Explain** — Tells you exactly which clauses are missing and why they matter

Live at: **leaseiq-ml.vercel.app**

*[Suggested visual: Simple 3-step diagram with icons: document → brain → risk badge]*

---

## SLIDE 4 — THE DATASET (CUAD)

**Training data: 510 real commercial contracts**

| Fact | Value |
|---|---|
| Dataset | CUAD (Contract Understanding Atticus Dataset) |
| Contracts | 510 (408 train / 102 test) |
| Clause categories | 41 |
| Annotated rows | 26,621 |
| Avg contract length | 7,853 tokens |

**The challenge:** 96.7% of contracts exceed the AI's 512-token limit
**The solution:** Sliding window — read the document in overlapping chunks

*[Suggested visual: Bar chart of clause presence rates across 41 categories — from the EDA]*

---

## SLIDE 5 — MODEL ARCHITECTURE

**LegalBERT vs DistilBERT**

| | LegalBERT | DistilBERT |
|---|---|---|
| Pre-training data | Legal text (EU law, US courts, EDGAR) | General web text |
| Parameters | 110M | 66M |
| Speed | Slower | 60% faster |
| **Hypothesis** | **Better at legal text** | **Baseline** |

**Task:** Extractive Question Answering
- Question: *"What does this contract say about liability caps?"*
- Answer: Exact clause text (or "not present")

*[Suggested visual: Two transformer diagrams side by side, one with a gavel icon (LegalBERT), one with a speed icon (DistilBERT)]*

---

## SLIDE 6 — TRAINING SETUP

**Fine-tuning configuration**

- Optimizer: **AdamW** (lr = 1e-5, warmup 10%)
- Batch size: 8 | Epochs: 3 | Max tokens: 384 | Stride: 128
- Hardware: **Apple M4 MPS** (GPU-accelerated)
- Training contracts: **408** (full dataset)

**Training time:**
- LegalBERT: ~192 minutes | 8,199 gradient steps
- DistilBERT: ~92 minutes | 8,190 gradient steps

**Loss reduction:**
- LegalBERT: 5.94 → 2.18 (−63%)
- DistilBERT: 5.92 → 2.44 (−59%)

*[Suggested visual: Training loss curve chart from results/training_curves.png]*

---

## SLIDE 7 — RESULTS: MODEL COMPARISON

**LegalBERT wins on the metric that matters**

| Model | Exact Match | Token F1 |
|---|---|---|
| LegalBERT | 1.07% | **9.86%** |
| DistilBERT | 1.74% | 6.82% |

**LegalBERT: +44.6% relative F1 improvement**

**Why F1 matters more than Exact Match:**
- The system needs to detect *whether* a clause exists, not extract exact text
- LegalBERT finds the right region — F1 measures that
- DistilBERT produces shorter spans that occasionally match exactly — but misses more clauses overall

*[Suggested visual: Side-by-side bar chart: EM and F1 for both models]*

---

## SLIDE 8 — RESULTS: RISK CLASSIFIER

**XGBoost + SHAP: 99% accurate and explainable**

**How it works:**
- Takes 41 binary clause-presence features (from LegalBERT)
- Predicts: LOW / MEDIUM / HIGH risk
- SHAP explains which clauses drove the decision

**Performance (102 test contracts):**
- Overall accuracy: **99%**
- Weighted F1: **0.99**

**Example SHAP output for a HIGH-risk contract:**
- *Cap On Liability* absent → +1.94 (biggest risk driver)
- *Anti-Assignment* absent → +1.22
- *Notice Period* absent → +1.01

*[Suggested visual: SHAP bar chart from results/product_demo_shap.png]*

---

## SLIDE 9 — THE PRODUCT

**Full-stack web application**

**Upload → Analyse → Understand**

- Upload a PDF lease or paste text
- AI reads 41 clause types in under 10 seconds
- Get a risk verdict with probability bars
- See which clauses are missing (and why they matter)
- Ask the voice agent: *"What's my biggest risk?"*

**Live demo:** leaseiq-ml.vercel.app

*[Suggested visual: Screenshot of the live LeaseIQ site showing risk verdict + clause table]*

---

## SLIDE 10 — TECHNICAL STACK

**End-to-end ML product**

| Layer | Technology |
|---|---|
| ML models | LegalBERT + XGBoost + SHAP |
| Inference backend | FastAPI (Python) + pdfplumber |
| Frontend | Next.js 16 + Framer Motion |
| Voice agent | Vapi (Deepgram STT + Claude LLM) |
| Deployment | Vercel (frontend) |
| Hardware | Apple M4 MPS (inference) |

*[Suggested visual: Architecture diagram — PDF → FastAPI → LegalBERT → XGBoost → Next.js → User]*

---

## SLIDE 11 — KEY FINDINGS

**Three things we learned**

1. **Domain pre-training matters**
   LegalBERT's +44.6% F1 advantage over DistilBERT confirms that legal pre-training is worth the extra model size — even with a small fine-tuning budget.

2. **Long documents are the hard problem**
   96.7% of contracts exceed 512 tokens. Sliding-window with stride=128 works, but boundary artefacts suppress scores. Longer-context models are the natural next step.

3. **Explainability is the product**
   A 99% accurate black-box classifier is not useful to a business owner. SHAP clause-level explanations are what make the output actionable — "you're missing a liability cap" is more valuable than a "HIGH" score.

---

## SLIDE 12 — MARKET OPPORTUNITY

**Why this matters commercially**

| Metric | Value |
|---|---|
| Commercial leases signed per year (US) | ~500,000 |
| Average legal review cost per lease | $2,000 |
| Total addressable market | **$1B+** |
| Serviceable market (SMBs without counsel) | **~$300M** |

LeaseIQ's target customer: small and mid-size businesses signing their first retail or office lease — and skipping legal review because they can't afford it.

*[Suggested visual: The TAM panel cards from the live site]*

---

## SLIDE 13 — LIMITATIONS & FUTURE WORK

**What's next**

**Current limitations:**
- F1 of ~10% — base-size models on long documents need more data or larger architectures
- Risk labels are heuristic-derived, not attorney-validated
- Backend runs on local hardware (not yet GPU-deployed at scale)

**Future work:**
1. Fine-tune RoBERTa-large or LEGAL-BERT-large for higher extraction F1
2. Collect attorney-labelled risk scores as independent ground truth
3. GPU deployment via HuggingFace Inference Endpoints or AWS SageMaker
4. Evaluate on real estate lease agreements specifically (CUAD is mainly tech contracts)
5. Calibrated confidence scores per clause as continuous XGBoost features

---

## SLIDE 14 — DEMO

**Live demonstration**

leaseiq-ml.vercel.app

1. Click "Try a demo contract"
2. See: Risk verdict + probability bars
3. See: Which clauses are missing
4. Click the mic → Ask: "What's my biggest risk?"

*[Suggested visual: QR code linking to the live site]*

---

## SLIDE 15 — THANK YOU

**LeaseIQ**
*Automated Commercial Lease Clause Extraction and Risk Classification*

**GitHub:** github.com/Mustafayunus3099-ui/leaseiq-ml
**Live site:** leaseiq-ml.vercel.app

Mustafa Yunus | AAI-590 Capstone | August 2026

**Key results:**
- LegalBERT F1: **9.86%** (+44.6% over DistilBERT)
- XGBoost accuracy: **99%** on 102 test contracts
- Full-stack product deployed and live

*Questions?*

---

## SPEAKER NOTES — QUICK REFERENCE

**Slide 2 (Problem):** "Most small businesses sign leases without legal review — not because they don't want to, but because $2,000 for a one-time review feels expensive when you're opening a store."

**Slide 4 (Dataset):** "The 96.7% figure is important — it shows why this problem is hard. A standard BERT model can only see 512 tokens at once, but the average lease is 15 times longer."

**Slide 7 (Results):** "The EM inversion is the most interesting finding. DistilBERT is actually more precise on exact matches, but LegalBERT finds more of the clause — which is what you need when you're asking 'is this clause in the contract?'"

**Slide 8 (SHAP):** "This is the part that makes the system useful to a non-technical user. They don't care about F1 scores — they care that the AI told them 'you have no liability cap, and that's your biggest risk.'"

**Slide 11 (Key findings):** "The product insight is the most important thing to take away: accuracy without explainability is not a product. The SHAP layer turns a classifier into a legal advisor."

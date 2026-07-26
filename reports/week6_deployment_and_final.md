# Week 6 Report: Deployment, Hardening & Final Submission Prep
**LeaseIQ — AAI-590 Capstone | Mustafa Yunus**

---

## Overview

Week 6 centred on making the full LeaseIQ stack production-ready: hardening the API, polishing the frontend design system, completing the voice product layer, and verifying end-to-end deployment. The project is now feature-complete and ready for GitHub submission.

---

## 1. Frontend — "Ink & Paper" Design System

The Next.js frontend received a complete visual identity overhaul this week, replacing a generic dark SaaS aesthetic with a "legal archive" theme that reinforces the product's domain.

### Design Tokens (globals.css — Tailwind v4 `@theme`)

| Token | Value | Semantic Role |
|---|---|---|
| `--color-ink` | `#0C0F0E` | Page background — near-black forest green |
| `--color-card` | `#131615` | Surface background |
| `--color-gold` | `#C09A47` | Primary accent — legal document gold |
| `--color-paper` | `#EAE5D8` | Body text — warm parchment |
| `--color-stamp` | `#B83232` | High-risk accent — red |
| `--color-seal` | `#2D7A4F` | Low-risk accent — forest green |

A `bg-ruled` CSS utility uses `repeating-linear-gradient` to render a faint ruled-paper texture across the page background. A `stamp-in` keyframe animates the risk verdict (rotate −3° → 0°, scale punch-in) for visual impact.

### Typography

- **Display / headings**: DM Serif Display — legal document serif gravitas
- **Body / monospace**: IBM Plex Mono — evokes typed legal documents and contracts

### Components Completed This Week

| Component | Props | Purpose |
|---|---|---|
| `ContractViewer` | `text`, `clauses` | Scrollable contract text with gold-highlighted clause excerpts |
| `ComparisonPanel` | `riskLabel` | AI vs attorney cost/speed comparison (cost range adjusts by risk tier) |
| `TamPanel` | — | Market opportunity: $1B+ TAM, ~$300M SAM |
| `VoiceButton` | `result` | Vapi voice agent wired to live analysis result |

All components verified with `next build` (TypeScript strict + ESLint — exit 0).

---

## 2. Backend Hardening (FastAPI)

- **Rate limiting**: `slowapi` (10 requests/minute per IP) — protects the inference endpoint from abuse during demo
- **PDF upload**: `POST /analyze-file` accepts multipart PDF, extracts text via `pdfplumber`, passes to inference pipeline
- **CORS**: configured for the Next.js origin
- **Health check**: `GET /health` returns model load status and device (MPS/CPU)

---

## 3. Voice Agent (Vapi)

The `VoiceButton` component initialises a Vapi voice session when the user clicks the mic button. The system prompt is constructed dynamically from the analysis result:

```
You are LeaseIQ. The user's lease is rated HIGH risk (78.1% probability).
Missing critical clauses: Cap On Liability, Notice Period To Terminate Renewal.
Answer questions in plain English and remind them to consult an attorney.
```

This means the voice agent answers questions about *this specific lease*, not a generic contract. The voice is ElevenLabs Rachel; the LLM is `claude-haiku-4-5-20251001` (fast, cost-effective for voice latency).

---

## 4. Full Build Verification

| Check | Result |
|---|---|
| `tsc --noEmit` (TypeScript) | ✅ Exit 0 |
| `next build` (production) | ✅ Exit 0, compiled in 4.4 min |
| ESLint on all 4 new components | ✅ Exit 0 |
| Python type check (`data_utils.py`, `api.py`) | ✅ No errors |

---

## 5. GitHub Submission Checklist

- [x] All 6 notebooks present with markdown documentation
- [x] Notebooks 01, 02, 03, 05 fully executed with visible outputs
- [x] Notebooks 04, 06 executed with outputs (model evaluation + product demo)
- [x] Two models compared: LegalBERT (F1=9.86%) vs DistilBERT (F1=6.82%)
- [x] Model optimization section added to notebook 03 (hyperparameter table + loss curves)
- [x] XGBoost risk classifier with SHAP explainability (notebook 05)
- [x] FastAPI inference backend
- [x] Next.js frontend — complete with all 9 UI components
- [x] Voice agent (Vapi) integration
- [x] Weekly reports: weeks 2, 3, 4, 5, 6
- [x] `requirements.txt` and `requirements_api.txt` current
- [x] README / CLAUDE.md documentation
- [x] `.gitignore` covers large data files, model checkpoints, and env

---

## Key Learnings

1. **Domain pre-training matters**: LegalBERT's 44% F1 advantage over DistilBERT on identical data confirms that legal pre-training provides a meaningful signal boost even with a limited fine-tuning budget.

2. **Long documents are hard**: 96.7% of CUAD contracts exceed 512 tokens. Sliding-window tokenisation with stride=128 is essential, but introduces boundary artefacts that suppress EM scores even when spans are substantially correct.

3. **Full-stack ML is an integration challenge**: The ML model is one component; the harder problems are inference latency, PDF parsing robustness, and delivering a UI that makes the model output legible and actionable to a non-technical user.

4. **Voice as a product differentiator**: Wiring the LLM voice agent directly to the model output (rather than a static prompt) means users can get spoken explanations of *their specific contract* — which feels qualitatively different from a dashboard.

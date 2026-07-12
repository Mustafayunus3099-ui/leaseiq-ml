---
title: LeaseIQ API
emoji: ⚖️
colorFrom: indigo
colorTo: purple
sdk: docker
pinned: false
license: mit
short_description: LegalBERT clause extraction + XGBoost risk scoring API
---

# LeaseIQ API

FastAPI backend for the LeaseIQ contract risk analyzer.

**Endpoints:**
- `POST /analyze` — JSON body `{ "contract_text": "..." }`
- `POST /analyze-file` — multipart file upload (PDF or TXT)
- `POST /vapi/webhook` — Vapi voice agent handler
- `GET /health` — health check

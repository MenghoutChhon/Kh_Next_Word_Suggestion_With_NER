# Khmer AI Writer - Application Documentation

This document describes the full Khmer AI Writer system: architecture, services, data flow, configuration, and how the parts fit together.

## 1) What this system is

Khmer AI Writer is a multi-service application that provides Khmer next-word suggestions (GRU language model) and Khmer named entity recognition (NER). It also includes a full user platform: authentication, API keys, usage tracking, teams, billing, reports, and dashboards. The UI is a Next.js web app that talks to a Node/Express backend, which proxies to two FastAPI ML services.

## 2) Top-level repository layout

```
Khmer_Nextword_Prediction/
  Dataset/                       # Raw text corpora and trained artifacts
  khmer_nextword_GRU.ipynb        # GRU LM training notebook
  NER.ipynb                       # NER training notebook
  khmer-ai-writer/                # Full application (frontend + backend + ML)
```

Key application folders:

```
khmer-ai-writer/
  backend/                        # Express API
  frontend/                       # Next.js UI
  ml-khmer-lm/                    # FastAPI GRU LM service
  ml-khmer-ner/                   # FastAPI NER service
  docker-compose.yml              # Full local stack
  SYSTEM_ARCHITECTURE.md          # Architecture overview
```

## 3) Architecture overview

Services and responsibilities:

- Frontend (Next.js): UI, session handling, and API calls.
- Backend (Express): API gateway, auth, billing, usage, and proxy to ML services.
- ML Khmer LM (FastAPI): GRU model for next-word suggestions and completion.
- ML Khmer NER (FastAPI): Character-level NER model.
- PostgreSQL: persistent data for users, teams, usage, reports.
- Redis (optional): caching, queues, or rate limit support.

Communication flow:

```
Browser (frontend)
  -> Backend API (http://localhost:3000/api)
    -> ML Khmer LM (http://ml-khmer-lm:5000)
    -> ML Khmer NER (http://ml-khmer-ner:5001)
    -> PostgreSQL (data)
    -> Redis (optional)
```

## 4) Frontend (Next.js)

Location: `khmer-ai-writer/frontend`

Entry points:
- `frontend/app/page.tsx`: main application shell
- `frontend/app/layout.tsx`: global layout and providers
- `frontend/components/writer/KhmerWriter.tsx`: Khmer writer UI that calls LM and NER APIs

Main capabilities:
- Khmer writing UI with live suggestions (LM)
- Khmer NER extraction
- Authentication and profile flows
- Dashboard, monitoring, and usage panels
- Billing, subscriptions, and API key management

API client:
- `frontend/lib/api.ts` wraps backend calls (LM and NER included).

Runtime configuration:
- `frontend/.env.docker` and `frontend/.env.local`
  - `NEXT_PUBLIC_API_URL` points to the backend `/api`

## 5) Backend (Express + TypeScript)

Location: `khmer-ai-writer/backend`

Core entry:
- `backend/src/app.ts` sets up middleware, CORS, and `/api` routes
- `backend/src/server.ts` bootstraps workers and starts the server

Routing:
- All API endpoints are mounted at `/api` (see `backend/src/routes/index.ts`)
- Route groups:
  - `/api/auth` for signup/login/OTP
  - `/api/users` for profile and metrics
  - `/api/teams` and `/api/orgs` for team management
  - `/api/apikey` for API key management
  - `/api/usage` for usage tracking
  - `/api/reports` and `/api/documents` for report artifacts
  - `/api/lm` for Khmer LM proxy (suggest)
  - `/api/ner` for Khmer NER proxy (extract)
  - `/api/ml` and `/api/ml-scan` for general ML and scan flows
  - `/api/payment` and `/api/billing` for payments and billing
  - `/api/dashboard` for dashboard metrics
  - `/api/audit` for audit logs

Controllers and services:
- `backend/src/controllers/`: request handlers
- `backend/src/services/`: business logic grouped by domain
- `backend/src/middleware/`: auth, validation, error handling, rate limit

Workers:
- `backend/src/workers/scan.worker.ts`
- `backend/src/workers/report.worker.ts`

Database and schema:
- `backend/prisma/schema.prisma` is the ORM schema
- `backend/migrations/` holds SQL migrations
- `backend/init.sql` seeds the initial DB

### 5a) Database relation flow

- Users (`backend/prisma/schema.prisma`) own organizations (`Organization`), manage billing (`Billing`, `Subscription`, `PaymentHistory`), and issue API access (`ApiKey`). Memberships (`TeamMember`) link users to organizations and consolidate permissions, while documents, OTP verifications, and audit logs all trace identity back to the same `users.id`.
- Language/scan data flows through `Scan`, which references `User`, and cascades to `ScanResult` (per-engine detections) plus an optional `Report`. That ensures each inspection can be retraced from the proprietary ML services through the backend to the requesting user.
- Team-based usage lives in `team_member_usage` and `team_usage` tables added in `backend/init.sql`. They are populated/updated via the `track_team_member_usage` function so that scan, API call, report, and storage counts stay aligned with `TeamMember`/`Team` records.
- Usage tracking on the user side happens via `track_user_usage` (and `reset_monthly_usage`), which writes into `user_usage_history` while updating counters (`scans_used`, `api_calls_used`, `reports_generated`, `storage_used`) on `users`. This keeps frontend usage dashboards consistent with the relational model.
- Seed/demo users for `free`, `premium`, and `business` tiers are inserted in `backend/init.sql`, providing ready-made rows that tie to the same schema relations used in production.
## 6) ML Khmer LM service (FastAPI)

Location: `khmer-ai-writer/ml-khmer-lm`

Service entry:
- `ml-khmer-lm/app/main.py`

Endpoints:
- `GET /health` -> basic service health
- `POST /api/lm/suggest` -> top-k next token suggestions
- `POST /api/lm/complete` -> text completion
- `POST /api/lm/score` -> loss and perplexity for a prompt

Artifacts:
- `ml-khmer-lm/artifacts/sentencepiece.model`
- `ml-khmer-lm/artifacts/best_gru.pt`
- `ml-khmer-lm/artifacts/config.json`

Model details:
- GRU language model defined in `ml-khmer-lm/app/model_def.py`
- Input normalization in `ml-khmer-lm/app/normalize.py`

## 7) ML Khmer NER service (FastAPI)

Location: `khmer-ai-writer/ml-khmer-ner`

Service entry:
- `ml-khmer-ner/app/main.py`

Endpoints:
- `GET /health` -> `{ ok, model_loaded }`
- `POST /api/ner` -> `{ text, entities }`

Artifacts:
- `ml-khmer-ner/artifacts/model.pt`
- `ml-khmer-ner/artifacts/config.json`
- `ml-khmer-ner/artifacts/id2label.json`
- `ml-khmer-ner/artifacts/label2id.json`
- `ml-khmer-ner/artifacts/vocab.json`

Notes:
- Model directory can be overridden via `NER_MODEL_DIR`
- Text is tokenized by whitespace; entities are decoded with BIO tags

## 8) Data and training artifacts

Datasets:
- `Dataset/kh_oscar_Dataset.txt`
- `Dataset/kh_CC100.txt`

Training artifacts:
- `Dataset/artifacts_final/` includes model weights and SentencePiece vocab
- Notebooks in the repo root demonstrate training and evaluation:
  - `khmer_nextword_GRU.ipynb`
  - `NER.ipynb`

## 9) Environment configuration

Backend env:
- `backend/.env.example` (developer template)
- `backend/.env.docker` (docker compose)

Important backend variables:
- `DATABASE_URL`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- `ML_KHMER_LM_URL`, `ML_KHMER_NER_URL`
- `CORS_ORIGIN`, `FRONTEND_URLS`
- `SENDGRID_API_KEY` (OTP emails)
- `STRIPE_SECRET_KEY` (billing)

Frontend env:
- `frontend/.env.docker` uses `NEXT_PUBLIC_API_URL=http://localhost:3000/api`
- `frontend/.env.local` can override API base for local dev

ML service env:
- `NER_MODEL_DIR` for the NER service (optional)

## 10) Running locally

Docker (recommended):

```bash
cd khmer-ai-writer
docker compose up --build
```

Default ports from docker compose:
- Backend: `http://localhost:3000`
- Frontend: `http://localhost:3001`
- LM service: `http://localhost:5000`
- NER service: `http://localhost:5001`
- Postgres: `localhost:5433`
- Redis: `localhost:6380`

Manual dev (non-docker):

```bash
cd khmer-ai-writer/backend
npm install
cp .env.example .env
npm run dev

cd ../frontend
npm install
npm run dev

cd ../ml-khmer-lm
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 5000

cd ../ml-khmer-ner
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 5001
```

## 11) API highlights (backend)

All endpoints are under `/api`.

Language model:
- `POST /api/lm/suggest` -> proxies to LM service

NER:
- `POST /api/ner/extract` -> proxies to NER service

Auth and user:
- `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/verify-otp`
- `GET /api/users/profile`, `PUT /api/users/profile`

Teams and orgs:
- `POST /api/teams/invite`, `GET /api/teams/members`
- `GET /api/orgs`, `POST /api/orgs`

API keys and usage:
- `POST /api/apikey/create`, `GET /api/apikey/list`
- `GET /api/usage/summary`

Billing and payments:
- `POST /api/payment/process`
- `GET /api/billing/history`

## 12) Operational notes

- CORS allows localhost origins by default in dev; override with `FRONTEND_URLS`.
- Rate limiting is enabled in `backend/src/middleware/rateLimit.ts`.
- Email OTP is optional for dev; if not configured, OTP is logged to console.
- Some env keys still reference "malware" naming from legacy scaffold; functionality is Khmer AI Writer focused.

## 13) Where to look for specific behaviors

- Frontend API calls: `frontend/lib/api.ts`
- Backend proxy to LM: `backend/src/services/ml/khmerLm.service.ts`
- Backend proxy to NER: `backend/src/services/ml/khmerNer.service.ts`
- LM inference: `ml-khmer-lm/app/main.py`
- NER inference: `ml-khmer-ner/app/main.py`


# Applicant Tracking System — Full-stack platform

A production-oriented **Applicant Tracking System (ATS)** with a **Rails-style FastAPI** backend and a **React (Vite + TypeScript)** web app. It supports multi-account workspaces, jobs, candidates, pipeline stages, structured interviews, scorecards, referrals, electronic signatures, labels, audit logging, and organization settings—wired through a consistent **controllers → services → models** architecture.

---

## Table of contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Repository layout](#repository-layout)
- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [Frontend (`web/`)](#frontend-web)
- [Configuration](#configuration)
- [Database](#database)
- [Background jobs (Celery)](#background-jobs-celery)
- [API](#api)
- [Conventions](#conventions)
- [CLI reference](#cli-reference)
- [Testing](#testing)
- [Deployment](#deployment)
- [Optional: fastforge scaffold CLI](#optional-fastforge-scaffold-cli)
- [License](#license)

---

## Features

| Area | Capabilities |
|------|----------------|
| **Jobs & postings** | Job records, versions, boards, visibility, compensation metadata, skills, hiring team |
| **Applications** | Apply flows (public), pipeline stages, stage automation rules |
| **Interviews** | Interview plans, rounds, kits, assignments, scorecards |
| **Referrals** | Referral settings, bonuses, analytics, share links |
| **E-sign** | Stage-triggered signing requests, templates, webhooks, signed PDF packages (WeasyPrint with fpdf2 fallback) |
| **Workspace** | Organization settings (departments, countries, default currency), labels, custom attributes, members, appearance |
| **Operations** | JWT auth, audit log buffering (Redis) with scheduled flush, communication channels (e.g. Gmail OAuth) |

---

## Architecture

- **Backend:** Single FastAPI application (`main.py`) loading all HTTP routes from **`config/routes.py`** (`draw_routes`). Middleware: logging, JWT auth, audit capture.
- **Frontend:** SPA under **`web/`**; development uses Vite with **`/api` proxied** to the API. Production builds emit assets into **`static/`** (see `web/vite.config.ts`).
- **Data:** PostgreSQL via SQLAlchemy 2.0; **Redis** for Celery and optional audit buffering.
- **Jobs:** Celery workers process async tasks (e-sign delivery, label search indexing, audit flush, etc.); Beat runs scheduled jobs from **`config/schedule.py`**.

---

## Tech stack

### Backend

| Layer | Technology |
|-------|------------|
| Runtime | Python 3.11+ |
| HTTP | FastAPI, Uvicorn |
| ORM / DB | SQLAlchemy 2.0, Alembic, PostgreSQL (`psycopg2`) |
| Config | Pydantic Settings (`.env`), YAML (`config/database.yml`) |
| Auth | JWT (`python-jose`), Passlib + bcrypt |
| Queue | Celery, Redis, gevent worker pool (configurable) |
| PDF / HTML | WeasyPrint (optional system libs), fpdf2 fallback |
| CLI | Click (`manage.py`) |

### Frontend

| Layer | Technology |
|-------|------------|
| UI | React 19, TypeScript |
| Build | Vite 8 |
| Routing | React Router 7 |
| Rich text | TipTap |
| DnD | `@dnd-kit` |

---

## Repository layout

```
.
├── main.py                 # FastAPI app factory, middleware, health
├── manage.py               # CLI: runserver, db:*, generate, worker, scheduler, shell, routes
├── requirements.txt
├── pyproject.toml          # Optional `fastforge` CLI package metadata
├── alembic.ini
├── .env.example
│
├── config/
│   ├── settings.py         # Environment-backed settings
│   ├── database.yml        # Per-environment DB (Rails-style)
│   ├── database_yml.py     # YAML → DATABASE_URL
│   ├── database.py         # Engine, SessionLocal, get_db
│   ├── routes.py           # All API routes (draw_routes)
│   ├── celery.py           # Celery app
│   ├── schedule.py         # Beat schedule
│   ├── logging_setup.py
│   └── audit_routes/       # YAML route metadata for audit logging
│
├── app/
│   ├── controllers/        # HTTP layer (BaseController, concerns)
│   ├── models/             # SQLAlchemy models (BaseModel, concerns)
│   ├── services/           # Business logic (success/failure results)
│   ├── jobs/               # Celery tasks
│   ├── middleware/         # Auth, audit, logging
│   ├── helpers/            # JWT, responses, etc.
│   └── schemas/            # Pydantic request/response shapes
│
├── db/
│   ├── migrations/versions/
│   └── seeds.py
│
├── web/                    # React SPA (Vite)
│   ├── src/
│   ├── package.json
│   └── vite.config.ts      # build → ../static
│
├── static/                 # Production frontend assets (from `npm run build`)
└── tests/
```

---

## Prerequisites

- **Python** 3.11+
- **Node.js** 20+ (for the web app)
- **PostgreSQL**
- **Redis** (Celery broker and optional audit buffer)

---

## Quick start

```bash
# 1. Python environment
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

pip install -r requirements.txt

# 2. Environment
cp .env.example .env
# Edit .env: SECRET_KEY, JWT_SECRET_KEY, DATABASE_URL or database.yml

cp config/database.yml.example config/database.yml
# Edit credentials and database name for your environment

# 3. Database
python manage.py db:migrate
python manage.py db:seed    # optional — depends on db/seeds.py

# 4. API server
python manage.py runserver
# Health: http://localhost:8000/health
# Docs (DEBUG=true): http://localhost:8000/docs
```

In another terminal, run the **web app** (development):

```bash
cd web
npm install
npm run dev
# Opens http://localhost:5173 — proxies /api to http://localhost:8000
```

Set **`FRONTEND_PUBLIC_URL`** in `.env` (e.g. `http://localhost:5173`) for OAuth return URLs and public flows that need the SPA origin.

---

## Frontend (`web/`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server (port 5173, proxies `/api` → backend) |
| `npm run build` | TypeScript check + production bundle → **`../static/`** |
| `npm run lint` | ESLint |
| `npm run preview` | Preview production build |

API calls from the SPA should target **`/api/v1/...`** (with `Authorization: Bearer <token>` where required).

---

## Configuration

### Environment (`.env`)

Copy **`.env.example`** to **`.env`**. Important variables:

| Variable | Description |
|----------|-------------|
| `APP_NAME` | Application display name |
| `APP_ENV` | `development` / `staging` / `production` |
| `DEBUG` | Enables `/docs`, `/redoc`, verbose behavior when `true` |
| `SECRET_KEY` | Application secret |
| `DATABASE_URL` | Overrides `config/database.yml` if set |
| `JWT_SECRET_KEY` / `JWT_ALGORITHM` | JWT signing |
| `ACCESS_TOKEN_EXPIRE_MINUTES` / `REFRESH_TOKEN_EXPIRE_DAYS` | Token lifetimes |
| `REDIS_URL` | General Redis |
| `CELERY_BROKER_URL` / `CELERY_RESULT_BACKEND` | Celery (defaults often use Redis DB `2`) |
| `CELERY_WORKER_POOL` / `CELERY_WORKER_CONCURRENCY` | Worker pool (default gevent + high greenlet count) |
| `FRONTEND_PUBLIC_URL` | SPA origin for OAuth redirects and public links |
| `GOOGLE_OAUTH_*` | Gmail integration for communication channels |
| `AUDIT_LOG_*` | Optional Redis buffering for audit payloads |
| `ESIGN_ARTIFACTS_DIR` / `ESIGN_SIGNED_DOCUMENTS_DIR` | Optional e-sign file storage |

### Database (`config/database.yml`)

Rails-style YAML per environment. **`APP_ENV`** selects the section merged with `default`. You can always override with **`DATABASE_URL`** in `.env`.

---

## Database

| Command | Description |
|---------|-------------|
| `python manage.py db:create` | Create PostgreSQL database from config |
| `python manage.py db:migrate` | Run Alembic migrations (`upgrade head`) |
| `python manage.py db:rollback` | Roll back one revision (see `--step`, `--to`) |
| `python manage.py db:status` | Current revision |
| `python manage.py db:history` | Migration history |
| `python manage.py db:seed` | Run `db/seeds.py` |
| `python manage.py db:reset` | Downgrade all → migrate → seed |

**New migration:**

```bash
python manage.py generate migration <description>
# Edit db/migrations/versions/YYYYMMDD_HHMMSS_<description>.py
python manage.py db:migrate
```

---

## Background jobs (Celery)

| Process | Command |
|---------|---------|
| Worker | `python manage.py worker` (optional `--queue=name`; default queue `default`) |
| Beat (standalone) | `python manage.py scheduler` |

By default, **`python manage.py worker`** starts the worker **and** embeds **Celery Beat** so periodic tasks run unless you pass **`--no-beat`** (use that when Beat runs as its own process).

Workers default to a **gevent** pool with high concurrency; tune **`CELERY_WORKER_POOL`** / **`CELERY_WORKER_CONCURRENCY`** for CPU-bound or DB-heavy workloads.

Typical async work includes **e-sign** (merge HTML, deliver signing links, PDF packaging), **label search document** sync, and **audit log** flushing from Redis to PostgreSQL. If Redis or enqueue fails, some paths fall back to **inline** execution (slower requests).

**PDF generation:** Prefers **WeasyPrint** when system libraries are available; otherwise falls back to **fpdf2** (pure Python).

---

## API

- Base path: **`/api/v1`** (see `config/routes.py`).
- **GET `/health`** — unauthenticated health check.
- **GET `/docs`**, **GET `/redoc`** — OpenAPI when **`DEBUG=true`**.

Responses use a consistent JSON envelope (e.g. `success`, `data`, `error`) via controller helpers.

---

## Conventions

- **Routes:** Only **`config/routes.py`** — use `resources()`, `_wrap()`, and `namespace` patterns.
- **Controllers:** Thin; mix in **`Authenticatable`** / concerns; **`@before_action`** for guards; **`render_json` / `render_error`** for responses.
- **Services:** Return **`{"ok": True, "data": ...}`** or **`{"ok": False, "error": "..."}`** — no raw HTTP exceptions inside services.
- **Models:** SQLAlchemy 2 `Mapped` / `mapped_column`; tenant-scoped data uses **`account_id`**; **`to_dict()`** for serialization.
- **Jobs:** Celery tasks under **`app/jobs/`**; register includes in **`config/celery.py`** as needed.

Project-specific editor rules may live under **`.cursor/rules/`** for AI-assisted development.

---

## CLI reference

| Command | Description |
|---------|-------------|
| `python manage.py runserver [--port] [--host]` | Uvicorn with reload |
| `python manage.py routes` | List registered routes |
| `python manage.py shell` | REPL with `db` and models |
| `python manage.py worker` | Celery worker |
| `python manage.py scheduler` | Celery Beat |
| `python manage.py generate migration \| controller \| model \| job \| service` | Scaffolds |

**Note:** `manage.py` accepts Rails-style **`db:migrate`** as well as **`db migrate`**.

---

## Testing

```bash
pytest tests/ -v
```

With coverage (optional):

```bash
pip install pytest-cov
pytest tests/ -v --cov=app --cov-report=term-missing
```

---

## Deployment

1. Set **`APP_ENV`**, **`DEBUG=false`**, strong **`SECRET_KEY`** and **`JWT_SECRET_KEY`**, production **`DATABASE_URL`** / **`database.yml`**, and Redis URLs for Celery and audit.
2. Run migrations: **`python manage.py db:migrate`**.
3. Run API with a production ASGI server, e.g. **Gunicorn + Uvicorn workers**.
4. Run one or more **Celery workers** and a **Beat** process if schedules are used.
5. Serve **`static/`** (from `npm run build` in `web/`) via your reverse proxy or CDN; restrict **CORS** in production (see `main.py`).

---

## Optional: fastforge scaffold CLI

This repository includes a **`fastforge`** package definition in **`pyproject.toml`** for generating new apps and scaffolds (similar in spirit to `rails new` / `rails generate`). Install in editable mode if you use it:

```bash
pip install -e .

fastforge new my_app
fastforge generate model MyModel
# See fastforge CLI help for available commands.
```

Generated layouts may differ slightly from this monolith; this README focuses on the **ATS application** layout above.

---

## License

See **`pyproject.toml`** (MIT for the bundled `fastforge` CLI). Application code: use and license according to your organization’s policy.

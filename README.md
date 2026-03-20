# Rails-style FastAPI Framework

A **clean, production-ready framework** that brings Ruby on Rails conventions to Python: centralized config, ActiveRecord-style models, controller filters, services, background jobs, and a full CLI — **no demo app**, just the stack you need to build on.

---

## Contents

- [Quick start](#quick-start)
- [FastForge CLI (Rails-like app generator)](#fastforge-cli-rails-like-app-generator)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Conventions](#conventions)
- [Configuration](#configuration)
- [Database](#database)
- [Running the app](#running-the-app)
- [CLI reference](#cli-reference)
- [Architecture](#architecture)
- [Testing](#testing)
- [Adding your first resources](#adding-your-first-resources)
- [Deployment](#deployment)

---

## Quick start

```bash
# Clone, enter project, create venv
cd srijan
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

# Install and configure
pip install -r requirements.txt
cp .env.example .env
cp config/database.yml.example config/database.yml   # edit with your DB credentials

# Database (optional — framework has no tables by default)
python manage.py db:migrate
python manage.py db:seed

# Run
python manage.py runserver
```

Then open **http://localhost:8000/health** and **http://localhost:8000/docs** (when `DEBUG=true`).

---

## FastForge CLI (Rails-like app generator)

Generate new apps and scaffolds with the **fastforge** CLI (like `rails new` / `rails generate`).

```bash
# Install the CLI (from this repo)
pip install -e .

# Create a new app (like rails new my_app)
fastforge new demo_app
cd demo_app

# Install app dependencies and configure
pip install -r requirements.txt
cp .env.example .env
cp config/database.yml.example config/database.yml

# Generate model, controller, migration (like rails generate)
fastforge generate model User
fastforge generate controller Users
fastforge generate migration create_users

# Run migrations and server (like rails db:migrate / rails s)
fastforge migrate
fastforge runserver
```

| Command | Description |
|--------|-------------|
| `fastforge new &lt;app_name&gt;` | Create a new FastAPI app from template |
| `fastforge generate model User` | Create model, schema, and migration |
| `fastforge generate controller Users` | Create controller and routes (auto-loaded) |
| `fastforge generate migration create_users` | Create timestamped migration file |
| `fastforge migrate` | Run pending migrations |
| `fastforge runserver` | Start uvicorn with reload |
| `fastforge routes` | Print all registered routes |

Generated apps use **auto-loaded routes**: any `app/routes/*_routes.py` that defines a `router` is included automatically (no central routes file to edit).

---

## Tech stack

| Layer           | Technology                          |
|----------------|--------------------------------------|
| **Language**   | Python 3.11+                         |
| **Web**        | FastAPI, Uvicorn                     |
| **ORM**        | SQLAlchemy 2.0                       |
| **Migrations** | Alembic (timestamped, Rails-style)   |
| **Validation** | Pydantic v2                          |
| **Database**   | PostgreSQL (config via `database.yml`) |
| **Queue/Cache**| Redis                                |
| **Jobs**       | Celery (queues: default, mailers, critical, low_priority) |
| **Auth**       | JWT (python-jose), Passlib + bcrypt  |
| **CLI**        | Click (`manage.py`)                  |
| **Config**     | `.env` + `config/database.yml`       |
| **Testing**    | Pytest, HTTPX                        |

---

## Project structure

```
.
├── main.py                      # FastAPI app, lifespan, health check
├── manage.py                    # CLI: runserver, db, generate, routes, worker, shell
├── alembic.ini
├── requirements.txt
├── .env.example
│
├── config/
│   ├── settings.py              # Pydantic Settings from .env
│   ├── database.yml             # Rails-style DB config (development/test/production)
│   ├── database.yml.example     # Template for database.yml
│   ├── database_yml.py          # Loads database.yml, builds DATABASE_URL
│   ├── database.py              # Engine, SessionLocal, Base, get_db
│   ├── celery.py                # Celery app, queues, Beat
│   └── routes.py                # draw_routes(), resources(), namespace()
│
├── app/
│   ├── controllers/
│   │   ├── base_controller.py   # before_action, render_json, params
│   │   └── concerns/            # Authenticatable, Paginatable
│   ├── models/
│   │   ├── __init__.py          # Single place: import all models here (Rails convention)
│   │   ├── base_model.py        # Callbacks, save/destroy, find/create
│   │   └── concerns/            # Timestampable, SoftDeletable, Sluggable
│   ├── schemas/                 # Pydantic (validation/serialization only; CRUD via models)
│   ├── services/
│   │   └── base_service.py      # success() / failure()
│   ├── jobs/
│   │   └── base_job.py          # perform_later, retries, queues
│   ├── middleware/              # Auth (JWT → request.state.current_user), Logging
│   └── helpers/                 # jwt_helper, response_helper
│
├── db/
│   ├── migrations/
│   │   ├── env.py
│   │   └── versions/            # YYYYMMDD_HHMMSS_description.py
│   └── seeds.py                 # Override with your seed logic
│
└── tests/
    ├── conftest.py              # db, client fixtures
    └── test_health.py
```

---

## Conventions

- **Models** — Define in `app/models/<name>.py`, then **add to `app/models/__init__.py`**. Everywhere else: `from app.models import BaseModel, MyModel`. One place, app-wide (like Rails autoload).
- **CRUD** — Only through **SQLAlchemy models** (`Model.create(db, ...)`, `instance.save(db)`, `instance.destroy(db)`). Schemas are for **validation and serialization** only.
- **Database** — Use **`config/database.yml`** per environment; `APP_ENV` selects the section. Set `DATABASE_URL` in `.env` to override.
- **Routes** — All in **`config/routes.py`** via `draw_routes(app)`, `namespace()`, and `resources()`.

---

## Configuration

### Environment (`.env`)

Copy `.env.example` to `.env`. Key variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `APP_NAME` | Application name | `MyApp` |
| `APP_ENV` | `development` / `test` / `staging` / `production` | `development` |
| `DEBUG` | Enable `/docs`, `/redoc`, verbose logs | `true` |
| `SECRET_KEY` | App secret | — |
| `DATABASE_URL` | **Overrides** `database.yml` if set | (from database.yml) |
| `JWT_SECRET_KEY` | JWT signing key | — |
| `JWT_ALGORITHM` | JWT algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token TTL | `15` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token TTL | `7` |
| `REDIS_URL` | Redis connection | `redis://localhost:6379/0` |
| `CELERY_BROKER_URL` | Celery broker | `redis://localhost:6379/2` |
| `CELERY_RESULT_BACKEND` | Celery results | `redis://localhost:6379/2` |
| `DEFAULT_PAGE_SIZE` / `MAX_PAGE_SIZE` | Pagination | `20` / `100` |

### Database (`config/database.yml`)

Rails-style YAML. Copy from `config/database.yml.example`:

```yaml
default: &default
  adapter: postgresql
  encoding: utf8
  pool: 10
  timeout: 5000

development:
  <<: *default
  database: myapp_development
  username: postgres
  password: postgres
  host: localhost
  port: 5432

test:
  <<: *default
  database: myapp_test
  # ...

production:
  <<: *default
  database: myapp_production
  # ...
```

- **Selected by** `APP_ENV`. `config/database_yml.py` merges `default` + env section and builds `DATABASE_URL`.
- **Override** any time by setting `DATABASE_URL` in `.env`.

---

## Database

### Migrations (Alembic)

- **Location:** `db/migrations/versions/` with names like `YYYYMMDD_HHMMSS_description.py`.
- **Each file:** `revision`, `down_revision`, `upgrade()`, `downgrade()`.

| Command | Description |
|--------|-------------|
| `python manage.py db:migrate` | Run pending migrations |
| `python manage.py db:rollback` | Rollback one step |
| `python manage.py db:rollback --step=3` | Rollback 3 steps |
| `python manage.py db:rollback --to=<revision>` | Rollback to revision |
| `python manage.py db:status` | Current revision |
| `python manage.py db:history` | Migration history |
| `python manage.py db:seed` | Run `db/seeds.py` |
| `python manage.py db:reset` | Downgrade all → migrate → seed |

**Generate a new migration:**

```bash
python manage.py generate migration create_articles_table
# Creates db/migrations/versions/YYYYMMDD_HHMMSS_create_articles_table.py
```

### Seeds

`db/seeds.py` is a no-op by default. Override `run_seeds()` with your own logic and run:

```bash
python manage.py db:seed
```

---

## Running the app

| Command | Description |
|--------|-------------|
| `python manage.py runserver` | Start API (Uvicorn, reload) |
| `python manage.py runserver --port=8080` | Custom port |
| `python manage.py worker` | Celery worker (default queue) |
| `python manage.py worker --queue=mailers` | Worker for specific queue |
| `python manage.py scheduler` | Celery Beat |
| `python manage.py shell` | REPL with `db` and all `app.models` |
| `python manage.py routes` | List registered routes |

**Endpoints (framework default):**

- **GET `/health`** — Health check (no auth).
- **GET `/docs`**, **GET `/redoc`** — API docs when `DEBUG=true`.

Add your own routes in `config/routes.py` inside `draw_routes(app)`.

---

## CLI reference

### Server

| Command | Description |
|---------|-------------|
| `python manage.py runserver` | Start Uvicorn with reload |
| `python manage.py runserver --port=PORT` | Custom port |
| `python manage.py runserver --host=HOST` | Custom host |

### Database

| Command | Description |
|---------|-------------|
| `db:migrate` | `alembic upgrade head` |
| `db:rollback` | Rollback 1 migration |
| `db:rollback --step=N` | Rollback N migrations |
| `db:rollback --to=REV` | Rollback to revision |
| `db:status` | Current revision |
| `db:history` | Full history |
| `db:seed` | Run `db/seeds.py` |
| `db:reset` | Downgrade all → migrate → seed |

### Generators

| Command | Description |
|---------|-------------|
| `generate migration <name>` | New migration in `db/migrations/versions/` |
| `generate controller <name>` | New controller in `app/controllers/` |
| `generate model <name>` | New model in `app/models/` |
| `generate job <name>` | New job in `app/jobs/` |
| `generate service <name>` | New service in `app/services/` |

### Other

| Command | Description |
|---------|-------------|
| `routes` | Print all routes (method, path) |
| `worker` | Start Celery worker |
| `worker --queue=NAME` | Worker for one queue |
| `scheduler` | Start Celery Beat |
| `shell` | REPL with `db` and every symbol from `app.models` |

---

## Architecture

### Models (SQLAlchemy only for CRUD)

- **Base:** `BaseModel` (from `config.database.Base`).
- **Callbacks:** `@before_save`, `@after_save`, `@after_create`, `@before_destroy`, `@after_destroy`.
- **Instance:** `save(db)`, `destroy(db)`, `update(db, **kwargs)`, `to_dict()`, `reload(db)`.
- **Class:** `find(db, id)`, `find_by(db, **kwargs)`, `where(db, **kwargs)`, `all(db)`, `create(db, **kwargs)`.
- **Concerns:** `Timestampable`, `SoftDeletable`, `Sluggable` (mixins for columns and helpers).

**Always import from the single entrypoint:**

```python
from app.models import BaseModel, Timestampable, MyModel  # add MyModel in app/models/__init__.py
```

### Controllers

- **Base:** `BaseController(request, db)` with `params`, `render_json()`, `render_error()`.
- **Filters:** `@before_action(only=[...], except_list=[...])`, `@after_action`, `@skip_before_action`.
- **Concerns:** `Authenticatable` (`authenticate_user`, `require_admin`, `require_owner`), `Paginatable` (`paginate`).
- **Auth:** `request.state.current_user` is set by middleware (JWT payload dict or your own logic). No model import in middleware.

### Services

- **Base:** `BaseService(db)` with `success(data)` and `failure(error)`.
- Use for business logic; controllers call services and return `render_json(service.result)`.

### Jobs (Celery)

- **Base:** `BaseJob` with `perform(**kwargs)`, `perform_later(**kwargs)`, `perform_now(**kwargs)`, `on_failure(exc, kwargs)`.
- Set `queue`, `retry_limit`, `retry_delay` on the subclass. Register the task in `config/celery.py` `include=[]` and (optional) `beat_schedule` in `config/settings.py`.

### Routing

- **File:** `config/routes.py`; **function:** `draw_routes(app)`.
- **Helpers:** `namespace(app, "/api/v1")` yields a router; `resources(router, "/articles", ArticlesController)` registers index/show/create/update/destroy.
- Path params are on `request.state.path_params`; filters run before the action.

---

## Testing

- **DB:** In-memory SQLite by default (`DATABASE_URL` / `TEST_DATABASE_URL` in test run).
- **Fixtures:** `db` (session, create/drop tables per test), `client` (TestClient with overridden `get_db`).

```bash
pytest tests/ -v
```

**With coverage:**

```bash
pip install pytest-cov
pytest tests/ -v --cov=app --cov-report=term-missing
```

**Included:** `tests/test_health.py` — GET `/health` returns 200. Add your own tests and fixtures (e.g. authenticated client, model factories) in `conftest.py` and new `test_*.py` files.

---

## Adding your first resources

### 1. Model

Create `app/models/article.py`:

```python
from sqlalchemy.orm import Mapped, mapped_column
from app.models import BaseModel

class Article(BaseModel):
    __tablename__ = "articles"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(nullable=False)
    body: Mapped[str] = mapped_column(nullable=False)
```

Add to **`app/models/__init__.py`**:

```python
from app.models.article import Article
__all__ = [..., "Article"]
```

### 2. Migration

```bash
python manage.py generate migration create_articles_table
# Edit db/migrations/versions/YYYYMMDD_HHMMSS_create_articles_table.py: add op.create_table(...)
python manage.py db:migrate
```

### 3. Controller and routes

Create `app/controllers/articles_controller.py` (inherit `BaseController`, implement `index`, `show`, `create`, `update`, `destroy`). In **`config/routes.py`** inside `draw_routes(app)`:

```python
from app.controllers.articles_controller import ArticlesController
with namespace(app, "/api/v1") as router:
    resources(router, "/articles", ArticlesController)
```

### 4. Optional: service and schemas

- **Service:** `app/services/article_service.py` inheriting `BaseService`, used by the controller.
- **Schemas:** Pydantic models in `app/schemas/` for request/response validation; keep **all persistence in models** (`Article.create(db, ...)`, `article.save(db)`).

---

## Deployment

1. **Environment**
   - `APP_ENV=production`, `DEBUG=false`.
   - Strong `SECRET_KEY` and `JWT_SECRET_KEY`.
   - Production `config/database.yml` (or `DATABASE_URL`), `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`, `REDIS_URL`.

2. **Processes**
   - **API:** e.g. `gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000`
   - **Workers:** one or more Celery workers; one Beat process if using scheduled tasks.

3. **Database**
   - `python manage.py db:migrate`
   - Optionally run your seeds once: `python manage.py db:seed`

4. **Security**
   - Restrict CORS in `main.py` (e.g. from settings). Use HTTPS in production.

---

## License

Use as a base for your own projects. Adjust naming and licensing as needed.

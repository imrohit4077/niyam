#!/usr/bin/env python3
"""
Manual test runner: DB, config, routes, API, models, CLI.
Run from project root: DATABASE_URL=sqlite:///./test_manual.db python scripts/test_manual.py
"""

import os
import sys

os.environ.setdefault("DATABASE_URL", "sqlite:///./test_manual.db")
os.environ.setdefault("APP_ENV", "development")
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def ok(name: str) -> None:
    print(f"  [OK] {name}")

def fail(name: str, e: Exception) -> None:
    print(f"  [FAIL] {name}: {e}")
    raise SystemExit(1)

print("=== 1. Database YML & URL ====")
try:
    from config.database_yml import get_database_config, build_database_url
    cfg = get_database_config()
    url = build_database_url()
    ok("database_yml load + build_database_url")
except Exception as e:
    fail("database_yml", e)

print("\n=== 2. Database connection ====")
try:
    from config.database import engine, SessionLocal, Base, get_db
    from sqlalchemy import text
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    db = SessionLocal()
    db.execute(text("SELECT 1"))
    db.close()
    ok("engine + SessionLocal")
except Exception as e:
    fail("database connection", e)

print("\n=== 3. Models (app.models) ====")
try:
    from app.models import BaseModel, Timestampable, SoftDeletable, Sluggable
    ok("app.models import")
except Exception as e:
    fail("models", e)

print("\n=== 4. BaseModel CRUD ====")
try:
    from config.database import Base, engine, SessionLocal
    from sqlalchemy.orm import Mapped, mapped_column
    from app.models.base_model import BaseModel as BM
    class _T(BM):
        __tablename__ = "_manual_test"
        __table_args__ = {"extend_existing": True}
        id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
        name: Mapped[str] = mapped_column(nullable=False)
    Base.metadata.create_all(engine)
    db = SessionLocal()
    o = _T.create(db, name="x")
    assert _T.find(db, o.id).name == "x"
    o.update(db, name="y")
    assert _T.find_by(db, id=o.id).name == "y"
    o.destroy(db)
    assert _T.find_by(db, id=o.id) is None
    db.close()
    Base.metadata.drop_all(engine)
    ok("create/find/update/destroy")
except Exception as e:
    fail("BaseModel CRUD", e)

print("\n=== 5. App & routes ====")
try:
    from main import app
    routes = [r for r in app.routes if hasattr(r, "path")]
    assert any(r.path == "/health" for r in routes)
    ok(f"app + routes ({len(routes)} routes)")
except Exception as e:
    fail("app/routes", e)

print("\n=== 6. API /health ====")
try:
    from fastapi.testclient import TestClient
    client = TestClient(app)
    r = client.get("/health")
    assert r.status_code == 200 and r.json().get("status") == "ok"
    ok("GET /health")
except Exception as e:
    fail("/health", e)

print("\n=== 7. Controllers, helpers, services, jobs, schemas ====")
try:
    from app.controllers.base_controller import BaseController
    from app.controllers.concerns.authenticatable import Authenticatable
    from app.controllers.concerns.paginatable import Paginatable
    from app.helpers.jwt_helper import JWTHelper
    from app.helpers.response_helper import success_response, error_response
    from app.services.base_service import BaseService
    from app.jobs.base_job import BaseJob
    from app.schemas import PaginationMeta
    ok("controllers, helpers, services, jobs, schemas")
except Exception as e:
    fail("imports", e)

print("\n=== 8. Pytest ====")
try:
    import subprocess
    r = subprocess.run(
        [sys.executable, "-m", "pytest", "tests/", "-v", "--tb=no", "-q"],
        cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        capture_output=True,
        text=True,
        env={**os.environ, "DATABASE_URL": "sqlite:///:memory:"},
    )
    if r.returncode != 0:
        print(r.stdout or r.stderr)
        fail("pytest", Exception("tests failed"))
    ok("pytest")
except Exception as e:
    fail("pytest", e)

print("\n=== All manual checks passed ===")

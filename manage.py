#!/usr/bin/env python3
"""
CLI manager. Rails equivalent: bin/rails / rails runner
Commands: runserver, generate migration|controller|model|job|service, db:migrate|rollback|status|history|seed|reset, routes, worker, scheduler, shell.
"""

import os
import sys
import subprocess
from datetime import datetime, timezone

import click

# Ensure project root is on path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


@click.group()
def cli() -> None:
    """MyApp CLI - Rails-style management."""
    pass


@cli.command()
@click.option("--port", default=8000, help="Port to run on.")
@click.option("--host", default="0.0.0.0", help="Host to bind.")
def runserver(host: str, port: int) -> None:
    """Start uvicorn with reload. Like rails s."""
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    subprocess.run(["uvicorn", "main:app", "--host", host, "--port", str(port), "--reload"], check=True)


@cli.group("db")
def db_cmd() -> None:
    """Database and migration commands."""
    pass


@db_cmd.command("create")
def db_create() -> None:
    """Create the database defined in config/database.yml for current APP_ENV (like rails db:create)."""
    from sqlalchemy import create_engine, text

    from config.database_yml import get_database_config, build_database_url

    config = get_database_config()
    db_name = config.get("database")
    if not db_name:
        raise click.ClickException("No 'database' key found in config/database.yml for current APP_ENV.")

    maintenance_db = config.get("maintenance_database", "postgres")
    admin_config = {**config, "database": maintenance_db}
    admin_url = build_database_url(admin_config)

    engine = create_engine(admin_url, isolation_level="AUTOCOMMIT")
    with engine.connect() as conn:
        exists = conn.execute(
            text("SELECT 1 FROM pg_database WHERE datname = :name"),
            {"name": db_name},
        ).scalar()
        if exists:
            click.echo(f"Database '{db_name}' already exists.")
            return

        conn.execute(text(f'CREATE DATABASE "{db_name}"'))
        click.echo(f"Database '{db_name}' created.")


@db_cmd.command("migrate")
def db_migrate() -> None:
    """Run pending migrations (alembic upgrade head)."""
    cwd = os.path.dirname(os.path.abspath(__file__))
    click.echo("Running migrations (alembic upgrade head)...")
    subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], check=True, cwd=cwd)
    # Sync Rails-style schema_migrations table with all revisions up to head.
    try:
        from alembic.config import Config
        from alembic.script import ScriptDirectory
        from sqlalchemy import text, create_engine

        from config.database_yml import build_database_url

        # Discover full linear history up to current head
        ac = Config(os.path.join(cwd, "alembic.ini"))
        script = ScriptDirectory.from_config(ac)
        head = script.get_current_head()
        if head is not None:
            rev = script.get_revision(head)
            revisions: list[str] = []
            while rev is not None:
                revisions.append(rev.revision)
                if not rev.down_revision:
                    break
                rev = script.get_revision(rev.down_revision)
            revisions.reverse()

            engine = create_engine(build_database_url())
            with engine.begin() as conn:
                # Create schema_migrations table if it does not exist
                conn.execute(
                    text(
                        """
                        CREATE TABLE IF NOT EXISTS schema_migrations (
                            version VARCHAR(255) PRIMARY KEY,
                            applied_at TIMESTAMPTZ DEFAULT now() NOT NULL
                        )
                        """
                    )
                )
                existing = {
                    row[0]
                    for row in conn.execute(text("SELECT version FROM schema_migrations"))
                }
                for rev_id in revisions:
                    if rev_id not in existing:
                        conn.execute(
                            text("INSERT INTO schema_migrations (version) VALUES (:v)"),
                            {"v": rev_id},
                        )
    except Exception as exc:  # pragma: no cover - best-effort, do not break migrations
        click.echo(f"Warning: could not sync schema_migrations: {exc}", err=True)

    # Show current revision and a friendly message
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "current"],
        check=True,
        cwd=cwd,
        capture_output=True,
        text=True,
    )
    output = result.stdout.strip()
    if "(head)" in output:
        click.echo("All migrations are up to date (at head).")
    click.echo(output)


@db_cmd.command("rollback")
@click.option("--step", default=1, help="Number of migrations to roll back.")
@click.option("--to", "to_rev", default=None, help="Revision to roll back to.")
def db_rollback(step: int, to_rev: str | None) -> None:
    """Roll back migrations (alembic downgrade)."""
    cwd = os.path.dirname(os.path.abspath(__file__))
    if to_rev:
        subprocess.run([sys.executable, "-m", "alembic", "downgrade", to_rev], check=True, cwd=cwd)
    else:
        subprocess.run([sys.executable, "-m", "alembic", "downgrade", f"-{step}"], check=True, cwd=cwd)


@db_cmd.command("status")
def db_status() -> None:
    """Show current migration status."""
    subprocess.run([sys.executable, "-m", "alembic", "current"], cwd=os.path.dirname(os.path.abspath(__file__)))


@db_cmd.command("history")
def db_history() -> None:
    """Show migration history."""
    subprocess.run([sys.executable, "-m", "alembic", "history"], cwd=os.path.dirname(os.path.abspath(__file__)))


@db_cmd.command("seed")
def db_seed() -> None:
    """Run db/seeds.py."""
    import db.seeds
    db.seeds.run_seeds()


@db_cmd.command("reset")
def db_reset() -> None:
    """Full reset: downgrade all, upgrade, seed."""
    cwd = os.path.dirname(os.path.abspath(__file__))
    subprocess.run([sys.executable, "-m", "alembic", "downgrade", "base"], check=True, cwd=cwd)
    subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], check=True, cwd=cwd)
    import db.seeds
    db.seeds.run_seeds()
    click.echo("Reset complete.")


@cli.group("generate")
def generate_cmd() -> None:
    """Generate migration, controller, model, job, service."""
    pass


def _timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")


@generate_cmd.command("migration")
@click.argument("name", nargs=1)
def generate_migration(name: str) -> None:
    """Create timestamped migration file: db/migrations/versions/YYYYMMDD_HHMMSS_name.py"""
    ts = _timestamp()
    safe_name = name.replace(" ", "_").replace("-", "_")
    filename = f"{ts}_{safe_name}.py"
    versions_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "db", "migrations", "versions")
    os.makedirs(versions_dir, exist_ok=True)
    path = os.path.join(versions_dir, filename)
    # Infer revision chain: get head revision from alembic
    try:
        from alembic.config import Config
        from alembic.script import ScriptDirectory
        ac = Config(os.path.join(os.path.dirname(os.path.abspath(__file__)), "alembic.ini"))
        script = ScriptDirectory.from_config(ac)
        head = script.get_current_head()
        down_rev_line = f'down_revision = "{head}"' if head else "down_revision = None"
    except Exception:
        down_rev_line = "down_revision = None"
    revision = ts
    content = f'''"""
{name}.
Revision: {revision}
"""

from alembic import op
import sqlalchemy as sa

revision = "{revision}"
{down_rev_line}
branch_labels = None
depends_on = None


def upgrade() -> None:
    # TODO: implement
    pass


def downgrade() -> None:
    # TODO: implement
    pass
'''
    with open(path, "w") as f:
        f.write(content)
    click.echo(f"Created {path}")


@generate_cmd.command("controller")
@click.argument("name", nargs=1)
def generate_controller(name: str) -> None:
    """Scaffold controller file app/controllers/{name}_controller.py."""
    class_name = "".join(w.capitalize() for w in name.split("_")) + "Controller"
    path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "app", "controllers", f"{name}_controller.py",
    )
    content = f'''"""
{class_name}. Rails equivalent: app/controllers/{name}_controller.rb
"""

from fastapi import Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.controllers.base_controller import BaseController


class {class_name}(BaseController):
    """TODO: add before_actions and actions."""

    def index(self) -> JSONResponse:
        return self.render_json({{}})

    def show(self) -> JSONResponse:
        return self.render_json({{}})

    async def create(self) -> JSONResponse:
        return self.render_json({{}}, status=201)

    async def update(self) -> JSONResponse:
        return self.render_json({{}})

    def destroy(self) -> JSONResponse:
        return self.render_json({{"deleted": True}})
'''
    with open(path, "w") as f:
        f.write(content)
    click.echo(f"Created {path}")


@generate_cmd.command("model")
@click.argument("name", nargs=1)
def generate_model(name: str) -> None:
    """Scaffold model file app/models/{name}.py."""
    class_name = "".join(w.capitalize() for w in name.split("_"))
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app", "models", f"{name}.py")
    content = f'''"""
{class_name} model. Rails equivalent: app/models/{name}.rb
"""

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base_model import BaseModel


class {class_name}(BaseModel):
    __tablename__ = "{name}s"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    # TODO: add columns
'''
    with open(path, "w") as f:
        f.write(content)
    click.echo(f"Created {path}")


@generate_cmd.command("job")
@click.argument("name", nargs=1)
def generate_job(name: str) -> None:
    """Scaffold job file app/jobs/{name}_job.py."""
    class_name = "".join(w.capitalize() for w in name.split("_")) + "Job"
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app", "jobs", f"{name}_job.py")
    content = f'''"""
{class_name}. Rails equivalent: app/jobs/{name}_job.rb
"""

from config.celery import celery_app
from app.jobs.base_job import BaseJob


@celery_app.task(bind=True, max_retries=3, queue="default", name="app.jobs.{name}_job.{class_name}.run")
def _task(self, **kwargs):
    return {class_name}().perform(**kwargs)


class {class_name}(BaseJob):
    def perform(self, **kwargs):
        # TODO: implement
        pass
'''
    with open(path, "w") as f:
        f.write(content)
    click.echo(f"Created {path}")


@generate_cmd.command("service")
@click.argument("name", nargs=1)
def generate_service(name: str) -> None:
    """Scaffold service file app/services/{name}_service.py."""
    class_name = "".join(w.capitalize() for w in name.split("_")) + "Service"
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app", "services", f"{name}_service.py")
    content = f'''"""
{class_name}. Rails equivalent: app/services/{name}_service.rb
"""

from app.services.base_service import BaseService


class {class_name}(BaseService):
    def __init__(self, db):
        super().__init__(db)
        # TODO: implement methods
'''
    with open(path, "w") as f:
        f.write(content)
    click.echo(f"Created {path}")


@cli.command()
def routes() -> None:
    """Print all registered routes (like rails routes)."""
    from main import app
    for route in app.routes:
        if hasattr(route, "methods") and hasattr(route, "path"):
            for method in route.methods:
                if method != "HEAD":
                    handler = getattr(route, "endpoint", route)
                    name = getattr(handler, "__name__", "—")
                    click.echo(f"{method:6} {route.path:30} {name}")


@cli.command()
@click.option("--queue", default="default", help="Queue to consume.")
def worker(queue: str) -> None:
    """Start Celery worker. Like sidekiq."""
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    subprocess.run(["celery", "-A", "config.celery", "worker", "-Q", queue, "-l", "info"], check=True)


@cli.command()
def scheduler() -> None:
    """Start Celery Beat scheduler."""
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    subprocess.run(["celery", "-A", "config.celery", "beat", "-l", "info"], check=True)


@cli.command()
def shell() -> None:
    """Python REPL with app context (db and all models from app.models)."""
    from config.database import SessionLocal
    from app import models as app_models
    db = SessionLocal()
    names = [x for x in dir(app_models) if not x.startswith("_")]
    print("Available: db,", ", ".join(names))
    try:
        import code
        code.interact(local={"db": db, **{n: getattr(app_models, n) for n in names}})
    finally:
        db.close()


def _normalize_rails_style_args() -> None:
    """
    Support Rails-style commands like:
      python manage.py db:create
      python manage.py db:migrate
      python manage.py db:seed

    by rewriting argv to Click's group syntax:
      python manage.py db create
    """
    if len(sys.argv) < 2:
        return
    cmd = sys.argv[1]
    if ":" not in cmd:
        return
    group, sub = cmd.split(":", 1)
    # Only handle known groups; currently just "db"
    if group == "db" and sub:
        sys.argv = [sys.argv[0], group, sub, *sys.argv[2:]]


if __name__ == "__main__":
    _normalize_rails_style_args()
    cli()

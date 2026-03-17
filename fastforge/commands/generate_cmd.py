"""fastforge generate model|controller|migration — scaffold files."""

from datetime import datetime
from pathlib import Path
import re

import click


def _timestamp() -> str:
    """Rails-style timestamp: 202603091230."""
    return datetime.utcnow().strftime("%Y%m%d%H%M%S")


def _pascal(name: str) -> str:
    """user -> User, users -> User (singular for model)."""
    s = re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")
    return "".join(w.capitalize() for w in s.split("_"))


def _snake(name: str) -> str:
    """User -> user, Users -> users."""
    s = re.sub(r"(?<=[a-z])([A-Z])|([A-Z])(?=[a-z])", r"_\1\2", name).strip("_").lower()
    return s


def _plural_snake(name: str) -> str:
    """User -> users."""
    s = _snake(name)
    if s.endswith("s"):
        return s
    if s.endswith("y") and len(s) > 1 and s[-2] not in "aeiou":
        return s[:-1] + "ies"
    return s + "s"


def generate_group(root: Path, kind: str, name: str) -> None:
    if kind == "model":
        _generate_model(root, name)
    elif kind == "controller":
        _generate_controller(root, name)
    elif kind == "migration":
        _generate_migration(root, name)
    else:
        click.echo(f"Unknown generator: {kind}", err=True)
        raise SystemExit(1)


def _generate_model(root: Path, name: str) -> None:
    snake = _snake(name)
    pascal = _pascal(name)
    table = _plural_snake(name)

    models_dir = root / "app" / "models"
    models_dir.mkdir(parents=True, exist_ok=True)
    model_path = models_dir / f"{snake}.py"
    if model_path.exists():
        click.echo(f"Model already exists: {model_path}", err=True)
    else:
        model_content = f'''"""
{pascal} model. Rails equivalent: app/models/{snake}.rb
"""

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base_model import BaseModel


class {pascal}(BaseModel):
    __tablename__ = "{table}"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    # TODO: add columns
'''
        model_path.write_text(model_content, encoding="utf-8")
        click.echo(f"Created {model_path}")

    init_path = root / "app" / "models" / "__init__.py"
    if init_path.exists():
        init_content = init_path.read_text(encoding="utf-8")
        if f"from app.models.{snake} import {pascal}" not in init_content:
            if "from app.models.base_model import BaseModel" in init_content and "__all__" in init_content:
                init_content = init_content.replace(
                    "from app.models.base_model import BaseModel\n\n__all__",
                    f"from app.models.base_model import BaseModel\nfrom app.models.{snake} import {pascal}\n\n__all__",
                    1,
                )
                init_content = init_content.replace(
                    '"BaseModel"]',
                    f'"BaseModel", "{pascal}"]',
                    1,
                )
            else:
                init_content = init_content.rstrip() + f"\nfrom app.models.{snake} import {pascal}\n"
            init_path.write_text(init_content, encoding="utf-8")
            click.echo(f"Updated {init_path}")

    schemas_dir = root / "app" / "schemas"
    schemas_dir.mkdir(parents=True, exist_ok=True)
    schema_path = schemas_dir / f"{snake}_schema.py"
    if schema_path.exists():
        click.echo(f"Schema already exists: {schema_path}", err=True)
    else:
        schema_content = f'''"""
Pydantic schemas for {pascal}.
"""

from pydantic import BaseModel


class {pascal}Base(BaseModel):
    pass


class {pascal}Create({pascal}Base):
    pass


class {pascal}Update({pascal}Base):
    pass


class {pascal}Response({pascal}Base):
    id: int

    class Config:
        from_attributes = True
'''
        schema_path.write_text(schema_content, encoding="utf-8")
        click.echo(f"Created {schema_path}")

    versions_dir = root / "db" / "migrations" / "versions"
    versions_dir.mkdir(parents=True, exist_ok=True)
    ts = _timestamp()
    migration_name = f"create_{table}"
    migration_filename = f"{ts}_{migration_name}.py"
    migration_path = versions_dir / migration_filename

    down_rev = "None"
    try:
        from alembic.config import Config
        from alembic.script import ScriptDirectory
        ac = Config(str(root / "alembic.ini"))
        script = ScriptDirectory.from_config(ac)
        head = script.get_current_head()
        if head:
            down_rev = f'"{head}"'
    except Exception:
        pass

    migration_content = f'''"""
{migration_name}. Revision: {ts}
"""

from alembic import op
import sqlalchemy as sa

revision = "{ts}"
down_revision = {down_rev}
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "{table}",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("{table}")
'''
    migration_path.write_text(migration_content, encoding="utf-8")
    click.echo(f"Created {migration_path}")


def _generate_controller(root: Path, name: str) -> None:
    snake = _snake(name)
    pascal = _pascal(name)
    controller_class = f"{pascal}Controller"
    route_path_segment = _plural_snake(name)

    controllers_dir = root / "app" / "controllers"
    controllers_dir.mkdir(parents=True, exist_ok=True)
    controller_path = controllers_dir / f"{snake}_controller.py"
    if controller_path.exists():
        click.echo(f"Controller already exists: {controller_path}", err=True)
    else:
        controller_content = f'''"""
{controller_class}. Rails equivalent: app/controllers/{snake}_controller.rb
"""

from fastapi import Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.controllers.base_controller import BaseController


class {controller_class}(BaseController):
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
        controller_path.write_text(controller_content, encoding="utf-8")
        click.echo(f"Created {controller_path}")

    routes_dir = root / "app" / "routes"
    routes_dir.mkdir(parents=True, exist_ok=True)
    routes_path = routes_dir / f"{snake}_routes.py"
    if routes_path.exists():
        click.echo(f"Routes file already exists: {routes_path}", err=True)
    else:
        routes_content = f'''"""
Routes for {pascal}. Auto-loaded by main.py.
"""

from fastapi import APIRouter

from config.routes import resources
from app.controllers.{snake}_controller import {controller_class}

router = APIRouter(prefix="/api/v1")
resources(router, "/{route_path_segment}", {controller_class})
'''
        routes_path.write_text(routes_content, encoding="utf-8")
        click.echo(f"Created {routes_path}")


def _generate_migration(root: Path, name: str) -> None:
    safe_name = name.replace(" ", "_").replace("-", "_")
    ts = _timestamp()
    versions_dir = root / "db" / "migrations" / "versions"
    versions_dir.mkdir(parents=True, exist_ok=True)
    migration_path = versions_dir / f"{ts}_{safe_name}.py"

    down_rev = "None"
    try:
        from alembic.config import Config
        from alembic.script import ScriptDirectory
        ac = Config(str(root / "alembic.ini"))
        script = ScriptDirectory.from_config(ac)
        head = script.get_current_head()
        if head:
            down_rev = f'"{head}"'
    except Exception:
        pass

    content = f'''"""
{safe_name}. Revision: {ts}
"""

from alembic import op
import sqlalchemy as sa

revision = "{ts}"
down_revision = {down_rev}
branch_labels = None
depends_on = None


def upgrade() -> None:
    # TODO: implement
    pass


def downgrade() -> None:
    # TODO: implement
    pass
'''
    migration_path.write_text(content, encoding="utf-8")
    click.echo(f"Created {migration_path}")

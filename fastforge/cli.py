"""
FastForge CLI. Rails equivalent: bin/rails.
Commands: new, generate (model, controller, migration), migrate, runserver, routes.
"""

import sys
from pathlib import Path

import click

from fastforge import __version__
from fastforge.commands.new_cmd import new_app
from fastforge.commands.generate_cmd import generate_group
from fastforge.commands.migrate_cmd import migrate
from fastforge.commands.runserver_cmd import runserver
from fastforge.commands.routes_cmd import routes_cmd


def _find_app_root() -> Path | None:
    """Find fastforge app root (directory containing main.py and config/settings.py)."""
    cwd = Path.cwd()
    for path in [cwd, *cwd.parents]:
        if (path / "main.py").is_file() and (path / "config" / "settings.py").is_file():
            return path
    return None


def _require_app_root() -> Path:
    """Return app root or exit with error."""
    root = _find_app_root()
    if not root:
        click.echo("Not inside a FastForge app. Run this from your app directory (or run 'fastforge new my_app' first).", err=True)
        sys.exit(1)
    return root


@click.group()
@click.version_option(version=__version__, prog_name="fastforge")
def cli() -> None:
    """FastForge — Rails-like CLI for FastAPI. Generate apps and scaffolds."""
    pass


@cli.command("new")
@click.argument("app_name", required=True)
@click.option("--path", type=click.Path(), default=".", help="Directory to create app in (default: current).")
def new(app_name: str, path: str) -> None:
    """Create a new FastAPI app (like rails new my_app)."""
    new_app(app_name, Path(path))


@cli.group("generate")
def generate() -> None:
    """Generate model, controller, or migration (like rails generate)."""
    pass


@generate.command("model")
@click.argument("name", required=True)
def generate_model(name: str) -> None:
    """Generate model, schema, and migration. Example: fastforge generate model User."""
    generate_group(_require_app_root(), "model", name)


@generate.command("controller")
@click.argument("name", required=True)
def generate_controller(name: str) -> None:
    """Generate controller and routes. Example: fastforge generate controller Users."""
    generate_group(_require_app_root(), "controller", name)


@generate.command("migration")
@click.argument("name", required=True)
def generate_migration(name: str) -> None:
    """Generate timestamped migration. Example: fastforge generate migration create_users."""
    generate_group(_require_app_root(), "migration", name)


@cli.command("migrate")
def migrate_cmd() -> None:
    """Run pending migrations (like rails db:migrate)."""
    migrate(_require_app_root())


@cli.command("runserver")
@click.option("--port", default=8000, help="Port to run on.")
@click.option("--host", default="0.0.0.0", help="Host to bind.")
def runserver_cmd(host: str, port: int) -> None:
    """Start uvicorn with reload (like rails s)."""
    runserver(_require_app_root(), host=host, port=port)


@cli.command("routes")
def routes() -> None:
    """Print all registered routes (like rails routes)."""
    routes_cmd(_require_app_root())


def main() -> None:
    cli()


if __name__ == "__main__":
    main()

"""fastforge new <app_name> — copy template to destination."""

import re
import shutil
from pathlib import Path

import click

# Template lives next to this file
TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates" / "app"


def _snake_to_pascal(s: str) -> str:
    """demo_app -> DemoApp."""
    return "".join(w.capitalize() for w in re.sub(r"[^a-z0-9]+", "_", s.lower()).strip("_").split("_"))


def _replace_placeholders(content: str, app_name: str, app_name_pascal: str) -> str:
    """Replace {{APP_NAME}} and {{APP_NAME_SNAKE}} in template files."""
    return content.replace("{{APP_NAME}}", app_name_pascal).replace("{{APP_NAME_SNAKE}}", app_name)


def new_app(app_name: str, base_path: Path) -> None:
    """Generate a new FastForge app by copying the template and substituting app name."""
    if not TEMPLATE_DIR.is_dir():
        click.echo(f"Template not found: {TEMPLATE_DIR}", err=True)
        raise SystemExit(1)

    app_name_snake = re.sub(r"[^a-z0-9]+", "_", app_name.lower()).strip("_")
    app_name_pascal = _snake_to_pascal(app_name_snake)
    destination = base_path.resolve() / app_name_snake

    if destination.exists():
        click.echo(f"Destination already exists: {destination}", err=True)
        raise SystemExit(1)

    destination.mkdir(parents=True, exist_ok=False)

    def copy_and_substitute(src: Path, dest: Path) -> None:
        if src.is_file():
            dest.parent.mkdir(parents=True, exist_ok=True)
            if src.suffix in (".py", ".yml", ".yaml", ".ini", ".txt", ".example", ".md", ".toml") or src.name.startswith(".env"):
                text = src.read_text(encoding="utf-8", errors="replace")
                text = _replace_placeholders(text, app_name_snake, app_name_pascal)
                dest.write_text(text, encoding="utf-8")
            else:
                shutil.copy2(src, dest)
        elif src.is_dir() and src.name != "__pycache__":
            dest.mkdir(parents=True, exist_ok=True)
            for child in src.iterdir():
                copy_and_substitute(child, dest / child.name)

    for item in TEMPLATE_DIR.iterdir():
        copy_and_substitute(item, destination / item.name)

    click.echo(f"Created FastForge app at {destination}")
    click.echo("")
    click.echo("Next steps:")
    click.echo(f"  cd {app_name_snake}")
    click.echo("  pip install -r requirements.txt")
    click.echo("  cp .env.example .env")
    click.echo("  cp config/database.yml.example config/database.yml")
    click.echo("  fastforge generate model User")
    click.echo("  fastforge generate controller Users")
    click.echo("  fastforge generate migration create_users")
    click.echo("  fastforge migrate")
    click.echo("  fastforge runserver")

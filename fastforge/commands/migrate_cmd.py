"""fastforge migrate — run alembic upgrade head."""

import subprocess
import sys
from pathlib import Path

import click


def migrate(root: Path) -> None:
    """Run pending migrations (alembic upgrade head)."""
    subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        check=True,
        cwd=str(root),
    )
    click.echo("Migrations complete.")

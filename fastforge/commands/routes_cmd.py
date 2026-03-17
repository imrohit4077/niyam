"""fastforge routes — print registered routes."""

import os
import sys
from pathlib import Path

import click


def routes_cmd(root: Path) -> None:
    """Print all registered routes (like rails routes)."""
    root = Path(root).resolve()
    prev_cwd = os.getcwd()
    sys.path.insert(0, str(root))
    try:
        os.chdir(root)
        from main import app
        for route in app.routes:
            if hasattr(route, "methods") and hasattr(route, "path"):
                for method in route.methods:
                    if method != "HEAD":
                        handler = getattr(route, "endpoint", route)
                        name = getattr(handler, "__name__", "—")
                        click.echo(f"{method:6} {route.path:40} {name}")
    finally:
        os.chdir(prev_cwd)
        if str(root) in sys.path:
            sys.path.remove(str(root))

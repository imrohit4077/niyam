"""fastforge runserver — start uvicorn with reload."""

import subprocess
import sys
from pathlib import Path


def runserver(root: Path, host: str = "0.0.0.0", port: int = 8000) -> None:
    """Start uvicorn with reload (like rails s)."""
    subprocess.run(
        [
            sys.executable, "-m", "uvicorn",
            "main:app",
            "--host", host,
            "--port", str(port),
            "--reload",
        ],
        check=True,
        cwd=str(root),
    )

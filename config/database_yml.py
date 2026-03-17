"""
Database configuration from database.yml (Rails convention).
Loads config/database.yml and builds DATABASE_URL for the current APP_ENV.
"""

import os
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError:
    yaml = None  # type: ignore

# Project root: parent of config/
CONFIG_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CONFIG_DIR.parent
DATABASE_YML = CONFIG_DIR / "database.yml"


def _load_yml() -> dict[str, Any]:
    """Load database.yml. Returns {} if file missing or YAML unavailable."""
    if not yaml:
        return {}
    if not DATABASE_YML.exists():
        return {}
    with open(DATABASE_YML) as f:
        data = yaml.safe_load(f)
    return data or {}


def get_database_config(env: str | None = None) -> dict[str, Any]:
    """
    Get database config for the given environment (Rails: config/database.yml).
    env defaults to APP_ENV or 'development'. Returns merged default + env section.
    """
    data = _load_yml()
    default = data.get("default", {})
    if env is None:
        env = os.environ.get("APP_ENV", "development")
    env_config = data.get(env, data.get("development", {}))
    if isinstance(env_config, dict) and isinstance(default, dict):
        merged = {**default, **env_config}
    else:
        merged = env_config if isinstance(env_config, dict) else {}
    return merged


def build_database_url(config: dict[str, Any] | None = None) -> str:
    """
    Build SQLAlchemy DATABASE_URL from database.yml-style config.
    If config is None, loads from get_database_config().
    Env var DATABASE_URL overrides if set.
    """
    url = os.environ.get("DATABASE_URL", "").strip()
    if url:
        return url
    if config is None:
        config = get_database_config()
    adapter = (config.get("adapter") or "postgresql").replace("postgresql", "postgresql")
    if adapter == "postgresql":
        adapter = "postgresql"
    username = config.get("username", "postgres")
    password = config.get("password", "")
    host = config.get("host", "localhost")
    port = config.get("port", 5432)
    database = config.get("database", "myapp_development")
    if password:
        return f"postgresql://{username}:{password}@{host}:{port}/{database}"
    return f"postgresql://{username}@{host}:{port}/{database}"

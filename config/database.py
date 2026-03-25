"""
Database engine and session management.
Rails equivalent: config/database.rb — uses config/database.yml for connection.
"""

from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session, DeclarativeBase

from config.settings import get_settings
from config.database_yml import get_database_config, build_database_url


def _get_engine_url() -> str:
    """DATABASE_URL from env or built from config/database.yml."""
    return build_database_url()


def _get_pool_settings() -> tuple[int, int]:
    """Pool size from env or database.yml or defaults."""
    settings = get_settings()
    config = get_database_config()
    pool = config.get("pool")
    if pool is not None:
        return (int(pool), 20)
    return (settings.DB_POOL_SIZE, settings.DB_MAX_OVERFLOW)


settings = get_settings()
database_url = _get_engine_url()
pool_size, max_overflow = _get_pool_settings()

# SQLite does not support pool_size/max_overflow/pool_pre_ping
# Never use engine echo — SQL is logged only via config/logging_setup.attach_sqlalchemy_cursor_logging (LOG_SQL).
_engine_kw: dict = {
    "echo": False,
}
if database_url.startswith("sqlite"):
    _engine_kw["connect_args"] = {"check_same_thread": False}
else:
    _engine_kw["pool_size"] = pool_size
    _engine_kw["max_overflow"] = max_overflow
    _engine_kw["pool_pre_ping"] = True

engine = create_engine(database_url, **_engine_kw)

# If this module imported before main.configure_logging(), silence SA engine INFO anyway.
from config.logging_setup import silence_sqlalchemy_engine_loggers  # noqa: E402

silence_sqlalchemy_engine_loggers()


def _register_sql_logging() -> None:
    from config.logging_setup import attach_sqlalchemy_cursor_logging

    attach_sqlalchemy_cursor_logging(engine)


_register_sql_logging()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """SQLAlchemy declarative base. Rails equivalent: ApplicationRecord base."""
    pass


def get_db() -> Generator[Session, None, None]:
    """Dependency that yields a DB session. Rails equivalent: ActiveRecord connection per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

"""
Database engine and session. Uses config/database.yml or DATABASE_URL.
"""

from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session, DeclarativeBase

from config.settings import get_settings
from config.database_yml import get_database_config, build_database_url


def _get_engine_url() -> str:
    return build_database_url()


def _get_pool_settings() -> tuple[int, int]:
    settings = get_settings()
    config = get_database_config()
    pool = config.get("pool")
    if pool is not None:
        return (int(pool), 20)
    return (settings.DB_POOL_SIZE, settings.DB_MAX_OVERFLOW)


settings = get_settings()
database_url = _get_engine_url()
pool_size, max_overflow = _get_pool_settings()

engine = create_engine(
    database_url,
    pool_size=pool_size,
    max_overflow=max_overflow,
    pool_pre_ping=True,
    echo=settings.DEBUG and settings.APP_ENV == "development",
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

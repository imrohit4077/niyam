"""
Application settings loaded from environment.
Rails equivalent: config/application.rb + config/database.yml + env vars.
"""

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """All configuration from environment. Loaded via get_settings()."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # App
    APP_NAME: str = "MyApp"
    APP_ENV: Literal["development", "staging", "production"] = "development"
    DEBUG: bool = True
    SECRET_KEY: str = "change-me-in-production"

    # Logging (central config — see config/logging_setup.py)
    LOG_LEVEL: str = "INFO"
    LOG_COLOR: bool = True
    # Celery worker/beat: use ANSI colors even when stdout is not a TTY (Docker/K8s). Set false for raw log shipping.
    LOG_COLOR_WORKER: bool = True
    # Rails-style: print SQL in dev by default; set LOG_SQL=false in production if too noisy.
    LOG_SQL: bool = True

    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/myapp"
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20

    # JWT
    JWT_SECRET_KEY: str = "jwt-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Celery
    # Celery broker DB index (Rails/Sidekiq style). Requested default: Redis DB 2.
    CELERY_BROKER_URL: str = "redis://localhost:6379/2"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"
    # Worker process: gevent = many concurrent greenlets on one OS process (not prefork).
    # Override with CELERY_WORKER_POOL=prefork and low CELERY_WORKER_CONCURRENCY if needed.
    CELERY_WORKER_POOL: str = "gevent"
    CELERY_WORKER_CONCURRENCY: int = 1000

    # Pagination
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100

    # E-sign: candidate signing links (SPA origin); optional global webhook secret for providers
    FRONTEND_PUBLIC_URL: str = ""
    ESIGN_WEBHOOK_SECRET: str = ""
    # When set, each merged internal e-sign HTML snapshot is also written under {dir}/{account_id}/{request_id}.html
    ESIGN_ARTIFACTS_DIR: str = ""
    # Signed packages (HTML + embedded signature). Empty = project storage/esign_signed/
    ESIGN_SIGNED_DOCUMENTS_DIR: str = ""


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance."""
    return Settings()


# Celery configuration (task queues, serialization, timezone)
CELERY_TASK_SERIALIZER = "json"
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = "UTC"
CELERY_ENABLE_UTC = True
CELERY_TASK_TRACK_STARTED = True

# Named queues (Rails/Sidekiq style)
CELERY_TASK_QUEUES = ["default", "mailers", "critical", "low_priority"]
CELERY_DEFAULT_QUEUE = "default"

# Celery Beat schedule (periodic tasks) — add your scheduled jobs here
CELERY_BEAT_SCHEDULE: dict = {
    "referral-bonus-eligibility-daily": {
        "task": "forge.referral_bonus_eligibility_scan",
        "schedule": {"hour": 2, "minute": 17},
        "options": {"queue": "low_priority"},
    },
}

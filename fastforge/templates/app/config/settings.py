"""
Application settings loaded from environment.
Rails equivalent: config/application.rb + env vars.
"""

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    APP_NAME: str = "{{APP_NAME}}"
    APP_ENV: Literal["development", "staging", "production"] = "development"
    DEBUG: bool = True
    SECRET_KEY: str = "change-me-in-production"

    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/{{APP_NAME_SNAKE}}_development"
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20

    JWT_SECRET_KEY: str = "jwt-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100

    CELERY_BEAT_SCHEDULE: dict = {}


@lru_cache
def get_settings() -> Settings:
    return Settings()

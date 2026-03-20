"""Celery app. Rails/Sidekiq-style worker configuration."""

from __future__ import annotations

import importlib
from pathlib import Path

from celery import Celery

from config.settings import get_settings

settings = get_settings()

celery_app = Celery(
    "{{APP_NAME_SNAKE}}",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_default_queue="default",
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    broker_connection_retry_on_startup=True,
    result_expires=3600,
    task_queues={
        "default": {"exchange": "default", "routing_key": "default"},
        "mailers": {"exchange": "mailers", "routing_key": "mailers"},
        "critical": {"exchange": "critical", "routing_key": "critical"},
        "low_priority": {"exchange": "low_priority", "routing_key": "low_priority"},
    },
)
celery_app.conf.beat_schedule = settings.CELERY_BEAT_SCHEDULE


def _import_job_modules() -> None:
    """Autoload every `app/jobs/*_job.py` module so tasks register."""
    jobs_dir = Path(__file__).resolve().parents[1] / "app" / "jobs"
    if not jobs_dir.exists():
        return

    for path in jobs_dir.iterdir():
        if path.suffix != ".py":
            continue
        stem = path.stem
        if stem in {"__init__", "base_job"}:
            continue
        if not stem.endswith("_job"):
            continue
        importlib.import_module(f"app.jobs.{stem}")


_import_job_modules()

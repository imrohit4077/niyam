"""
Celery application instance and configuration.
Rails equivalent: config/application.rb (ActiveJob backend) + Sidekiq.
"""

from __future__ import annotations

import importlib
from pathlib import Path

from celery import Celery
from celery.schedules import crontab

from config.settings import get_settings, CELERY_BEAT_SCHEDULE

settings = get_settings()

celery_app = Celery(
    "myapp",
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
    # Production-grade worker behavior (smooth reliability)
    task_acks_late=True,  # ack after task completes
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    broker_connection_retry_on_startup=True,
    result_expires=3600,  # seconds
    task_queues={
        "default": {"exchange": "default", "routing_key": "default"},
        "mailers": {"exchange": "mailers", "routing_key": "mailers"},
        "critical": {"exchange": "critical", "routing_key": "critical"},
        "low_priority": {"exchange": "low_priority", "routing_key": "low_priority"},
    },
)

# Celery Beat: convert hour/minute dict to crontab (empty for framework)
beat_schedule = {}
if CELERY_BEAT_SCHEDULE:
    for name, entry in CELERY_BEAT_SCHEDULE.items():
        s = entry.get("schedule", {})
        beat_schedule[name] = {
            "task": entry["task"],
            "schedule": crontab(hour=s.get("hour", 2), minute=s.get("minute", 0)),
            "options": entry.get("options", {}),
        }
celery_app.conf.beat_schedule = beat_schedule


def _import_job_modules() -> None:
    """
    Rails-like convention: autoload every `app/jobs/*_job.py` module so the
    `@celery_app.task(...)` decorators run and tasks get registered.
    """
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

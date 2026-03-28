"""
Celery application instance and configuration.
Rails equivalent: config/application.rb (ActiveJob backend) + Sidekiq.
"""

from __future__ import annotations

import importlib
from pathlib import Path

from celery import Celery
from celery.schedules import crontab
from celery.signals import after_setup_logger, beat_init, worker_init, worker_process_init

from config.logging_setup import configure_logging
from config.schedule import CELERY_BEAT_SCHEDULE
from config.settings import get_settings

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
    # Do not set worker_pool=gevent here — Celery requires `-P gevent` on the CLI so patches run early.
    # Defaults live in settings (CELERY_WORKER_*) and manage.py passes -P / -c.
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

# Celery Beat: single source of truth — config/schedule.py (Rails schedule.rb equivalent)
beat_schedule: dict = {}
if CELERY_BEAT_SCHEDULE:
    for name, entry in CELERY_BEAT_SCHEDULE.items():
        sched = entry.get("schedule")
        if isinstance(sched, dict):
            s = sched
            sched_obj = crontab(hour=s.get("hour", 2), minute=s.get("minute", 0))
        else:
            sched_obj = sched
        beat_schedule[name] = {
            "task": entry["task"],
            "schedule": sched_obj,
            "options": entry.get("options", {}),
        }
celery_app.conf.beat_schedule = beat_schedule


def _celery_process_name_from_argv() -> str:
    """`celery … beat` vs `celery … worker` — used so logs show [worker] vs [beat]."""
    import sys

    if "beat" in sys.argv:
        return "beat"
    return "worker"


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


# ── Logging: same Forge formatter / colors / SQL as the web app (one config file) ──
@worker_init.connect
def _forge_logging_worker(**_kwargs: object) -> None:
    configure_logging(process_name="worker", force=True)


@worker_process_init.connect
def _forge_logging_worker_child(**_kwargs: object) -> None:
    """Prefork pool: each child process needs Forge logging re-applied after Celery setup."""
    configure_logging(process_name="worker", force=True)


@after_setup_logger.connect
def _forge_after_celery_root_logger(logger=None, **_kwargs: object) -> None:
    """Runs after Celery configures the root logger — re-attach colored Forge handler."""
    configure_logging(process_name=_celery_process_name_from_argv(), force=True)


@beat_init.connect
def _forge_logging_beat(**_kwargs: object) -> None:
    configure_logging(process_name="beat", force=True)

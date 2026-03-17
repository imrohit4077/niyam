"""Celery app. Add job modules to include=[] and use fastforge generate job <name>."""

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
    task_queues={
        "default": {"exchange": "default", "routing_key": "default"},
        "mailers": {"exchange": "mailers", "routing_key": "mailers"},
        "critical": {"exchange": "critical", "routing_key": "critical"},
        "low_priority": {"exchange": "low_priority", "routing_key": "low_priority"},
    },
)
celery_app.conf.beat_schedule = settings.CELERY_BEAT_SCHEDULE

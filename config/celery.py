"""
Celery application instance and configuration.
Rails equivalent: config/application.rb (ActiveJob backend) + Sidekiq.
"""

from celery import Celery
from celery.schedules import crontab

from config.settings import get_settings, CELERY_BEAT_SCHEDULE

settings = get_settings()

celery_app = Celery(
    "myapp",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[],  # Add your job modules: e.g. "app.jobs.my_job"
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

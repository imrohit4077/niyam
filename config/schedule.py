"""
Centralized periodic jobs (Celery Beat) — ForgeAPI equivalent of Rails schedule.rb / Whenever.

  Rails:           config/schedule.rb   + cron OR Whenever → Sidekiq/ActiveJob
  ForgeAPI:        THIS FILE            → Celery Beat → app/jobs/*_job.py

Rules:
  • List every repeating task here only — do not scatter crontab() in other modules.
  • Each job must be a @celery_app.task with a stable ``name="forge.<task_name>"`` in app/jobs/.
  • Beat process: ``celery -A config.celery beat`` (or ``python manage.py scheduler``).

How to add a job:
  1. Create ``app/jobs/my_task_job.py`` and register ``name="forge.my_task"``.
  2. Add an entry below using ``beat_entry(...)`` or a raw dict with the same shape.
  3. Deploy/restart the Beat process.

Schedule primitives (celery.schedules):
  • crontab(minute="*/15")     — every 15 minutes on the clock
  • crontab(hour=3, minute=0)  — daily at 03:00 UTC
  • schedule(timedelta(hours=1)) — every hour from first tick (import schedule, timedelta)
"""

from __future__ import annotations

from typing import Any

from celery.schedules import crontab


def beat_entry(
    *,
    task: str,
    schedule: Any,
    queue: str = "default",
    **task_options: Any,
) -> dict[str, Any]:
    """
    One Beat row: task dotted name, Celery schedule object, worker queue.

    ``task`` must match the Celery task's ``name=`` (e.g. forge.audit_log_flush).
    """
    opts: dict[str, Any] = {"queue": queue}
    opts.update(task_options)
    return {"task": task, "schedule": schedule, "options": opts}


# =============================================================================
# Referrals & incentives
# =============================================================================

_REFERRAL_JOBS = {
    "referral-bonus-eligibility-daily": beat_entry(
        task="forge.referral_bonus_eligibility_scan",
        schedule=crontab(hour=2, minute=17),
        queue="low_priority",
    ),
}

# =============================================================================
# Audit & compliance (Redis buffer → Postgres)
# =============================================================================

_AUDIT_JOBS = {
    "audit-log-flush": beat_entry(
        task="forge.audit_log_flush",
        schedule=crontab(minute="*/20"),
        queue="low_priority",
    ),
}

# =============================================================================
# Merge sections (add new dicts here as the app grows)
# =============================================================================

CELERY_BEAT_SCHEDULE: dict[str, dict[str, Any]] = {**_REFERRAL_JOBS, **_AUDIT_JOBS}

# Rails-like alias: ``from config.schedule import SCHEDULE``
SCHEDULE = CELERY_BEAT_SCHEDULE

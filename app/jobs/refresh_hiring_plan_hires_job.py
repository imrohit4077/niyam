"""Recompute hires_made for a hiring plan from applications (async, race-safe)."""
from sqlalchemy import func, select
from config.celery import celery_app
from config.database import SessionLocal
from app.models.application import Application
from app.models.hiring_plan import HiringPlan


@celery_app.task(name="forge.refresh_hiring_plan_hires_made")
def refresh_hiring_plan_hires_made(account_id: int, job_id: int) -> None:
    db = SessionLocal()
    try:
        count = db.scalar(
            select(func.count())
            .select_from(Application)
            .where(
                Application.account_id == account_id,
                Application.job_id == job_id,
                Application.status == "hired",
                Application.deleted_at.is_(None),
            )
        )
        plan = HiringPlan.find_by(db, account_id=account_id, job_id=job_id)
        if plan:
            plan.hires_made = int(count or 0)
            plan.save(db)
    finally:
        db.close()

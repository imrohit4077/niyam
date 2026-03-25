"""Notify referrer on pipeline milestones (email/Slack hooks can plug in here)."""
from config.celery import celery_app
from config.database import SessionLocal
from app.helpers.logger import get_logger
from app.models.account import Account
from app.models.application import Application
from app.models.job import Job
from app.models.user import User
from app.services.referral_account_settings_service import merged_referral_settings

logger = get_logger(__name__)


@celery_app.task(name="forge.referral_milestone_notify")
def referral_milestone_notify(account_id: int, application_id: int, new_status: str) -> None:
    db = SessionLocal()
    try:
        app = Application.find_by(db, id=application_id, account_id=account_id)
        if not app or not app.referral_user_id:
            return
        acc = db.get(Account, account_id)
        settings = merged_referral_settings(acc.settings if acc else {})
        if not settings.get("notify_referrer_milestones", True):
            return
        referrer = db.get(User, app.referral_user_id)
        job = db.get(Job, app.job_id)
        # Production hook: connect to mailers queue, Slack, or webhook.
        logger.info(
            "referral_milestone_notify",
            extra={
                "application_id": application_id,
                "new_status": new_status,
                "referrer_email": referrer.email if referrer else None,
                "job_title": job.title if job else None,
            },
        )
    finally:
        db.close()

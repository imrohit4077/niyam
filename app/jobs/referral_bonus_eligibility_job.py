"""Periodic scan: pending bonuses with eligible_after <= today become eligible."""
from config.celery import celery_app
from config.database import SessionLocal
from app.helpers.logger import get_logger
from app.services.referral_service import run_eligibility_scan

logger = get_logger(__name__)


@celery_app.task(name="forge.referral_bonus_eligibility_scan")
def referral_bonus_eligibility_scan() -> int:
    db = SessionLocal()
    try:
        n = run_eligibility_scan(db)
        if n:
            logger.info("referral_bonus_eligibility_scan promoted", extra={"count": n})
        return n
    finally:
        db.close()

"""Create referral bonus row when an application moves to hired (async)."""
from config.celery import celery_app
from config.database import SessionLocal
from app.helpers.logger import get_logger
from app.services.referral_service import ReferralBonusService

logger = get_logger(__name__)


@celery_app.task(name="forge.referral_bonus_on_hire")
def referral_bonus_on_hire(account_id: int, application_id: int) -> None:
    db = SessionLocal()
    try:
        r = ReferralBonusService(db).ensure_bonus_for_hired_application(account_id, application_id)
        if not r.get("ok"):
            logger.warning(
                "referral_bonus_on_hire skipped",
                extra={"error": r.get("error"), "application_id": application_id},
            )
    finally:
        db.close()

"""Role kickoff lifecycle notifications (email/Slack hooks plug in here)."""

from __future__ import annotations

from config.celery import celery_app
from config.database import SessionLocal
from app.helpers.logger import get_logger
from app.models.role_kickoff_request import RoleKickoffRequest
from app.models.user import User

logger = get_logger(__name__)

VALID_EVENTS = frozenset(
    {
        "submitted",
        "resubmitted",
        "approved",
        "rejected",
        "changes_requested",
        "converted",
    }
)


@celery_app.task(name="niyam.role_kickoff_notify", ignore_result=True)
def role_kickoff_notify(account_id: int, kickoff_id: int, event: str) -> None:
    if event not in VALID_EVENTS:
        return
    db = SessionLocal()
    try:
        row = RoleKickoffRequest.find_by(db, id=kickoff_id, account_id=account_id)
        if not row:
            return
        hm = db.get(User, row.created_by_user_id)
        rec = db.get(User, row.assigned_recruiter_user_id)
        logger.info(
            "role_kickoff_notify",
            extra={
                "event": event,
                "kickoff_id": kickoff_id,
                "title": row.title,
                "status": row.status,
                "hiring_manager_email": hm.email if hm else None,
                "recruiter_email": rec.email if rec else None,
                "open_positions": row.open_positions,
            },
        )
    finally:
        db.close()

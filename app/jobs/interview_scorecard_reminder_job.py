"""
Nudge interviewers when a scorecard is still missing 2+ hours after interview_ends_at.

Register in config/schedule.py (CELERY_BEAT_SCHEDULE), e.g. every 15 minutes:
  "interview_scorecard_reminders": {
      "task": "forge.interview_scorecard_reminders",
      "schedule": {"hour": "*", "minute": "*/15"},
  }

Wire Slack/email inside _notify_interviewer when ready.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import and_, select

from config.celery import celery_app
from config.database import SessionLocal
from app.helpers.logger import get_logger
from app.models.interview_assignment import InterviewAssignment
from app.models.interview_scorecard import InterviewScorecard

logger = get_logger(__name__)


def _notify_interviewer(assignment_id: int, interviewer_id: int, account_id: int) -> None:
    logger.info(
        "interview_scorecard_reminder — pending scorecard",
        extra={
            "assignment_id": assignment_id,
            "interviewer_id": interviewer_id,
            "account_id": account_id,
        },
    )


@celery_app.task(name="forge.interview_scorecard_reminders")
def interview_scorecard_reminders() -> dict[str, int]:
    db = SessionLocal()
    sent = 0
    try:
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(hours=2)
        stmt = (
            select(InterviewAssignment)
            .outerjoin(
                InterviewScorecard,
                and_(
                    InterviewScorecard.assignment_id == InterviewAssignment.id,
                    InterviewScorecard.interviewer_id == InterviewAssignment.interviewer_id,
                ),
            )
            .where(
                InterviewAssignment.interview_ends_at.is_not(None),
                InterviewAssignment.interview_ends_at <= cutoff,
                InterviewAssignment.status.in_(("pending", "scheduled")),
                InterviewAssignment.interviewer_id.is_not(None),
                InterviewAssignment.scorecard_reminder_sent_at.is_(None),
                InterviewScorecard.id.is_(None),
            )
        )
        rows = list(db.execute(stmt).unique().scalars().all())
        for ass in rows:
            _notify_interviewer(ass.id, ass.interviewer_id, ass.account_id)
            ass.scorecard_reminder_sent_at = now
            ass.updated_at = now
            db.add(ass)
        if rows:
            db.commit()
        sent = len(rows)
    finally:
        db.close()
    return {"reminders_marked": sent}

"""
When a candidate lands on a pipeline stage, ensure interview_assignments exist
for every interview_plan tied to that stage (idempotent).
"""
from __future__ import annotations

from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.helpers.logger import get_logger
from app.models.application import Application
from app.models.interview_assignment import InterviewAssignment
from app.models.interview_plan import InterviewPlan

logger = get_logger(__name__)


def sync_interview_assignments_for_pipeline_move(
    db: Session,
    account_id: int,
    application: Application,
    old_pipeline_stage_id: int | None,
    new_pipeline_stage_id: int | None,
) -> None:
    if new_pipeline_stage_id == old_pipeline_stage_id:
        return
    if new_pipeline_stage_id is None:
        return

    stmt = (
        select(InterviewPlan)
        .where(
            InterviewPlan.account_id == account_id,
            InterviewPlan.job_id == application.job_id,
            InterviewPlan.pipeline_stage_id == new_pipeline_stage_id,
        )
        .order_by(InterviewPlan.position.asc(), InterviewPlan.id.asc())
    )
    plans = list(db.execute(stmt).scalars().all())
    if not plans:
        return

    now = datetime.now(timezone.utc)
    created = 0
    for plan in plans:
        existing = InterviewAssignment.find_by(
            db,
            application_id=application.id,
            interview_plan_id=plan.id,
        )
        if existing:
            continue
        db.add(
            InterviewAssignment(
                account_id=account_id,
                application_id=application.id,
                interview_plan_id=plan.id,
                interviewer_id=None,
                status="pending",
                created_at=now,
                updated_at=now,
            )
        )
        created += 1

    if created:
        db.commit()
        logger.info(
            "interview_sync — created assignments",
            extra={
                "application_id": application.id,
                "pipeline_stage_id": new_pipeline_stage_id,
                "count": created,
            },
        )

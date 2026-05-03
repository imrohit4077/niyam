"""Shared permission resolution for controllers (workspace + optional job scope)."""

from __future__ import annotations

from typing import TYPE_CHECKING

from app.models.account_user import AccountUser
from app.models.application import Application
from app.models.interview_assignment import InterviewAssignment
from app.services.permission_resolution_service import PermissionResolutionService, permission_key

if TYPE_CHECKING:
    from sqlalchemy.orm import Session


def account_user_for(db: "Session", user_id: int, account_id: int) -> AccountUser | None:
    return AccountUser.find_by(db, user_id=user_id, account_id=account_id)


def effective_keys(
    db: "Session", account_id: int, user_id: int, job_id: int | None = None
) -> frozenset[str]:
    au = account_user_for(db, user_id, account_id)
    if not au:
        return frozenset()
    pr = PermissionResolutionService(db)
    if job_id is not None:
        return pr.effective_keys(account_id, user_id, au.id, job_id)
    return pr.workspace_keys_for_account_user(au.id)


def application_list_access_mode(db: "Session", account_id: int, user_id: int, job_id: int | None) -> str | None:
    """Return ``all`` or ``assigned`` if the user may list applications; otherwise ``None``."""
    keys = effective_keys(db, account_id, user_id, job_id)
    if permission_key("applications", "view_all") in keys:
        return "all"
    if permission_key("applications", "view_assigned") in keys:
        return "assigned"
    return None


def can_read_application(
    db: "Session", account_id: int, user_id: int, app: Application
) -> bool:
    keys = effective_keys(db, account_id, user_id, app.job_id)
    if permission_key("applications", "view_all") in keys:
        return True
    if permission_key("applications", "view_assigned") not in keys:
        return False
    if app.assigned_to == user_id:
        return True
    from sqlalchemy import select

    stmt = (
        select(InterviewAssignment.id)
        .where(
            InterviewAssignment.application_id == app.id,
            InterviewAssignment.account_id == account_id,
            InterviewAssignment.interviewer_id == user_id,
        )
        .limit(1)
    )
    return db.execute(stmt).first() is not None


def can_mutate_application_fields(db: "Session", account_id: int, user_id: int, app: Application) -> bool:
    """Non-stage PATCH (notes, tags, labels, etc.) — recruiters / HM; not limited interviewers."""
    keys = effective_keys(db, account_id, user_id, app.job_id)
    return permission_key("applications", "view_all") in keys


def can_move_application_stage(db: "Session", account_id: int, user_id: int, app: Application) -> bool:
    keys = effective_keys(db, account_id, user_id, app.job_id)
    return permission_key("applications", "move_stage") in keys


def can_reject_application(db: "Session", account_id: int, user_id: int, app: Application) -> bool:
    keys = effective_keys(db, account_id, user_id, app.job_id)
    return permission_key("applications", "reject") in keys

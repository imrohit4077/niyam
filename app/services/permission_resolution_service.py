"""
Resolve effective permission keys for a user (workspace roles + job context).

Keys are "resource:action" strings, aligned with rows in the global `permissions` table
and optional job-scoped grants (hiring manager / recruiter FKs + `job_team_members`).
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import select

from app.models.account_user_role import AccountUserRole
from app.models.job import Job
from app.models.job_team_member import JobTeamMember
from app.models.permission import Permission
from app.models.role_permission import RolePermission

if TYPE_CHECKING:
    from sqlalchemy.orm import Session


def permission_key(resource: str, action: str) -> str:
    return f"{resource}:{action}"


# Canonical catalog: (resource, action, description) — mirrored in `permissions` by seeds.
PERMISSION_CATALOG: tuple[tuple[str, str, str], ...] = (
    ("jobs", "view", "View jobs and hiring team"),
    ("jobs", "create", "Create jobs"),
    ("jobs", "edit", "Edit job posts and hiring team"),
    ("jobs", "publish", "Publish / unpublish jobs"),
    ("applications", "view_all", "View all candidates on a job"),
    ("applications", "view_assigned", "View candidates assigned to the user"),
    ("applications", "move_stage", "Move candidates between pipeline stages"),
    ("applications", "reject", "Reject candidates"),
    ("interviews", "schedule", "Schedule interviews and manage calendar links"),
    ("interviews", "claim_assignment", "Claim or be assigned interview slots"),
    ("interviews", "perform", "Conduct interviews using kit / scorecard"),
    ("interviews", "view_panel_feedback", "View other interviewers' submitted scorecards"),
    ("scorecards", "submit", "Submit interview scorecards"),
    ("scorecards", "view_own", "View own submitted scorecards"),
    ("scorecards", "view_all", "View all scorecards for candidates on a job"),
    ("offers", "prepare", "Draft or generate offers"),
    ("offers", "approve", "Approve offers or compensation"),
    ("sourcing", "add_candidate", "Add or upload sourced candidates"),
    ("sourcing", "tag_candidate", "Tag / label sourced profiles"),
    ("settings", "integrations", "Manage communication integrations"),
    ("settings", "admin_roles", "Manage roles and permission matrix (site admin)"),
    ("esign", "view", "View signed documents and e-sign templates"),
    ("esign", "manage", "Manage e-sign templates, rules, and automation"),
    ("referrals", "view", "Referrals hub and personal referral links"),
    ("referrals", "manage", "Referral program settings, bonuses, and admin analytics"),
)

ALL_PERMISSION_KEYS: frozenset[str] = frozenset(permission_key(r, a) for r, a, _ in PERMISSION_CATALOG)

# Workspace role slug → default global keys (before job-scoped merge).
WORKSPACE_ROLE_PERMISSIONS: dict[str, frozenset[str]] = {
    "superadmin": ALL_PERMISSION_KEYS,
    "site_admin": ALL_PERMISSION_KEYS,
    "admin": ALL_PERMISSION_KEYS,
    "job_admin": ALL_PERMISSION_KEYS - {permission_key("settings", "admin_roles")},
    "recruiter": frozenset(
        {
            permission_key("jobs", "view"),
            permission_key("jobs", "create"),
            permission_key("jobs", "edit"),
            permission_key("jobs", "publish"),
            permission_key("applications", "view_all"),
            permission_key("applications", "move_stage"),
            permission_key("applications", "reject"),
            permission_key("interviews", "schedule"),
            permission_key("interviews", "claim_assignment"),
            permission_key("interviews", "view_panel_feedback"),
            permission_key("scorecards", "view_all"),
            permission_key("offers", "prepare"),
            permission_key("sourcing", "add_candidate"),
            permission_key("sourcing", "tag_candidate"),
            permission_key("esign", "view"),
            permission_key("esign", "manage"),
            permission_key("referrals", "view"),
            permission_key("referrals", "manage"),
        }
    ),
    "hiring_manager": frozenset(
        {
            permission_key("jobs", "view"),
            permission_key("applications", "view_all"),
            permission_key("applications", "move_stage"),
            permission_key("applications", "reject"),
            permission_key("interviews", "perform"),
            permission_key("interviews", "view_panel_feedback"),
            permission_key("scorecards", "view_all"),
            permission_key("scorecards", "submit"),
            permission_key("esign", "view"),
            permission_key("referrals", "view"),
        }
    ),
    "coordinator": frozenset(
        {
            permission_key("jobs", "view"),
            permission_key("applications", "view_all"),
            permission_key("interviews", "schedule"),
            permission_key("interviews", "claim_assignment"),
            permission_key("esign", "view"),
            permission_key("referrals", "view"),
        }
    ),
    "interviewer": frozenset(
        {
            permission_key("applications", "view_assigned"),
            permission_key("interviews", "perform"),
            permission_key("interviews", "claim_assignment"),
            permission_key("scorecards", "submit"),
            permission_key("scorecards", "view_own"),
            permission_key("esign", "view"),
            permission_key("referrals", "view"),
        }
    ),
    "sourcer": frozenset(
        {
            permission_key("jobs", "view"),
            permission_key("applications", "view_assigned"),
            permission_key("sourcing", "add_candidate"),
            permission_key("sourcing", "tag_candidate"),
            permission_key("referrals", "view"),
        }
    ),
    "approver": frozenset(
        {
            permission_key("jobs", "view"),
            permission_key("applications", "view_all"),
            permission_key("offers", "approve"),
            permission_key("esign", "view"),
            permission_key("referrals", "view"),
        }
    ),
    "member": frozenset({permission_key("jobs", "view")}),
    "basic": frozenset({permission_key("jobs", "view")}),
}

# Extra keys when user is hiring manager on this specific job (FK on jobs).
ON_JOB_HIRING_MANAGER: frozenset[str] = frozenset(
    {
        permission_key("applications", "view_all"),
        permission_key("applications", "move_stage"),
        permission_key("applications", "reject"),
        permission_key("interviews", "view_panel_feedback"),
        permission_key("scorecards", "view_all"),
    }
)

# Extra keys when user is recruiter on this job (FK).
ON_JOB_RECRUITER: frozenset[str] = frozenset(
    {
        permission_key("applications", "view_all"),
        permission_key("applications", "move_stage"),
        permission_key("interviews", "schedule"),
        permission_key("offers", "prepare"),
    }
)

# Per job_team_members.team_role (beyond HM/recruiter FKs).
JOB_TEAM_ROLE_PERMISSIONS: dict[str, frozenset[str]] = {
    "coordinator": frozenset(
        {permission_key("interviews", "schedule"), permission_key("applications", "view_all"), permission_key("interviews", "claim_assignment")}
    ),
    "interviewer": frozenset(
        {
            permission_key("applications", "view_assigned"),
            permission_key("interviews", "perform"),
            permission_key("scorecards", "submit"),
            permission_key("scorecards", "view_own"),
        }
    ),
    "sourcer": frozenset({permission_key("sourcing", "add_candidate"), permission_key("sourcing", "tag_candidate")}),
    "approver": frozenset({permission_key("offers", "approve"), permission_key("applications", "view_all")}),
    "stakeholder": frozenset({permission_key("jobs", "view"), permission_key("applications", "view_all")}),
}

ALLOWED_JOB_TEAM_ROLES: frozenset[str] = frozenset(JOB_TEAM_ROLE_PERMISSIONS.keys())


class PermissionResolutionService:
    def __init__(self, db: "Session") -> None:
        self.db = db

    def workspace_keys_for_account_user(self, account_user_id: int) -> frozenset[str]:
        """Union of permission keys from all workspace roles attached to this membership."""
        aurs = AccountUserRole.where(self.db, account_user_id=account_user_id)
        if not aurs:
            return frozenset()
        role_ids = [aur.role_id for aur in aurs]
        stmt = (
            select(Permission.resource, Permission.action)
            .join(RolePermission, RolePermission.permission_id == Permission.id)
            .where(RolePermission.role_id.in_(role_ids))
        )
        rows = self.db.execute(stmt).all()
        from_db = frozenset(permission_key(r, a) for r, a in rows)
        if from_db:
            return from_db
        # Fallback if role_permissions not populated yet: derive from role slugs.
        keys: set[str] = set()
        for aur in aurs:
            from app.models.role import Role

            role = Role.find_by(self.db, id=aur.role_id)
            if role and role.slug in WORKSPACE_ROLE_PERMISSIONS:
                keys |= WORKSPACE_ROLE_PERMISSIONS[role.slug]
        return frozenset(keys)

    def job_context_keys(self, account_id: int, user_id: int, job_id: int) -> frozenset[str]:
        """Keys granted only in the context of this job (FKs + job_team_members)."""
        job = Job.find_by(self.db, id=job_id, account_id=account_id)
        if not job or job.deleted_at:
            return frozenset()
        extra: set[str] = set()
        if job.hiring_manager_user_id == user_id:
            extra |= ON_JOB_HIRING_MANAGER
        if job.recruiter_user_id == user_id:
            extra |= ON_JOB_RECRUITER
        for row in JobTeamMember.where(self.db, job_id=job_id, user_id=user_id, account_id=account_id):
            extra |= JOB_TEAM_ROLE_PERMISSIONS.get(row.team_role, frozenset())
        return frozenset(extra)

    def effective_keys(
        self,
        account_id: int,
        user_id: int,
        account_user_id: int,
        job_id: int | None = None,
    ) -> frozenset[str]:
        base = self.workspace_keys_for_account_user(account_user_id)
        if job_id is None:
            return base
        return base | self.job_context_keys(account_id, user_id, job_id)

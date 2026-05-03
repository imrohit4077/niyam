"""
Idempotent Greenhouse-style RBAC + demo hiring team (called from db/seeds.py).

Adds: global `permissions` rows, `role_permissions` per account role slug,
extra workspace users, a demo job with pipeline + `job_team_members`.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING

from app.models.account_user import AccountUser
from app.models.account_user_role import AccountUserRole
from app.models.job import Job
from app.models.job_team_member import JobTeamMember
from app.models.permission import Permission
from app.models.hiring_plan import HiringPlan
from app.models.hiring_attribute import HiringAttribute
from app.models.hiring_stage_template import HiringStageTemplate
from app.models.hiring_stage_template_attribute import HiringStageTemplateAttribute
from app.models.pipeline_stage import PipelineStage
from app.models.role import Role
from app.models.role_permission import RolePermission
from app.models.user import User
from app.services.hiring_plan_service import HiringPlanService
from app.services.job_service import JobService
from app.services.permission_resolution_service import (
    ALL_PERMISSION_KEYS,
    PERMISSION_CATALOG,
    WORKSPACE_ROLE_PERMISSIONS,
)
from app.services.pipeline_stage_service import PipelineStageService

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

DEMO_PASSWORD = "password123"

# (email, display name, workspace role slug)
DEMO_WORKSPACE_USERS: tuple[tuple[str, str, str], ...] = (
    ("recruiter@example.com", "Recruiter Riley", "recruiter"),
    ("hm@example.com", "Hiring Manager Morgan", "hiring_manager"),
    ("coordinator@example.com", "Coordinator Casey", "coordinator"),
    ("interviewer@example.com", "Interviewer Ira", "interviewer"),
    ("sourcer@example.com", "Sourcer Sam", "sourcer"),
    ("approver@example.com", "Approver Avery", "approver"),
    ("jobadmin@example.com", "Job Admin Jordan", "job_admin"),
    ("basic@example.com", "Basic Bailey", "member"),
)

ROLE_SLUG_LABELS: dict[str, tuple[str, str]] = {
    "superadmin": ("Super Admin", "Highest workspace access"),
    "site_admin": ("Site Admin", "Full system configuration"),
    "admin": ("Admin", "Full workspace access"),
    "job_admin": ("Job Admin", "Greenhouse-style job admin (no site role matrix edits)"),
    "recruiter": ("Recruiter", "Pipeline and posting operator"),
    "hiring_manager": ("Hiring Manager", "Role owner / decision maker"),
    "coordinator": ("Coordinator", "Scheduling and logistics"),
    "interviewer": ("Interviewer", "Evaluation and scorecards"),
    "sourcer": ("Sourcer", "Sourcing and tagging"),
    "approver": ("Approver", "Offer / comp approval"),
    "member": ("Member", "Basic workspace access"),
    "basic": ("Basic", "Basic workspace access"),
}


def _get_or_create_role(db: "Session", account_id: int, slug: str, now: datetime) -> Role:
    r = Role.find_by(db, account_id=account_id, slug=slug)
    if r:
        return r
    label, desc = ROLE_SLUG_LABELS.get(slug, (slug.replace("_", " ").title(), ""))
    r = Role(account_id=account_id, name=label, slug=slug, description=desc, created_at=now)
    db.add(r)
    db.flush()
    return r


def _ensure_permission_rows(db: "Session") -> bool:
    changed = False
    for resource, action, description in PERMISSION_CATALOG:
        existing = Permission.find_by(db, resource=resource, action=action)
        if existing:
            continue
        db.add(Permission(resource=resource, action=action, description=description))
        changed = True
    if changed:
        db.flush()
    return changed


def _permission_id_for_key(db: "Session", key: str) -> int | None:
    resource, _, action = key.partition(":")
    if not action:
        return None
    p = Permission.find_by(db, resource=resource, action=action)
    return p.id if p else None


def _link_role_to_keys(db: "Session", role: Role, keys: frozenset[str]) -> bool:
    changed = False
    for key in keys:
        pid = _permission_id_for_key(db, key)
        if pid is None:
            continue
        existing = RolePermission.find_by(db, role_id=role.id, permission_id=pid)
        if existing:
            continue
        db.add(RolePermission(role_id=role.id, permission_id=pid))
        changed = True
    if changed:
        db.flush()
    return changed


def _ensure_role_permissions_for_account(db: "Session", account_id: int, now: datetime) -> bool:
    changed = False
    if _ensure_permission_rows(db):
        changed = True
    slugs = set(WORKSPACE_ROLE_PERMISSIONS.keys()) | {"admin", "superadmin"}
    for slug in slugs:
        role = Role.find_by(db, account_id=account_id, slug=slug)
        if not role:
            if slug not in ROLE_SLUG_LABELS:
                continue
            role = _get_or_create_role(db, account_id, slug, now)
            changed = True
        if slug in ("admin", "superadmin"):
            keys = ALL_PERMISSION_KEYS
        else:
            keys = WORKSPACE_ROLE_PERMISSIONS.get(slug, frozenset())
        if keys and _link_role_to_keys(db, role, keys):
            changed = True
    return changed


def _ensure_demo_user(db: "Session", account_id: int, email: str, name: str, role_slug: str, now: datetime) -> bool:
    changed = False
    user = User.find_by(db, email=email)
    if not user:
        user = User(
            email=email,
            name=name,
            status="active",
            created_at=now,
            updated_at=now,
        )
        user.set_password(DEMO_PASSWORD)
        db.add(user)
        db.flush()
        changed = True
    au = AccountUser.find_by(db, user_id=user.id, account_id=account_id)
    if not au:
        au = AccountUser(
            account_id=account_id,
            user_id=user.id,
            status="active",
            joined_at=now,
            created_at=now,
        )
        db.add(au)
        db.flush()
        changed = True
    role = _get_or_create_role(db, account_id, role_slug, now)
    link = AccountUserRole.find_by(db, account_user_id=au.id, role_id=role.id)
    if not link:
        db.add(AccountUserRole(account_user_id=au.id, role_id=role.id))
        changed = True
    return changed


def _ensure_admin_role_permissions(db: "Session", account_id: int, now: datetime) -> bool:
    """Link legacy admin + superadmin roles to the permission matrix."""
    changed = False
    for slug in ("admin", "superadmin"):
        role = Role.find_by(db, account_id=account_id, slug=slug)
        if not role:
            continue
        if _link_role_to_keys(db, role, ALL_PERMISSION_KEYS):
            changed = True
    return changed


def _ensure_demo_job_and_team(db: "Session", account_id: int, now: datetime) -> bool:
    from sqlalchemy import select

    changed = False
    title_marker = "Seeded Demo — Backend Engineer"
    stmt = select(Job).where(Job.account_id == account_id, Job.title == title_marker, Job.deleted_at.is_(None))
    job = db.execute(stmt).scalars().first()
    admin = User.find_by(db, email="admin@example.com")
    if not admin:
        return changed
    if not job:
        js = JobService(db)
        res = js.create_job(
            account_id,
            admin.id,
            {
                "title": title_marker,
                "description": "Demo job for hiring-team permissions and pipeline.",
                "status": "draft",
            },
        )
        if not res.get("ok"):
            return changed
        job = Job.find_by(db, account_id=account_id, id=res["data"]["id"])
        changed = True
    if not job:
        return changed

    hm = User.find_by(db, email="hm@example.com")
    rec = User.find_by(db, email="recruiter@example.com")
    job_dirty = False
    if hm and job.hiring_manager_user_id != hm.id:
        job.hiring_manager_user_id = hm.id
        job_dirty = True
    if rec and job.recruiter_user_id != rec.id:
        job.recruiter_user_id = rec.id
        job_dirty = True
    if job_dirty:
        job.updated_at = now
        db.add(job)
        db.flush()
        changed = True

    stages_spec = (
        ("Applied", "applied"),
        ("Screening", "screening"),
        ("Interview", "interview"),
        ("Offer", "offer"),
        ("Hired", "hired"),
    )
    ps = PipelineStageService(db)
    existing = PipelineStage.where(db, account_id=account_id, job_id=job.id)
    existing_names = {s.name for s in existing}
    for name, st in stages_spec:
        if name not in existing_names:
            r = ps.create_stage(account_id, job.id, {"name": name, "stage_type": st})
            if r.get("ok"):
                changed = True

    hps = HiringPlanService(db)
    if not HiringPlan.find_by(db, account_id=account_id, job_id=job.id):
        hp = hps.create_plan(
            account_id,
            {
                "job_id": job.id,
                "target_hires": 2,
                "hiring_manager_id": hm.id if hm else None,
                "primary_recruiter_id": rec.id if rec else None,
            },
        )
        if hp.get("ok"):
            changed = True

    team_specs: list[tuple[str, str]] = [
        ("coordinator@example.com", "coordinator"),
        ("interviewer@example.com", "interviewer"),
        ("sourcer@example.com", "sourcer"),
        ("approver@example.com", "approver"),
        ("basic@example.com", "stakeholder"),
    ]
    for email, team_role in team_specs:
        u = User.find_by(db, email=email)
        if not u:
            continue
        if JobTeamMember.find_by(db, job_id=job.id, user_id=u.id, team_role=team_role):
            continue
        m = JobTeamMember(
            account_id=account_id,
            job_id=job.id,
            user_id=u.id,
            team_role=team_role,
            created_at=now,
            updated_at=now,
        )
        db.add(m)
        changed = True
    if changed:
        db.flush()
    return changed


def _ensure_structured_hiring_demo(db: "Session", account_id: int, now: datetime) -> bool:
    """Idempotent: sample scorecard attributes + reusable stage templates (focus mappings)."""
    from sqlalchemy import select

    stmt = select(HiringStageTemplate).where(
        HiringStageTemplate.account_id == account_id,
        HiringStageTemplate.name == "Resume screening",
    )
    if db.execute(stmt).scalars().first():
        return False

    attribute_specs: tuple[tuple[str, str, str], ...] = (
        ("Technical skills", "Technical", "Languages, frameworks, and systems relevant to the role."),
        ("Problem solving", "Technical", "Decomposition, tradeoffs, debugging, and clarity under ambiguity."),
        ("Communication", "Leadership", "Written and verbal clarity; collaboration across functions."),
        ("Ownership", "Leadership", "Initiative, accountability, and follow-through on outcomes."),
        ("Culture add", "Values", "How the candidate strengthens team norms and psychological safety."),
    )
    name_to_id: dict[str, int] = {}
    for pos, (name, category, description) in enumerate(attribute_specs):
        row = HiringAttribute(
            account_id=account_id,
            name=name,
            category=category,
            description=description,
            position=pos,
            created_at=now,
            updated_at=now,
        )
        db.add(row)
        db.flush()
        name_to_id[name] = row.id

    # Stage name → ordered list of attribute names (focus for that round)
    stage_specs: tuple[tuple[str, tuple[str, ...]], ...] = (
        ("Resume screening", ("Technical skills", "Communication")),
        ("Recruiter screen", ("Communication", "Culture add")),
        ("Technical round 1", ("Technical skills", "Problem solving")),
        ("System design", ("Technical skills", "Problem solving", "Communication")),
        ("Hiring manager interview", ("Ownership", "Communication", "Culture add")),
        ("Final / bar raiser", ("Technical skills", "Problem solving", "Ownership")),
    )
    for pos, (stage_name, attr_names) in enumerate(stage_specs):
        tpl = HiringStageTemplate(
            account_id=account_id,
            name=stage_name,
            default_interviewer_user_ids=[],
            position=pos,
            created_at=now,
            updated_at=now,
        )
        db.add(tpl)
        db.flush()
        for link_pos, aname in enumerate(attr_names):
            aid = name_to_id.get(aname)
            if aid is None:
                continue
            db.add(
                HiringStageTemplateAttribute(
                    hiring_stage_template_id=tpl.id,
                    hiring_attribute_id=aid,
                    position=link_pos,
                    created_at=now,
                    updated_at=now,
                )
            )
    db.flush()
    print("Seeds: structured hiring — 5 attributes and 6 stage templates (resume → final).")
    return True


def run_greenhouse_seed(db: "Session", account_id: int, now: datetime | None = None) -> bool:
    """Return True if any row was created or updated."""
    now = now or datetime.now(timezone.utc)
    changed = False
    if _ensure_role_permissions_for_account(db, account_id, now):
        changed = True
    if _ensure_admin_role_permissions(db, account_id, now):
        changed = True
    for email, name, slug in DEMO_WORKSPACE_USERS:
        if _ensure_demo_user(db, account_id, email, name, slug, now):
            changed = True
    if _ensure_demo_job_and_team(db, account_id, now):
        changed = True
    if _ensure_structured_hiring_demo(db, account_id, now):
        changed = True
    return changed

"""Merge-field resolution for e-sign HTML templates ({candidate_name}, custom maps, etc.)."""
from __future__ import annotations

import re
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.application import Application
from app.models.hiring_plan import HiringPlan
from app.models.job import Job

_PLACEHOLDER_RE = re.compile(r"\{([a-zA-Z0-9_]+)\}")


def _str_val(v: Any) -> str:
    if v is None:
        return ""
    if isinstance(v, (date, datetime)):
        return v.isoformat()
    if isinstance(v, Decimal):
        return str(v)
    return str(v)


def _base_context(db: Session, application: Application, job: Job, account: Account) -> dict[str, str]:
    plan = HiringPlan.find_by(db, account_id=application.account_id, job_id=application.job_id)
    smin, smax = job.salary_min, job.salary_max
    if smin is not None or smax is not None:
        parts = []
        if smin is not None:
            parts.append(_str_val(smin))
        if smax is not None:
            parts.append(_str_val(smax))
        salary_range = f"{job.salary_currency} {' – '.join(parts)}"
    else:
        salary_range = ""

    ctx = {
        "candidate_name": _str_val(application.candidate_name),
        "candidate_email": _str_val(application.candidate_email),
        "candidate_phone": _str_val(application.candidate_phone),
        "candidate_location": _str_val(application.candidate_location),
        "job_title": _str_val(job.title),
        "company_name": _str_val(account.name),
        "department": _str_val(job.department),
        "location": _str_val(job.location),
        "requisition_id": _str_val(job.requisition_id),
        "salary_min": _str_val(job.salary_min),
        "salary_max": _str_val(job.salary_max),
        "salary_currency": _str_val(job.salary_currency),
        "salary_range": salary_range,
        "today": datetime.now(timezone.utc).date().isoformat(),
        "hiring_plan_deadline": "",
        "hiring_plan_target_hires": "",
    }
    if plan:
        ctx["hiring_plan_deadline"] = plan.deadline.isoformat() if plan.deadline else ""
        ctx["hiring_plan_target_hires"] = _str_val(plan.target_hires)
    return ctx


def _resolve_dotted_path(db: Session, application: Application, job: Job, account: Account, path: str) -> str:
    path = (path or "").strip().lower()
    if not path:
        return ""
    head, _, tail = path.partition(".")
    if head == "application":
        return _str_val(getattr(application, tail, None))
    if head == "job":
        return _str_val(getattr(job, tail, None))
    if head == "account":
        return _str_val(getattr(account, tail, None))
    if head == "hiring_plan":
        plan = HiringPlan.find_by(db, account_id=application.account_id, job_id=application.job_id)
        if not plan:
            return ""
        return _str_val(getattr(plan, tail, None))
    return ""


def build_merge_context(
    db: Session,
    application: Application,
    job: Job,
    account: Account,
    field_map: dict[str, str] | None,
) -> dict[str, str]:
    """
    field_map: placeholder_name -> dotted path, e.g. {"joining_date": "hiring_plan.deadline"}.
    """
    ctx = _base_context(db, application, job, account)
    for key, dotted in (field_map or {}).items():
        k = (key or "").strip()
        if not k:
            continue
        ctx[k] = _resolve_dotted_path(db, application, job, account, dotted)
    return ctx


def apply_merge_fields(html: str, context: dict[str, str]) -> str:
    def repl(m: re.Match[str]) -> str:
        name = m.group(1)
        return context.get(name, "")

    return _PLACEHOLDER_RE.sub(repl, html or "")

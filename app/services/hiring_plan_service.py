"""HiringPlanService — tenant-scoped hiring targets + health signals."""
from datetime import date, datetime, timezone
from typing import Any, Optional
from sqlalchemy import select
from app.models.hiring_plan import HiringPlan
from app.models.job import Job
from app.services.base_service import BaseService


def _parse_deadline(value: Any) -> Optional[date]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        return date.fromisoformat(value[:10])
    return None


def _health_for_plan(plan: HiringPlan) -> dict[str, Any]:
    target = plan.target_hires or 1
    made = plan.hires_made or 0
    if plan.plan_status != "active":
        return {
            "label": plan.plan_status,
            "on_track": None,
            "at_risk": False,
            "progress_ratio": (made / target) if target else 0.0,
        }
    if made >= target:
        return {"label": "complete", "on_track": True, "at_risk": False, "progress_ratio": 1.0}
    dl = plan.deadline
    if not dl:
        return {
            "label": "no_deadline",
            "on_track": True,
            "at_risk": False,
            "progress_ratio": (made / target) if target else 0.0,
        }
    today = date.today()
    days_left = (dl - today).days
    remaining = max(target - made, 0)
    ratio = (made / target) if target else 0.0
    if days_left < 0:
        return {"label": "overdue", "on_track": False, "at_risk": True, "days_left": days_left, "remaining_hires": remaining, "progress_ratio": ratio}
    if days_left == 0:
        at_risk = remaining > 0
        return {
            "label": "due_today",
            "on_track": not at_risk,
            "at_risk": at_risk,
            "days_left": 0,
            "remaining_hires": remaining,
            "progress_ratio": ratio,
        }
    # Need at least one hire per calendar day on average to finish on time
    at_risk = days_left < remaining
    return {
        "label": "active",
        "on_track": not at_risk,
        "at_risk": at_risk,
        "days_left": days_left,
        "remaining_hires": remaining,
        "progress_ratio": ratio,
    }


class HiringPlanService(BaseService):
    def _serialize(self, plan: HiringPlan) -> dict[str, Any]:
        d = plan.to_dict()
        d["health"] = _health_for_plan(plan)
        return d

    def list_plans(self, account_id: int, job_id: int | None = None) -> dict:
        stmt = select(HiringPlan).where(HiringPlan.account_id == account_id)
        if job_id is not None:
            stmt = stmt.where(HiringPlan.job_id == job_id)
        stmt = stmt.order_by(HiringPlan.created_at.desc())
        rows = list(self.db.execute(stmt).scalars().all())
        return self.success([self._serialize(p) for p in rows])

    def get_plan(self, account_id: int, plan_id: int) -> dict:
        plan = HiringPlan.find_by(self.db, id=plan_id, account_id=account_id)
        if not plan:
            return self.failure("Hiring plan not found")
        return self.success(self._serialize(plan))

    def get_plan_for_job(self, account_id: int, job_id: int) -> dict:
        plan = HiringPlan.find_by(self.db, account_id=account_id, job_id=job_id)
        if not plan:
            return self.failure("Hiring plan not found")
        return self.success(self._serialize(plan))

    def create_plan(self, account_id: int, data: dict) -> dict:
        job_id = data.get("job_id")
        if not job_id:
            return self.failure("job_id is required")
        job = Job.find_by(self.db, id=job_id, account_id=account_id)
        if not job or job.deleted_at:
            return self.failure("Job not found")
        if HiringPlan.find_by(self.db, account_id=account_id, job_id=job_id):
            return self.failure("A hiring plan already exists for this job")
        now = datetime.now(timezone.utc)
        plan = HiringPlan(
            account_id=account_id,
            job_id=job_id,
            target_hires=int(data.get("target_hires", 1)),
            hires_made=int(data.get("hires_made", 0)),
            deadline=_parse_deadline(data.get("deadline")),
            hiring_manager_id=data.get("hiring_manager_id"),
            primary_recruiter_id=data.get("primary_recruiter_id"),
            plan_status=data.get("plan_status", "active"),
            created_at=now,
            updated_at=now,
        )
        plan.save(self.db)
        return self.success(self._serialize(plan))

    def update_plan(self, account_id: int, plan_id: int, data: dict) -> dict:
        plan = HiringPlan.find_by(self.db, id=plan_id, account_id=account_id)
        if not plan:
            return self.failure("Hiring plan not found")
        if "target_hires" in data:
            plan.target_hires = int(data["target_hires"])
        if "hires_made" in data:
            plan.hires_made = int(data["hires_made"])
        if "deadline" in data:
            plan.deadline = _parse_deadline(data.get("deadline"))
        if "hiring_manager_id" in data:
            plan.hiring_manager_id = data.get("hiring_manager_id")
        if "primary_recruiter_id" in data:
            plan.primary_recruiter_id = data.get("primary_recruiter_id")
        if "plan_status" in data and data["plan_status"]:
            plan.plan_status = data["plan_status"]
        plan.updated_at = datetime.now(timezone.utc)
        plan.save(self.db)
        return self.success(self._serialize(plan))

    def delete_plan(self, account_id: int, plan_id: int) -> dict:
        plan = HiringPlan.find_by(self.db, id=plan_id, account_id=account_id)
        if not plan:
            return self.failure("Hiring plan not found")
        plan.destroy(self.db)
        return self.success({"deleted": True})

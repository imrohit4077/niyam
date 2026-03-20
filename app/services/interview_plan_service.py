"""Interview plans + kits CRUD (tenant + job scoped)."""
from __future__ import annotations

from datetime import datetime, timezone
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.job import Job
from app.models.interview_plan import InterviewPlan
from app.models.interview_kit import InterviewKit
from app.models.pipeline_stage import PipelineStage
from app.services.base_service import BaseService


class InterviewPlanService(BaseService):
    def _next_position(self, account_id: int, job_id: int) -> int:
        m = self.db.scalar(
            select(func.max(InterviewPlan.position)).where(
                InterviewPlan.account_id == account_id,
                InterviewPlan.job_id == job_id,
            )
        )
        return (m or 0) + 1

    def _plan_with_kit(self, plan: InterviewPlan) -> dict:
        d = plan.to_dict()
        kit = InterviewKit.find_by(self.db, interview_plan_id=plan.id)
        d["kit"] = kit.to_dict() if kit else None
        return d

    def list_for_job(self, account_id: int, job_id: int) -> dict:
        job = Job.find_by(self.db, id=job_id, account_id=account_id)
        if not job or job.deleted_at:
            return self.failure("Job not found")
        stmt = (
            select(InterviewPlan)
            .where(InterviewPlan.account_id == account_id, InterviewPlan.job_id == job_id)
            .order_by(InterviewPlan.position.asc(), InterviewPlan.id.asc())
        )
        rows = list(self.db.execute(stmt).scalars().all())
        return self.success([self._plan_with_kit(p) for p in rows])

    def create(self, account_id: int, job_id: int, data: dict) -> dict:
        job = Job.find_by(self.db, id=job_id, account_id=account_id)
        if not job or job.deleted_at:
            return self.failure("Job not found")
        name = (data.get("name") or "").strip()
        if not name:
            return self.failure("name is required")

        psid = data.get("pipeline_stage_id")
        if psid is not None:
            st = PipelineStage.find_by(self.db, id=psid, account_id=account_id, job_id=job_id)
            if not st:
                return self.failure("pipeline_stage_id not found for this job")

        now = datetime.now(timezone.utc)
        pos = data.get("position")
        if pos is None:
            pos = self._next_position(account_id, job_id)

        plan = InterviewPlan(
            account_id=account_id,
            job_id=job_id,
            name=name,
            pipeline_stage_id=psid,
            position=int(pos),
            duration_minutes=data.get("duration_minutes"),
            interview_format=data.get("interview_format"),
            created_at=now,
            updated_at=now,
        )
        plan.save(self.db)

        kit_payload = data.get("kit")
        if kit_payload and isinstance(kit_payload, dict):
            kit = InterviewKit(
                account_id=account_id,
                interview_plan_id=plan.id,
                focus_area=kit_payload.get("focus_area"),
                instructions=kit_payload.get("instructions"),
                questions=kit_payload.get("questions") if isinstance(kit_payload.get("questions"), list) else [],
                created_at=now,
                updated_at=now,
            )
            kit.save(self.db)

        return self.success(self._plan_with_kit(plan))

    def get(self, account_id: int, plan_id: int) -> dict:
        plan = InterviewPlan.find_by(self.db, id=plan_id, account_id=account_id)
        if not plan:
            return self.failure("Interview plan not found")
        return self.success(self._plan_with_kit(plan))

    def update(self, account_id: int, plan_id: int, data: dict) -> dict:
        plan = InterviewPlan.find_by(self.db, id=plan_id, account_id=account_id)
        if not plan:
            return self.failure("Interview plan not found")
        if "name" in data and data["name"]:
            plan.name = str(data["name"]).strip()
        if "position" in data and data["position"] is not None:
            plan.position = int(data["position"])
        if "pipeline_stage_id" in data:
            psid = data.get("pipeline_stage_id")
            if psid is not None:
                st = PipelineStage.find_by(self.db, id=psid, account_id=account_id, job_id=plan.job_id)
                if not st:
                    return self.failure("pipeline_stage_id not found for this job")
            plan.pipeline_stage_id = psid
        if "duration_minutes" in data:
            dm = data.get("duration_minutes")
            plan.duration_minutes = int(dm) if dm is not None and dm != "" else None
        if "interview_format" in data:
            plan.interview_format = data.get("interview_format")
        plan.updated_at = datetime.now(timezone.utc)
        plan.save(self.db)
        return self.success(self._plan_with_kit(plan))

    def delete(self, account_id: int, plan_id: int) -> dict:
        plan = InterviewPlan.find_by(self.db, id=plan_id, account_id=account_id)
        if not plan:
            return self.failure("Interview plan not found")
        plan.destroy(self.db)
        return self.success({"deleted": True})

    def upsert_kit(self, account_id: int, plan_id: int, data: dict) -> dict:
        plan = InterviewPlan.find_by(self.db, id=plan_id, account_id=account_id)
        if not plan:
            return self.failure("Interview plan not found")
        now = datetime.now(timezone.utc)
        kit = InterviewKit.find_by(self.db, interview_plan_id=plan_id)
        questions = data.get("questions")
        if questions is not None and not isinstance(questions, list):
            return self.failure("questions must be a list")

        if kit:
            if "focus_area" in data:
                kit.focus_area = data.get("focus_area")
            if "instructions" in data:
                kit.instructions = data.get("instructions")
            if questions is not None:
                kit.questions = questions
            kit.updated_at = now
            kit.save(self.db)
        else:
            kit = InterviewKit(
                account_id=account_id,
                interview_plan_id=plan_id,
                focus_area=data.get("focus_area"),
                instructions=data.get("instructions"),
                questions=questions if questions is not None else [],
                created_at=now,
                updated_at=now,
            )
            kit.save(self.db)
        return self.success(kit.to_dict())

    def get_kit(self, account_id: int, plan_id: int) -> dict:
        plan = InterviewPlan.find_by(self.db, id=plan_id, account_id=account_id)
        if not plan:
            return self.failure("Interview plan not found")
        kit = InterviewKit.find_by(self.db, interview_plan_id=plan_id)
        if not kit:
            return self.success(
                {
                    "interview_plan_id": plan_id,
                    "focus_area": None,
                    "instructions": None,
                    "questions": [],
                }
            )
        return self.success(kit.to_dict())

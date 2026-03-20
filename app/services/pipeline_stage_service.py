"""PipelineStageService — ordered Kanban stages per job (tenant-scoped)."""
from datetime import datetime, timezone
from sqlalchemy import select, func
from app.models.job import Job
from app.models.pipeline_stage import PipelineStage
from app.services.base_service import BaseService


class PipelineStageService(BaseService):
    def _ensure_job(self, account_id: int, job_id: int) -> Job | None:
        job = Job.find_by(self.db, id=job_id, account_id=account_id)
        if not job or job.deleted_at:
            return None
        return job

    def list_for_job(self, account_id: int, job_id: int) -> dict:
        if not self._ensure_job(account_id, job_id):
            return self.failure("Job not found")
        stmt = (
            select(PipelineStage)
            .where(
                PipelineStage.account_id == account_id,
                PipelineStage.job_id == job_id,
            )
            .order_by(PipelineStage.position.asc(), PipelineStage.id.asc())
        )
        rows = list(self.db.execute(stmt).scalars().all())
        return self.success([s.to_dict() for s in rows])

    def create_stage(self, account_id: int, job_id: int, data: dict) -> dict:
        if not self._ensure_job(account_id, job_id):
            return self.failure("Job not found")
        name = (data.get("name") or "").strip()
        if not name:
            return self.failure("name is required")
        now = datetime.now(timezone.utc)
        pos = data.get("position")
        if pos is None:
            max_pos = self.db.scalar(
                select(func.max(PipelineStage.position)).where(
                    PipelineStage.account_id == account_id,
                    PipelineStage.job_id == job_id,
                )
            )
            pos = (max_pos or 0) + 1
        stage = PipelineStage(
            account_id=account_id,
            job_id=job_id,
            name=name,
            position=int(pos),
            stage_type=data.get("stage_type"),
            automation_rules=data.get("automation_rules") or {},
            created_at=now,
            updated_at=now,
        )
        stage.save(self.db)
        return self.success(stage.to_dict())

    def get_stage(self, account_id: int, stage_id: int) -> dict:
        stage = PipelineStage.find_by(self.db, id=stage_id, account_id=account_id)
        if not stage:
            return self.failure("Pipeline stage not found")
        return self.success(stage.to_dict())

    def update_stage(self, account_id: int, stage_id: int, data: dict) -> dict:
        stage = PipelineStage.find_by(self.db, id=stage_id, account_id=account_id)
        if not stage:
            return self.failure("Pipeline stage not found")
        if "name" in data and data["name"]:
            stage.name = str(data["name"]).strip()
        if "position" in data and data["position"] is not None:
            stage.position = int(data["position"])
        if "stage_type" in data:
            stage.stage_type = data.get("stage_type")
        if "automation_rules" in data and isinstance(data["automation_rules"], dict):
            stage.automation_rules = data["automation_rules"]
        stage.updated_at = datetime.now(timezone.utc)
        stage.save(self.db)
        return self.success(stage.to_dict())

    def delete_stage(self, account_id: int, stage_id: int) -> dict:
        stage = PipelineStage.find_by(self.db, id=stage_id, account_id=account_id)
        if not stage:
            return self.failure("Pipeline stage not found")
        stage.destroy(self.db)
        return self.success({"deleted": True})

    def reorder_stages(self, account_id: int, job_id: int, ordered_ids: list) -> dict:
        if not self._ensure_job(account_id, job_id):
            return self.failure("Job not found")
        if not isinstance(ordered_ids, list) or not ordered_ids:
            return self.failure("ordered_ids must be a non-empty list")
        stmt = select(PipelineStage).where(
            PipelineStage.account_id == account_id,
            PipelineStage.job_id == job_id,
        )
        existing = {s.id: s for s in self.db.execute(stmt).scalars().all()}
        if set(ordered_ids) != set(existing.keys()):
            return self.failure("ordered_ids must include every stage id for this job exactly once")
        now = datetime.now(timezone.utc)
        for idx, sid in enumerate(ordered_ids, start=1):
            st = existing[int(sid)]
            st.position = idx
            st.updated_at = now
            st.save(self.db)
        return self.list_for_job(account_id, job_id)

"""Pipeline stage → e-sign template automation rules."""
from datetime import datetime, timezone

from sqlalchemy import or_, select

from app.models.esign_stage_rule import EsignStageRule
from app.models.esign_template import EsignTemplate
from app.models.job import Job
from app.models.pipeline_stage import PipelineStage
from app.services.base_service import BaseService


class EsignRuleService(BaseService):
    def list_rules(self, account_id: int, job_id: int | None = None) -> dict:
        stmt = select(EsignStageRule).where(EsignStageRule.account_id == account_id)
        if job_id is not None:
            stmt = stmt.where(
                or_(EsignStageRule.job_id == job_id, EsignStageRule.job_id.is_(None))
            )
        stmt = stmt.order_by(EsignStageRule.updated_at.desc())
        rows = list(self.db.execute(stmt).scalars().all())
        return self.success([r.to_dict() for r in rows])

    def get_rule(self, account_id: int, rule_id: int) -> dict:
        r = EsignStageRule.find_by(self.db, id=rule_id, account_id=account_id)
        if not r:
            return self.failure("Rule not found")
        return self.success(r.to_dict())

    def create_rule(self, account_id: int, data: dict) -> dict:
        template_id = data.get("template_id")
        if not template_id:
            return self.failure("template_id is required")
        tpl = EsignTemplate.find_by(self.db, id=int(template_id), account_id=account_id)
        if not tpl:
            return self.failure("Template not found")

        job_id = data.get("job_id")
        pipeline_stage_id = data.get("pipeline_stage_id")
        trigger_stage_type = (data.get("trigger_stage_type") or "").strip() or None

        if job_id is not None:
            job_id = int(job_id)
            job = Job.find_by(self.db, id=job_id, account_id=account_id)
            if not job or job.deleted_at:
                return self.failure("Job not found")
            if not pipeline_stage_id:
                return self.failure("pipeline_stage_id is required for job-specific rules")
            pipeline_stage_id = int(pipeline_stage_id)
            st = PipelineStage.find_by(self.db, id=pipeline_stage_id, account_id=account_id, job_id=job_id)
            if not st:
                return self.failure("Pipeline stage not found for this job")
            job_id_val = job_id
            stage_id_val = pipeline_stage_id
            type_val = None
        else:
            if not trigger_stage_type:
                return self.failure("trigger_stage_type is required for account-wide rules")
            job_id_val = None
            stage_id_val = None
            type_val = trigger_stage_type

        now = datetime.now(timezone.utc)
        r = EsignStageRule(
            account_id=account_id,
            job_id=job_id_val,
            pipeline_stage_id=stage_id_val,
            trigger_stage_type=type_val,
            action_type=(data.get("action_type") or "send_esign").strip() or "send_esign",
            template_id=tpl.id,
            is_active=bool(data.get("is_active", True)),
            created_at=now,
            updated_at=now,
        )
        r.save(self.db)
        return self.success(r.to_dict())

    def update_rule(self, account_id: int, rule_id: int, data: dict) -> dict:
        r = EsignStageRule.find_by(self.db, id=rule_id, account_id=account_id)
        if not r:
            return self.failure("Rule not found")
        if "is_active" in data:
            r.is_active = bool(data["is_active"])
        if "template_id" in data and data["template_id"]:
            tid = int(data["template_id"])
            tpl = EsignTemplate.find_by(self.db, id=tid, account_id=account_id)
            if not tpl:
                return self.failure("Template not found")
            r.template_id = tid
        r.updated_at = datetime.now(timezone.utc)
        r.save(self.db)
        return self.success(r.to_dict())

    def delete_rule(self, account_id: int, rule_id: int) -> dict:
        r = EsignStageRule.find_by(self.db, id=rule_id, account_id=account_id)
        if not r:
            return self.failure("Rule not found")
        r.destroy(self.db)
        return self.success({"deleted": True})

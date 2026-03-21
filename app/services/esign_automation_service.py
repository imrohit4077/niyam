"""Stage transition → rules → internal e-sign only (merge + signing link in-app)."""
from __future__ import annotations

import secrets
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import select

from app.helpers.esign_merge import apply_merge_fields, build_merge_context
from app.models.account import Account
from app.models.application import Application
from app.models.esign_request import EsignRequest
from app.models.esign_stage_rule import EsignStageRule
from app.models.esign_template import EsignTemplate
from app.models.job import Job
from app.models.pipeline_stage import PipelineStage
from app.services.base_service import BaseService
from app.services.esign_settings_service import merged_esign_config
from app.helpers.logger import get_logger
from config.settings import get_settings

logger = get_logger(__name__)


_ACTIVE_STATUSES = frozenset({"queued", "sent", "viewed", "signed"})


def _maybe_write_html_artifact(account_id: int, request_id: int, html: str) -> None:
    raw = (get_settings().ESIGN_ARTIFACTS_DIR or "").strip()
    if not raw:
        return
    root = Path(raw).expanduser().resolve() / str(account_id)
    root.mkdir(parents=True, exist_ok=True)
    (root / f"{request_id}.html").write_text(html, encoding="utf-8")


def _signing_base_url(account: Account) -> str:
    cfg = merged_esign_config(account.settings if isinstance(account.settings, dict) else {})
    base = (cfg.get("frontend_base_url") or "").strip()
    if base:
        return base.rstrip("/")
    return (get_settings().FRONTEND_PUBLIC_URL or "").strip().rstrip("/")


class EsignAutomationService(BaseService):
    def find_matching_rules(
        self,
        account_id: int,
        job_id: int,
        new_pipeline_stage_id: int,
    ) -> list[EsignStageRule]:
        stage = PipelineStage.find_by(
            self.db, id=new_pipeline_stage_id, account_id=account_id, job_id=job_id
        )
        if not stage:
            return []

        stmt_job = select(EsignStageRule).where(
            EsignStageRule.account_id == account_id,
            EsignStageRule.is_active.is_(True),
            EsignStageRule.job_id == job_id,
            EsignStageRule.pipeline_stage_id == new_pipeline_stage_id,
        )
        job_rules = list(self.db.execute(stmt_job).scalars().all())

        type_rules: list[EsignStageRule] = []
        if stage.stage_type:
            stmt_type = select(EsignStageRule).where(
                EsignStageRule.account_id == account_id,
                EsignStageRule.is_active.is_(True),
                EsignStageRule.job_id.is_(None),
                EsignStageRule.trigger_stage_type == stage.stage_type,
            )
            type_rules = list(self.db.execute(stmt_type).scalars().all())

        merged: dict[int, EsignStageRule] = {}
        for r in job_rules + type_rules:
            merged[r.id] = r
        return list(merged.values())

    def _has_open_request(self, application_id: int, template_id: int) -> bool:
        stmt = select(EsignRequest.id).where(
            EsignRequest.application_id == application_id,
            EsignRequest.template_id == template_id,
            EsignRequest.status.in_(_ACTIVE_STATUSES),
        )
        return self.db.execute(stmt).first() is not None

    def _append_event(self, req: EsignRequest, event_type: str, extra: dict | None = None) -> None:
        ev = list(req.events or [])
        row: dict[str, Any] = {
            "at": datetime.now(timezone.utc).isoformat(),
            "type": event_type,
        }
        if extra:
            row.update(extra)
        ev.append(row)
        req.events = ev

    def _deliver_internal_mutate(self, req: EsignRequest, account: Account) -> None:
        tpl = None
        if req.template_id:
            tpl = EsignTemplate.find_by(self.db, id=req.template_id, account_id=req.account_id)
        app = Application.find_by(self.db, id=req.application_id, account_id=req.account_id)
        if not app or app.deleted_at or not tpl:
            req.status = "error"
            self._append_event(req, "delivery_failed", {"reason": "missing_template_or_application"})
            return

        job = Job.find_by(self.db, id=app.job_id, account_id=req.account_id)
        if not job or job.deleted_at:
            req.status = "error"
            self._append_event(req, "delivery_failed", {"reason": "job_not_found"})
            return

        cfg = merged_esign_config(account.settings if isinstance(account.settings, dict) else {})
        ctx = build_merge_context(self.db, app, job, account, cfg.get("field_map"))
        merged = apply_merge_fields(tpl.content_html, ctx)
        now = datetime.now(timezone.utc)
        req.rendered_html = merged
        if getattr(req, "id", None):
            _maybe_write_html_artifact(req.account_id, int(req.id), merged)
        req.candidate_sign_token = secrets.token_urlsafe(32)
        base = _signing_base_url(account)
        if base:
            req.signing_url = f"{base}/esign/sign/{req.candidate_sign_token}"
        else:
            req.signing_url = f"/esign/sign/{req.candidate_sign_token}"
        req.provider = "internal"
        req.status = "sent"
        req.sent_at = now
        req.updated_at = now
        self._append_event(req, "sent", {"provider": "internal"})

    def deliver_request(self, request_id: int) -> None:
        req = self.db.get(EsignRequest, request_id)
        if not req:
            return
        if req.status in ("sent", "viewed", "signed"):
            return
        account = Account.find_by(self.db, id=req.account_id)
        if not account:
            return
        self._deliver_internal_mutate(req, account)
        req.save(self.db)

    def queue_matching_esign_requests(
        self,
        account_id: int,
        application_id: int,
        new_pipeline_stage_id: int,
    ) -> list[int]:
        """
        Create EsignRequest rows in ``queued`` state for every active rule matching the new stage.
        Does not merge HTML or assign signing URLs — use ``deliver_request`` (often via Celery).
        """
        app = Application.find_by(self.db, id=application_id, account_id=account_id)
        if not app or app.deleted_at:
            return []
        account = Account.find_by(self.db, id=account_id)
        if not account:
            return []

        rules = self.find_matching_rules(account_id, app.job_id, new_pipeline_stage_id)
        if not rules:
            logger.info(
                "esign queue: no matching rules",
                extra={
                    "account_id": account_id,
                    "application_id": application_id,
                    "new_pipeline_stage_id": new_pipeline_stage_id,
                },
            )
            return []

        now = datetime.now(timezone.utc)
        ids: list[int] = []
        for rule in rules:
            if self._has_open_request(application_id, rule.template_id):
                continue
            req = EsignRequest(
                account_id=account_id,
                application_id=application_id,
                template_id=rule.template_id,
                rule_id=rule.id,
                provider="internal",
                status="queued",
                candidate_sign_token=secrets.token_urlsafe(32),
                created_at=now,
                updated_at=now,
            )
            self.db.add(req)
            self.db.flush()
            self._append_event(req, "queued", {"rule_id": rule.id})
            req.save(self.db)
            ids.append(int(req.id))

        logger.info(
            "esign queue: created %s request(s) for stage transition",
            len(ids),
            extra={
                "account_id": account_id,
                "application_id": application_id,
                "new_pipeline_stage_id": new_pipeline_stage_id,
                "esign_request_ids": ids,
            },
        )
        return ids

    def handle_stage_transition(
        self,
        account_id: int,
        application_id: int,
        new_pipeline_stage_id: int | None,
    ) -> None:
        """Synchronous path: queue rows + deliver immediately (API fallback when Celery is down)."""
        if new_pipeline_stage_id is None:
            return
        ids = self.queue_matching_esign_requests(account_id, application_id, new_pipeline_stage_id)
        for rid in ids:
            self.deliver_request(rid)

    def manual_generate_documents(
        self,
        account_id: int,
        application_id: int,
        template_id: int | None = None,
    ) -> dict:
        """
        Recruiter-triggered generation: one specific template, or all active rules matching the
        application's current pipeline column (same as automation, without a stage change).
        """
        app = Application.find_by(self.db, id=application_id, account_id=account_id)
        if not app or app.deleted_at:
            return self.failure("Application not found")
        account = Account.find_by(self.db, id=account_id)
        if not account:
            return self.failure("Account not found")

        now = datetime.now(timezone.utc)
        created: list[EsignRequest] = []

        if template_id is not None:
            tpl = EsignTemplate.find_by(self.db, id=template_id, account_id=account_id)
            if not tpl:
                return self.failure("Template not found")
            if self._has_open_request(application_id, template_id):
                return self.failure("An open signing request already exists for this template")
            req = EsignRequest(
                account_id=account_id,
                application_id=application_id,
                template_id=template_id,
                rule_id=None,
                provider="internal",
                status="queued",
                candidate_sign_token=secrets.token_urlsafe(32),
                created_at=now,
                updated_at=now,
            )
            self.db.add(req)
            self.db.flush()
            self._append_event(req, "queued", {"manual": True})
            self._deliver_internal_mutate(req, account)
            req.save(self.db)
            created.append(req)
            return self.success([r.to_dict() for r in created])

        if app.pipeline_stage_id is None:
            return self.failure(
                "Assign a pipeline column first, or choose a specific template to generate."
            )

        rules = self.find_matching_rules(account_id, app.job_id, app.pipeline_stage_id)
        if not rules:
            return self.failure(
                "No active e-sign rules match this pipeline column. Add rules under Settings → E-sign or pick a template."
            )

        for rule in rules:
            if self._has_open_request(application_id, rule.template_id):
                continue
            req = EsignRequest(
                account_id=account_id,
                application_id=application_id,
                template_id=rule.template_id,
                rule_id=rule.id,
                provider="internal",
                status="queued",
                candidate_sign_token=secrets.token_urlsafe(32),
                created_at=now,
                updated_at=now,
            )
            self.db.add(req)
            self.db.flush()
            self._append_event(req, "queued", {"rule_id": rule.id, "manual": True})
            self._deliver_internal_mutate(req, account)
            req.save(self.db)
            created.append(req)

        if not created:
            return self.failure(
                "All matching templates already have an open signing request for this candidate."
            )
        return self.success([r.to_dict() for r in created])

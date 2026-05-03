"""Role kickoff requests — HM intake, recruiter workflow, job conversion."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select

from app.models.account_user import AccountUser
from app.models.hiring_attribute import HiringAttribute
from app.models.hiring_stage_template import HiringStageTemplate
from app.models.hiring_stage_template_attribute import HiringStageTemplateAttribute
from app.models.job import Job
from app.models.pipeline_stage import PipelineStage
from app.models.role_kickoff_request import RoleKickoffRequest
from app.models.user import User
from app.services.base_service import BaseService
from app.services.job_service import JobService


def _coerce_str_list(raw: Any) -> list[str]:
    if raw is None:
        return []
    if isinstance(raw, list):
        return [str(x).strip() for x in raw if str(x).strip()]
    if isinstance(raw, str) and raw.strip():
        return [s.strip() for s in raw.split(",") if s.strip()]
    return []


def _parse_openings(raw: Any) -> int:
    try:
        return max(1, int(raw))
    except (TypeError, ValueError):
        return 1


def _build_job_description(k: RoleKickoffRequest) -> str:
    parts: list[str] = []
    if k.why_hiring:
        parts.append(f"## Why we're hiring\n{k.why_hiring.strip()}")
    if k.expectation_30_60_90:
        parts.append(f"## 30 / 60 / 90 day expectations\n{k.expectation_30_60_90.strip()}")
    if k.success_definition:
        parts.append(f"## Definition of success\n{k.success_definition.strip()}")
    must = k.skills_must_have if isinstance(k.skills_must_have, list) else []
    nice = k.skills_nice_to_have if isinstance(k.skills_nice_to_have, list) else []
    if must:
        parts.append("## Must-have skills\n" + "\n".join(f"- {x}" for x in must))
    if nice:
        parts.append("## Good-to-have skills\n" + "\n".join(f"- {x}" for x in nice))
    if k.experience_note:
        parts.append(f"## Experience\n{k.experience_note.strip()}")
    if k.budget_notes:
        parts.append(f"## Compensation / budget notes\n{k.budget_notes.strip()}")
    if k.interview_rounds is not None or k.interviewers_note:
        iv = []
        if k.interview_rounds is not None:
            iv.append(f"Target rounds: **{k.interview_rounds}**")
        if k.interviewers_note:
            iv.append(k.interviewers_note.strip())
        parts.append("## Interview plan\n" + "\n\n".join(iv))
    return "\n\n".join(parts) if parts else ""


class RoleKickoffRequestService(BaseService):
    def _template_default_attr_ids(self, template_id: int) -> list[int]:
        stmt = (
            select(HiringStageTemplateAttribute.hiring_attribute_id)
            .where(HiringStageTemplateAttribute.hiring_stage_template_id == template_id)
            .order_by(HiringStageTemplateAttribute.position.asc(), HiringStageTemplateAttribute.id.asc())
        )
        return [int(x) for x in self.db.execute(stmt).scalars().all()]

    def _normalize_selected_stages_for_storage(self, account_id: int, raw: Any) -> tuple[list[dict[str, Any]], str | None]:
        if raw is None:
            return [], None
        if not isinstance(raw, list):
            return [], "selected_stages must be an array"
        out: list[dict[str, Any]] = []
        for i, item in enumerate(raw):
            if not isinstance(item, dict):
                return [], f"selected_stages[{i}] must be an object"
            tid = item.get("stage_template_id") if item.get("stage_template_id") is not None else item.get("id")
            try:
                tid_int = int(tid)
            except (TypeError, ValueError):
                return [], f"selected_stages[{i}].stage_template_id is invalid"
            tpl = HiringStageTemplate.find_by(self.db, id=tid_int, account_id=account_id)
            if not tpl:
                return [], f"Unknown stage template id {tid_int}"
            defaults = self._template_default_attr_ids(tid_int)
            override = item.get("attribute_ids")
            if override is None or (isinstance(override, list) and len(override) == 0):
                attr_ids = list(defaults)
            else:
                if not isinstance(override, list):
                    return [], f"selected_stages[{i}].attribute_ids must be an array"
                attr_ids = []
                for x in override:
                    try:
                        aid = int(x)
                    except (TypeError, ValueError):
                        continue
                    ha = HiringAttribute.find_by(self.db, id=aid, account_id=account_id)
                    if not ha:
                        return [], f"Unknown attribute id {aid}"
                    attr_ids.append(aid)
                if not attr_ids:
                    attr_ids = list(defaults)
            out.append({"stage_template_id": tid_int, "attribute_ids": attr_ids})
        return out, None

    def _hydrate(self, row: RoleKickoffRequest) -> dict[str, Any]:
        d = row.to_dict()
        hm = User.find_by(self.db, id=row.created_by_user_id)
        rec = User.find_by(self.db, id=row.assigned_recruiter_user_id)
        d["hiring_manager_name"] = hm.name if hm else None
        d["hiring_manager_email"] = hm.email if hm else None
        d["recruiter_name"] = rec.name if rec else None
        d["recruiter_email"] = rec.email if rec else None
        return d

    def _member(self, account_id: int, user_id: int) -> AccountUser | None:
        return AccountUser.find_by(self.db, user_id=user_id, account_id=account_id)

    def create(self, account_id: int, hm_user_id: int, body: dict[str, Any]) -> dict:
        rid = body.get("assigned_recruiter_user_id")
        try:
            recruiter_id = int(rid)
        except (TypeError, ValueError):
            return self.failure("assigned_recruiter_user_id is required")
        if not self._member(account_id, recruiter_id):
            return self.failure("Recruiter is not a member of this workspace")
        title = (body.get("title") or "").strip()
        if not title:
            return self.failure("title is required")

        interview_rounds = None
        ir = body.get("interview_rounds")
        if ir not in (None, ""):
            try:
                interview_rounds = int(ir)
            except (TypeError, ValueError):
                return self.failure("interview_rounds must be a number")

        norm_stages, err = self._normalize_selected_stages_for_storage(account_id, body.get("selected_stages"))
        if err:
            return self.failure(err)

        now = datetime.now(timezone.utc)
        row = RoleKickoffRequest(
            account_id=account_id,
            created_by_user_id=hm_user_id,
            assigned_recruiter_user_id=recruiter_id,
            status="submitted",
            title=title,
            department=(body.get("department") or None) and str(body.get("department")).strip() or None,
            open_positions=_parse_openings(body.get("open_positions")),
            location=(body.get("location") or None) and str(body.get("location")).strip() or None,
            why_hiring=(body.get("why_hiring") or None) and str(body.get("why_hiring")).strip() or None,
            expectation_30_60_90=(body.get("expectation_30_60_90") or None)
            and str(body.get("expectation_30_60_90")).strip()
            or None,
            success_definition=(body.get("success_definition") or None)
            and str(body.get("success_definition")).strip()
            or None,
            skills_must_have=_coerce_str_list(body.get("skills_must_have")),
            skills_nice_to_have=_coerce_str_list(body.get("skills_nice_to_have")),
            experience_note=(body.get("experience_note") or None)
            and str(body.get("experience_note")).strip()
            or None,
            salary_min=body.get("salary_min"),
            salary_max=body.get("salary_max"),
            salary_currency=(body.get("salary_currency") or "USD") or "USD",
            budget_notes=(body.get("budget_notes") or None) and str(body.get("budget_notes")).strip() or None,
            interview_rounds=interview_rounds,
            interviewers_note=(body.get("interviewers_note") or None)
            and str(body.get("interviewers_note")).strip()
            or None,
            selected_stages=norm_stages,
            created_at=now,
            updated_at=now,
        )
        row.save(self.db)
        return self.success(self._hydrate(row))

    def list_for_creator(self, account_id: int, user_id: int) -> dict:
        stmt = (
            select(RoleKickoffRequest)
            .where(
                RoleKickoffRequest.account_id == account_id,
                RoleKickoffRequest.created_by_user_id == user_id,
            )
            .order_by(RoleKickoffRequest.created_at.desc())
        )
        rows = list(self.db.execute(stmt).scalars().all())
        return self.success([self._hydrate(r) for r in rows])

    def list_for_recruiter(self, account_id: int, recruiter_user_id: int) -> dict:
        stmt = (
            select(RoleKickoffRequest)
            .where(
                RoleKickoffRequest.account_id == account_id,
                RoleKickoffRequest.assigned_recruiter_user_id == recruiter_user_id,
            )
            .order_by(RoleKickoffRequest.created_at.desc())
        )
        rows = list(self.db.execute(stmt).scalars().all())
        return self.success([self._hydrate(r) for r in rows])

    def list_all(self, account_id: int) -> dict:
        stmt = (
            select(RoleKickoffRequest)
            .where(RoleKickoffRequest.account_id == account_id)
            .order_by(RoleKickoffRequest.created_at.desc())
        )
        rows = list(self.db.execute(stmt).scalars().all())
        return self.success([self._hydrate(r) for r in rows])

    def get(self, account_id: int, kickoff_id: int) -> dict:
        row = RoleKickoffRequest.find_by(self.db, id=kickoff_id, account_id=account_id)
        if not row:
            return self.failure("Kickoff request not found")
        return self.success(self._hydrate(row))

    def approve(self, account_id: int, kickoff_id: int, recruiter_user_id: int) -> dict:
        row = RoleKickoffRequest.find_by(self.db, id=kickoff_id, account_id=account_id)
        if not row:
            return self.failure("Kickoff request not found")
        if row.assigned_recruiter_user_id != recruiter_user_id:
            return self.failure("Not assigned to you")
        if row.status in ("converted", "rejected"):
            return self.failure("Kickoff is closed")
        if row.converted_job_id:
            return self.failure("Already converted to a job")
        row.status = "approved"
        row.recruiter_feedback = None
        row.updated_at = datetime.now(timezone.utc)
        row.save(self.db)
        return self.success(self._hydrate(row))

    def reject(self, account_id: int, kickoff_id: int, recruiter_user_id: int, feedback: str) -> dict:
        row = RoleKickoffRequest.find_by(self.db, id=kickoff_id, account_id=account_id)
        if not row:
            return self.failure("Kickoff request not found")
        if row.assigned_recruiter_user_id != recruiter_user_id:
            return self.failure("Not assigned to you")
        if row.status == "converted":
            return self.failure("Already converted")
        row.status = "rejected"
        row.recruiter_feedback = (feedback or "").strip() or None
        row.updated_at = datetime.now(timezone.utc)
        row.save(self.db)
        return self.success(self._hydrate(row))

    def request_changes(self, account_id: int, kickoff_id: int, recruiter_user_id: int, feedback: str) -> dict:
        row = RoleKickoffRequest.find_by(self.db, id=kickoff_id, account_id=account_id)
        if not row:
            return self.failure("Kickoff request not found")
        if row.assigned_recruiter_user_id != recruiter_user_id:
            return self.failure("Not assigned to you")
        if row.status == "converted":
            return self.failure("Already converted")
        msg = (feedback or "").strip()
        if not msg:
            return self.failure("feedback is required")
        row.status = "changes_requested"
        row.recruiter_feedback = msg
        row.updated_at = datetime.now(timezone.utc)
        row.save(self.db)
        return self.success(self._hydrate(row))

    def resubmit_after_changes(self, account_id: int, kickoff_id: int, hm_user_id: int, body: dict[str, Any]) -> dict:
        row = RoleKickoffRequest.find_by(self.db, id=kickoff_id, account_id=account_id)
        if not row:
            return self.failure("Kickoff request not found")
        if row.created_by_user_id != hm_user_id:
            return self.failure("Not your request")
        if row.status != "changes_requested":
            return self.failure("Only requests in changes_requested can be updated this way")
        # Re-use create field mapping
        if body.get("title"):
            row.title = str(body["title"]).strip()
        if "department" in body:
            row.department = (body.get("department") or None) and str(body.get("department")).strip() or None
        if "open_positions" in body:
            row.open_positions = _parse_openings(body.get("open_positions"))
        if "location" in body:
            row.location = (body.get("location") or None) and str(body.get("location")).strip() or None
        if "why_hiring" in body:
            row.why_hiring = (body.get("why_hiring") or None) and str(body.get("why_hiring")).strip() or None
        if "expectation_30_60_90" in body:
            row.expectation_30_60_90 = (
                (body.get("expectation_30_60_90") or None) and str(body.get("expectation_30_60_90")).strip() or None
            )
        if "success_definition" in body:
            row.success_definition = (
                (body.get("success_definition") or None) and str(body.get("success_definition")).strip() or None
            )
        if "skills_must_have" in body:
            row.skills_must_have = _coerce_str_list(body.get("skills_must_have"))
        if "skills_nice_to_have" in body:
            row.skills_nice_to_have = _coerce_str_list(body.get("skills_nice_to_have"))
        if "experience_note" in body:
            row.experience_note = (
                (body.get("experience_note") or None) and str(body.get("experience_note")).strip() or None
            )
        if "salary_min" in body:
            row.salary_min = body.get("salary_min")
        if "salary_max" in body:
            row.salary_max = body.get("salary_max")
        if "salary_currency" in body:
            row.salary_currency = (body.get("salary_currency") or "USD") or "USD"
        if "budget_notes" in body:
            row.budget_notes = (body.get("budget_notes") or None) and str(body.get("budget_notes")).strip() or None
        if "interview_rounds" in body:
            row.interview_rounds = (
                int(body["interview_rounds"]) if body.get("interview_rounds") not in (None, "") else None
            )
        if "interviewers_note" in body:
            row.interviewers_note = (
                (body.get("interviewers_note") or None) and str(body.get("interviewers_note")).strip() or None
            )
        if body.get("assigned_recruiter_user_id") is not None:
            try:
                nr = int(body["assigned_recruiter_user_id"])
            except (TypeError, ValueError):
                return self.failure("Invalid assigned_recruiter_user_id")
            if not self._member(account_id, nr):
                return self.failure("Recruiter is not a member of this workspace")
            row.assigned_recruiter_user_id = nr
        if "selected_stages" in body:
            norm, err = self._normalize_selected_stages_for_storage(account_id, body.get("selected_stages"))
            if err:
                return self.failure(err)
            row.selected_stages = norm
        row.status = "submitted"
        row.recruiter_feedback = None
        row.updated_at = datetime.now(timezone.utc)
        row.save(self.db)
        return self.success(self._hydrate(row))

    def convert_to_job(self, account_id: int, kickoff_id: int, recruiter_user_id: int) -> dict:
        row = RoleKickoffRequest.find_by(self.db, id=kickoff_id, account_id=account_id)
        if not row:
            return self.failure("Kickoff request not found")
        if row.assigned_recruiter_user_id != recruiter_user_id:
            return self.failure("Not assigned to you")
        if row.status != "approved":
            return self.failure("Kickoff must be approved before creating a job")
        if row.converted_job_id:
            return self.failure("Already converted")

        description = _build_job_description(row)
        job_payload: dict[str, Any] = {
            "title": row.title,
            "department": row.department,
            "location": row.location,
            "open_positions": row.open_positions,
            "salary_min": float(row.salary_min) if row.salary_min is not None else None,
            "salary_max": float(row.salary_max) if row.salary_max is not None else None,
            "salary_currency": row.salary_currency or "USD",
            "hiring_manager_user_id": row.created_by_user_id,
            "recruiter_user_id": row.assigned_recruiter_user_id,
            "status": "draft",
            "description": description,
            "role_kickoff_request_id": row.id,
            "bonus_incentives": row.budget_notes,
        }
        js = JobService(self.db)
        res = js.create_job(account_id, recruiter_user_id, job_payload)
        if not res["ok"]:
            return res
        job_data = res["data"]
        jid = job_data.get("id")
        if not jid:
            return self.failure("Job created but missing id")
        jid_int = int(jid)
        now = datetime.now(timezone.utc)

        raw_stages = row.selected_stages if isinstance(row.selected_stages, list) else []
        snapshot: list[dict[str, Any]] = []
        for order, item in enumerate(raw_stages):
            if not isinstance(item, dict):
                continue
            try:
                tid = int(item.get("stage_template_id", 0))
            except (TypeError, ValueError):
                continue
            tpl = HiringStageTemplate.find_by(self.db, id=tid, account_id=account_id)
            if not tpl:
                continue
            attr_raw = item.get("attribute_ids") if isinstance(item.get("attribute_ids"), list) else []
            focus_ids: list[int] = []
            for x in attr_raw:
                try:
                    focus_ids.append(int(x))
                except (TypeError, ValueError):
                    continue
            iv_raw = tpl.default_interviewer_user_ids if isinstance(tpl.default_interviewer_user_ids, list) else []
            interviewer_ids: list[int] = []
            for x in iv_raw:
                try:
                    interviewer_ids.append(int(x))
                except (TypeError, ValueError):
                    continue
            snapshot.append(
                {
                    "order": order,
                    "stage_template_id": tid,
                    "name": tpl.name,
                    "focus_attribute_ids": focus_ids,
                    "default_interviewer_user_ids": interviewer_ids,
                }
            )

        job = Job.find_by(self.db, id=jid_int, account_id=account_id)
        if job and snapshot:
            jc = dict(job.job_config) if isinstance(job.job_config, dict) else {}
            jc["structured_hiring"] = {"stages": snapshot}
            job.job_config = jc
            job.updated_at = now
            job.save(self.db)
            for s in snapshot:
                ps = PipelineStage(
                    account_id=account_id,
                    job_id=jid_int,
                    name=str(s.get("name") or "Stage")[:100],
                    position=int(s.get("order", 0)),
                    stage_type=None,
                    automation_rules={
                        "structured_hiring": {
                            "stage_template_id": s.get("stage_template_id"),
                            "focus_attribute_ids": s.get("focus_attribute_ids", []),
                            "default_interviewer_user_ids": s.get("default_interviewer_user_ids", []),
                        }
                    },
                    created_at=now,
                    updated_at=now,
                )
                ps.save(self.db)

        row.converted_job_id = jid_int
        row.status = "converted"
        row.updated_at = now
        row.save(self.db)
        job_data["role_kickoff_request_id"] = row.id
        return self.success(job_data)

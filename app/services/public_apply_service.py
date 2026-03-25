"""Public job page + apply (no auth)—resolved by apply_token."""
from __future__ import annotations

from typing import Any

from app.models.account import Account
from app.models.job import Job
from app.models.job_version import JobVersion
from app.services.application_service import ApplicationService
from app.services.base_service import BaseService
from app.services.custom_attribute_service import CustomAttributeService, ENTITY_APPLICATION
from app.services.referral_account_settings_service import merged_referral_settings
from app.services.referral_service import ReferralLinkService


def _job_for_token(db, token: str) -> Job | None:
    t = (token or "").strip()
    if len(t) < 16:
        return None
    job = Job.find_by(db, apply_token=t)
    if not job or job.deleted_at:
        return None
    return job


class PublicApplyService(BaseService):
    def show_job(self, token: str) -> dict:
        job = _job_for_token(self.db, token)
        if not job:
            return self.failure("Job not found")
        if job.status != "open":
            return self.failure("This job is not accepting applications right now")

        account = self.db.get(Account, job.account_id)
        versions = JobVersion.where(self.db, job_id=job.id)
        control = next((v for v in versions if v.is_control), None)
        if not control and versions:
            control = sorted(versions, key=lambda v: v.id)[0]

        jc: dict[str, Any] = job.job_config if isinstance(job.job_config, dict) else {}
        posting = jc.get("posting") if isinstance(jc.get("posting"), dict) else {}
        app_fields = posting.get("application_fields") if isinstance(posting.get("application_fields"), dict) else {}
        acc_ref = merged_referral_settings(account.settings if account else {})

        payload: dict[str, Any] = {
            "title": job.title,
            "company_name": account.name if account else "",
            "department": job.department,
            "location": job.location,
            "location_type": job.location_type,
            "employment_type": job.employment_type,
            "experience_level": job.experience_level,
            "open_positions": job.open_positions,
            "description_html": control.description if control else "<p></p>",
            "skills_required": jc.get("skills_required") if isinstance(jc.get("skills_required"), list) else [],
            "skills_nice": jc.get("skills_nice") if isinstance(jc.get("skills_nice"), list) else [],
            "bonus_incentives": job.bonus_incentives,
            "referral_program_enabled": bool(acc_ref.get("enabled", True)),
            "application_fields": {
                "resume": bool(app_fields.get("resume", True)),
                "cover_letter": bool(app_fields.get("cover_letter", True)),
                "portfolio": bool(app_fields.get("portfolio", False)),
                "linkedin": bool(app_fields.get("linkedin", False)),
            },
        }
        if job.salary_visible and (job.salary_min is not None or job.salary_max is not None):
            payload["salary"] = {
                "min": float(job.salary_min) if job.salary_min is not None else None,
                "max": float(job.salary_max) if job.salary_max is not None else None,
                "currency": job.salary_currency or "USD",
            }
        else:
            payload["salary"] = None

        defs = CustomAttributeService(self.db).list_definitions(job.account_id, ENTITY_APPLICATION)
        payload["custom_attribute_definitions"] = defs["data"] if defs.get("ok") else []

        return self.success(payload)

    def submit(self, token: str, data: dict) -> dict:
        job = _job_for_token(self.db, token)
        if not job:
            return self.failure("Job not found")
        if job.status != "open":
            return self.failure("This job is not accepting applications right now")

        email = (data.get("candidate_email") or "").strip().lower()
        if not email:
            return self.failure("candidate_email is required")

        raw_attrs = data.get("custom_attributes")
        if raw_attrs is not None and not isinstance(raw_attrs, dict):
            return self.failure("custom_attributes must be an object")

        body: dict[str, Any] = {
            "job_id": job.id,
            "candidate_email": email,
            "candidate_name": (data.get("candidate_name") or "").strip() or None,
            "candidate_phone": (data.get("candidate_phone") or "").strip() or None,
            "candidate_location": (data.get("candidate_location") or "").strip() or None,
            "resume_url": (data.get("resume_url") or "").strip() or None,
            "cover_letter": (data.get("cover_letter") or "").strip() or None,
            "linkedin_url": (data.get("linkedin_url") or "").strip() or None,
            "portfolio_url": (data.get("portfolio_url") or "").strip() or None,
            "source_type": "public_apply",
            "custom_attributes": raw_attrs if isinstance(raw_attrs, dict) else {},
        }
        ref_tok = (data.get("ref") or data.get("referral_token") or "").strip()
        if ref_tok:
            link = ReferralLinkService(self.db).resolve_token_for_job(job, ref_tok)
            if link:
                utm = data.get("utm")
                body["referral_user_id"] = link.employee_user_id
                body["referral_link_id"] = link.id
                body["referral_source"] = (data.get("referral_source") or "").strip() or None
                body["referral_utm"] = utm if isinstance(utm, dict) else {}
                body["source_type"] = "referral"
        return ApplicationService(self.db).create_application(job.account_id, body)

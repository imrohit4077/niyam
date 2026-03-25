"""Referral links, attribution, bonuses, analytics (multi-tenant)."""
from __future__ import annotations

import csv
import io
import secrets
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.helpers.referral_cache import cache_get_token, cache_set_token
from app.helpers.logger import get_logger
from app.models.account import Account
from app.models.account_user import AccountUser
from app.models.application import Application
from app.models.job import Job
from app.models.referral_bonus import ReferralBonus
from app.models.referral_link import ReferralLink
from app.models.user import User
from app.services.base_service import BaseService
from app.services.referral_account_settings_service import merged_referral_settings

logger = get_logger(__name__)


def _default_job_referral_settings() -> dict[str, Any]:
    return {
        "enabled": True,
        "bonus_amount": None,
        "currency": "USD",
        "probation_days": 90,
        "min_referrer_tenure_days": 90,
    }


def merged_job_referral_settings(raw: dict | None) -> dict[str, Any]:
    base = _default_job_referral_settings()
    if isinstance(raw, dict):
        for k, v in raw.items():
            if k in base and v is not None:
                base[k] = v
    if base.get("bonus_amount") is not None:
        try:
            base["bonus_amount"] = float(base["bonus_amount"])
        except (TypeError, ValueError):
            base["bonus_amount"] = None
    try:
        base["probation_days"] = max(0, int(base.get("probation_days", 90)))
    except (TypeError, ValueError):
        base["probation_days"] = 90
    try:
        base["min_referrer_tenure_days"] = max(0, int(base.get("min_referrer_tenure_days", 90)))
    except (TypeError, ValueError):
        base["min_referrer_tenure_days"] = 90
    base["currency"] = str(base.get("currency") or "USD").upper()[:8]
    base["enabled"] = bool(base.get("enabled", True))
    return base


def _new_referral_token() -> str:
    return "ref_" + secrets.token_urlsafe(24).replace("-", "")[:40]


class ReferralLinkService(BaseService):
    def get_or_create_for_job(self, account_id: int, employee_user_id: int, job_id: int) -> dict:
        job = Job.find_by(self.db, id=job_id, account_id=account_id)
        if not job or job.deleted_at:
            return self.failure("Job not found")
        au = AccountUser.find_by(self.db, account_id=account_id, user_id=employee_user_id)
        if not au or au.status != "active":
            return self.failure("User is not an active member of this account")
        account = self.db.get(Account, account_id)
        acc_ref = merged_referral_settings(account.settings if account else {})
        if not acc_ref.get("enabled", True):
            return self.failure("Referral program is disabled for this workspace")

        js = merged_job_referral_settings(job.referral_settings if isinstance(job.referral_settings, dict) else {})
        if not js.get("enabled", True):
            return self.failure("Referrals are disabled for this job")

        existing = ReferralLink.find_by(
            self.db, account_id=account_id, employee_user_id=employee_user_id, job_id=job_id
        )
        if existing:
            return self.success(self._link_payload(account_id, job, existing, acc_ref))

        tok = _new_referral_token()
        for _ in range(5):
            if not ReferralLink.find_by(self.db, token=tok):
                break
            tok = _new_referral_token()
        now = datetime.now(timezone.utc)
        link = ReferralLink(
            account_id=account_id,
            employee_user_id=employee_user_id,
            job_id=job_id,
            token=tok,
            created_at=now,
            updated_at=now,
        )
        link.save(self.db)
        cache_set_token(
            link.token,
            {
                "referral_link_id": link.id,
                "account_id": account_id,
                "job_id": job_id,
                "employee_user_id": employee_user_id,
            },
        )
        logger.info(
            "ReferralLinkService.get_or_create_for_job",
            extra={"referral_link_id": link.id, "job_id": job_id},
        )
        return self.success(self._link_payload(account_id, job, link, acc_ref))

    def _link_payload(self, account_id: int, job: Job, link: ReferralLink, acc_ref: dict) -> dict:
        base = (acc_ref.get("public_apply_base_url") or "").rstrip("/")
        if not base:
            base = ""
        path = f"/api/v1/public/apply/{job.apply_token}"
        full_url = f"{base}{path}?ref={link.token}" if base else f"{path}?ref={link.token}"
        return {
            "id": link.id,
            "token": link.token,
            "job_id": job.id,
            "apply_token": job.apply_token,
            "referral_url": full_url,
            "path_with_query": f"{path}?ref={link.token}",
        }

    def resolve_token_for_job(self, job: Job, token: str) -> ReferralLink | None:
        t = (token or "").strip()
        if len(t) < 8:
            return None
        cached = cache_get_token(t)
        if cached and int(cached.get("job_id", 0)) == job.id:
            link = self.db.get(ReferralLink, int(cached["referral_link_id"]))
            if link and link.account_id == job.account_id:
                return link
        link = ReferralLink.find_by(self.db, token=t, job_id=job.id, account_id=job.account_id)
        if link:
            cache_set_token(
                t,
                {
                    "referral_link_id": link.id,
                    "account_id": job.account_id,
                    "job_id": job.id,
                    "employee_user_id": link.employee_user_id,
                },
            )
        return link


class ReferralBonusService(BaseService):
    def ensure_bonus_for_hired_application(self, account_id: int, application_id: int) -> dict:
        app = Application.find_by(self.db, id=application_id, account_id=account_id)
        if not app or app.deleted_at or app.status != "hired":
            return self.failure("Application not found or not hired")
        if not app.referral_user_id:
            return self.success({"skipped": True, "reason": "no_referrer"})
        existing = ReferralBonus.find_by(self.db, application_id=application_id)
        if existing:
            return self.success({"skipped": True, "reason": "already_exists", "id": existing.id})

        job = Job.find_by(self.db, id=app.job_id, account_id=account_id)
        if not job:
            return self.failure("Job not found")
        js = merged_job_referral_settings(job.referral_settings if isinstance(job.referral_settings, dict) else {})
        if not js.get("enabled", True) or js.get("bonus_amount") is None:
            return self.success({"skipped": True, "reason": "no_bonus_configured"})

        amount = Decimal(str(js["bonus_amount"]))
        currency = js.get("currency") or "USD"

        hire_date = date.today()
        for ev in reversed(app.stage_history or []):
            if isinstance(ev, dict) and ev.get("stage") == "hired" and ev.get("changed_at"):
                try:
                    hire_date = datetime.fromisoformat(str(ev["changed_at"]).replace("Z", "+00:00")).date()
                    break
                except Exception:
                    pass

        probation_end = hire_date + timedelta(days=js["probation_days"])
        au = AccountUser.find_by(self.db, account_id=account_id, user_id=app.referral_user_id)
        tenure_start = None
        if au and au.joined_at:
            tenure_start = au.joined_at.date()
        elif au:
            tenure_start = au.created_at.date() if au.created_at else None
        tenure_end = None
        if tenure_start is not None:
            tenure_end = tenure_start + timedelta(days=js["min_referrer_tenure_days"])

        eligible_after = probation_end
        if tenure_end is not None and tenure_end > eligible_after:
            eligible_after = tenure_end

        now = datetime.now(timezone.utc)
        bonus = ReferralBonus(
            account_id=account_id,
            application_id=application_id,
            referral_link_id=app.referral_link_id,
            referrer_user_id=app.referral_user_id,
            amount=amount,
            currency=currency,
            status="pending",
            eligible_after=eligible_after,
            hris_sync_status="unsynced",
            created_at=now,
            updated_at=now,
        )
        bonus.save(self.db)
        logger.info(
            "ReferralBonusService.ensure_bonus_for_hired_application",
            extra={"referral_bonus_id": bonus.id, "application_id": application_id},
        )
        return self.success({"id": bonus.id, "eligible_after": eligible_after.isoformat()})

    def list_bonuses(self, account_id: int, status: str | None = None) -> dict:
        stmt = select(ReferralBonus).where(ReferralBonus.account_id == account_id)
        if status:
            stmt = stmt.where(ReferralBonus.status == status)
        stmt = stmt.order_by(ReferralBonus.created_at.desc())
        rows = list(self.db.execute(stmt).scalars().all())
        return self.success([b.to_dict() for b in rows])

    def update_bonus(self, account_id: int, bonus_id: int, data: dict) -> dict:
        b = ReferralBonus.find_by(self.db, id=bonus_id, account_id=account_id)
        if not b:
            return self.failure("Bonus not found")
        if "status" in data and data["status"] in ("pending", "eligible", "paid", "cancelled"):
            b.status = data["status"]
        if "hris_sync_status" in data and isinstance(data["hris_sync_status"], str):
            b.hris_sync_status = data["hris_sync_status"][:32]
        if "external_payout_id" in data:
            b.external_payout_id = (data["external_payout_id"] or None) and str(data["external_payout_id"])[:255]
        if "notes" in data and data["notes"] is not None:
            b.notes = str(data["notes"])
        if data.get("mark_paid"):
            b.status = "paid"
            b.paid_at = datetime.now(timezone.utc)
        b.updated_at = datetime.now(timezone.utc)
        b.save(self.db)
        return self.success(b.to_dict())

    def export_csv(self, account_id: int) -> str:
        stmt = (
            select(ReferralBonus, User)
            .join(User, User.id == ReferralBonus.referrer_user_id)
            .where(ReferralBonus.account_id == account_id)
            .order_by(ReferralBonus.created_at.desc())
        )
        rows = self.db.execute(stmt).all()
        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(
            [
                "bonus_id",
                "application_id",
                "referrer_email",
                "referrer_name",
                "amount",
                "currency",
                "status",
                "eligible_after",
                "paid_at",
                "hris_sync_status",
                "external_payout_id",
            ]
        )
        for bonus, user in rows:
            w.writerow(
                [
                    bonus.id,
                    bonus.application_id,
                    user.email,
                    user.name,
                    float(bonus.amount),
                    bonus.currency,
                    bonus.status,
                    bonus.eligible_after.isoformat() if bonus.eligible_after else "",
                    bonus.paid_at.isoformat() if bonus.paid_at else "",
                    bonus.hris_sync_status,
                    bonus.external_payout_id or "",
                ]
            )
        return buf.getvalue()


class ReferralAnalyticsService(BaseService):
    def leaderboard(self, account_id: int, limit: int = 50) -> dict:
        """Referrals submitted and hired counts per referring user."""
        lim = max(1, min(limit, 200))
        r1 = self.db.execute(
            select(Application.referral_user_id, func.count().label("referrals"))
            .where(
                Application.account_id == account_id,
                Application.deleted_at.is_(None),
                Application.referral_user_id.isnot(None),
            )
            .group_by(Application.referral_user_id)
        ).all()
        r2 = self.db.execute(
            select(Application.referral_user_id, func.count().label("hires"))
            .where(
                Application.account_id == account_id,
                Application.deleted_at.is_(None),
                Application.referral_user_id.isnot(None),
                Application.status == "hired",
            )
            .group_by(Application.referral_user_id)
        ).all()
        hires_map = {uid: int(h) for uid, h in r2}
        merged: list[dict[str, Any]] = []
        for uid, ref_cnt in r1:
            u = self.db.get(User, uid)
            if not u:
                continue
            merged.append(
                {
                    "user_id": uid,
                    "name": u.name,
                    "email": u.email,
                    "referrals_count": int(ref_cnt),
                    "hires_count": hires_map.get(uid, 0),
                }
            )
        merged.sort(key=lambda x: (-x["hires_count"], -x["referrals_count"]))
        return self.success({"leaderboard": merged[:lim]})

    def my_referrals(self, account_id: int, user_id: int) -> dict:
        stmt = (
            select(Application)
            .where(
                Application.account_id == account_id,
                Application.deleted_at.is_(None),
                Application.referral_user_id == user_id,
            )
            .order_by(Application.created_at.desc())
        )
        apps = list(self.db.execute(stmt).scalars().all())
        return self.success([a.to_dict() for a in apps])


def run_eligibility_scan(db: Session) -> int:
    """Promote pending bonuses to eligible when eligible_after <= today."""
    from app.jobs.referral_webhook_job import referral_bonus_eligible_webhook

    today = date.today()
    stmt = select(ReferralBonus).where(
        ReferralBonus.status == "pending",
        ReferralBonus.eligible_after.isnot(None),
        ReferralBonus.eligible_after <= today,
    )
    rows = list(db.execute(stmt).scalars().all())
    n = 0
    for b in rows:
        b.status = "eligible"
        b.updated_at = datetime.now(timezone.utc)
        b.save(db)
        n += 1
        try:
            referral_bonus_eligible_webhook.delay(bonus_id=b.id)
        except Exception:
            logger.warning("Could not enqueue referral HRIS webhook", exc_info=True)
    return n

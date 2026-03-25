"""Admin-only referral visibility: links generated, pipeline, past outcomes, claimed bonuses."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.application import Application
from app.models.job import Job
from app.models.referral_bonus import ReferralBonus
from app.models.referral_link import ReferralLink
from app.models.user import User
from app.services.base_service import BaseService

_ACTIVE = frozenset({"applied", "screening", "interview", "offer"})
_PAST = frozenset({"rejected", "withdrawn"})


def _iso(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    return dt.isoformat()


def _user_summary(u: User | None) -> dict | None:
    if u is None:
        return None
    return {"id": u.id, "name": u.name, "email": u.email}


def _job_summary(j: Job | None) -> dict | None:
    if j is None:
        return None
    return {"id": j.id, "title": j.title, "department": j.department, "status": j.status}


class ReferralAdminService(BaseService):
    def overview(self, account_id: int) -> dict:
        """All referral activity for HR: links, active pipeline, closed, hired + bonus, paid bonuses."""
        db: Session = self.db

        # ── Referral links (generated; may or may not have applications yet) ──
        link_rows = list(
            db.execute(
                select(ReferralLink)
                .where(ReferralLink.account_id == account_id)
                .order_by(ReferralLink.created_at.desc())
            ).scalars().all()
        )
        generated_links: list[dict] = []
        for rl in link_rows:
            emp = db.get(User, rl.employee_user_id)
            job = db.get(Job, rl.job_id)
            cnt = db.scalar(
                select(func.count())
                .select_from(Application)
                .where(
                    Application.referral_link_id == rl.id,
                    Application.deleted_at.is_(None),
                )
            )
            n = int(cnt or 0)
            d = rl.to_dict()
            d["employee"] = _user_summary(emp)
            d["job"] = _job_summary(job)
            d["applications_count"] = n
            d["awaiting_first_apply"] = n == 0
            generated_links.append(d)

        # ── All referred applications (referral_user_id set) ──
        ref_apps = list(
            db.execute(
                select(Application)
                .where(
                    Application.account_id == account_id,
                    Application.deleted_at.is_(None),
                    Application.referral_user_id.isnot(None),
                )
                .order_by(Application.updated_at.desc())
            ).scalars().all()
        )
        app_ids = [a.id for a in ref_apps]
        bonus_by_app: dict[int, ReferralBonus] = {}
        if app_ids:
            for b in db.execute(select(ReferralBonus).where(ReferralBonus.account_id == account_id)).scalars().all():
                bonus_by_app[b.application_id] = b

        job_ids = list({a.job_id for a in ref_apps})
        user_ids = list({a.referral_user_id for a in ref_apps if a.referral_user_id})
        jobs_map = {}
        if job_ids:
            for j in db.execute(select(Job).where(Job.id.in_(job_ids))).scalars().all():
                jobs_map[j.id] = j
        users_map = {}
        if user_ids:
            for u in db.execute(select(User).where(User.id.in_(user_ids))).scalars().all():
                users_map[u.id] = u

        def enrich(app: Application) -> dict:
            job = jobs_map.get(app.job_id)
            ref = users_map.get(app.referral_user_id) if app.referral_user_id else None
            bonus = bonus_by_app.get(app.id)
            row = app.to_dict()
            row["job"] = _job_summary(job)
            row["referrer"] = _user_summary(ref)
            row["bonus"] = None
            if bonus:
                row["bonus"] = {
                    "id": bonus.id,
                    "status": bonus.status,
                    "amount": float(bonus.amount),
                    "currency": bonus.currency,
                    "eligible_after": bonus.eligible_after.isoformat() if bonus.eligible_after else None,
                    "paid_at": _iso(bonus.paid_at),
                }
            return row

        active_referrals = [enrich(a) for a in ref_apps if a.status in _ACTIVE]
        past_referrals = [enrich(a) for a in ref_apps if a.status in _PAST]
        hired_referrals = [enrich(a) for a in ref_apps if a.status == "hired"]

        paid = list(
            db.execute(
                select(ReferralBonus)
                .where(ReferralBonus.account_id == account_id, ReferralBonus.status == "paid")
                .order_by(ReferralBonus.updated_at.desc())
            ).scalars().all()
        )
        bonuses_paid: list[dict] = []
        for b in paid:
            app = db.get(Application, b.application_id)
            ref = db.get(User, b.referrer_user_id)
            job = db.get(Job, app.job_id) if app else None
            bd = b.to_dict()
            bd["application"] = enrich(app) if app else None
            bd["referrer"] = _user_summary(ref)
            bd["job"] = _job_summary(job)
            bonuses_paid.append(bd)

        pending_bonus_rows = list(
            db.execute(
                select(ReferralBonus)
                .where(
                    ReferralBonus.account_id == account_id,
                    ReferralBonus.status.in_(("pending", "eligible")),
                )
                .order_by(ReferralBonus.created_at.desc())
            ).scalars().all()
        )
        bonuses_pending: list[dict] = []
        for b in pending_bonus_rows:
            app = db.get(Application, b.application_id)
            ref = db.get(User, b.referrer_user_id)
            job = db.get(Job, app.job_id) if app else None
            bd = b.to_dict()
            bd["application"] = enrich(app) if app else None
            bd["referrer"] = _user_summary(ref)
            bd["job"] = _job_summary(job)
            bonuses_pending.append(bd)

        return self.success(
            {
                "generated_links": generated_links,
                "active_referrals": active_referrals,
                "past_referrals": past_referrals,
                "hired_referrals": hired_referrals,
                "bonuses_pending": bonuses_pending,
                "bonuses_paid": bonuses_paid,
            }
        )

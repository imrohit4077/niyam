"""Candidate portal service: auth, profile management, and application tracking."""
from datetime import datetime, timezone
from pathlib import Path
import re
import secrets

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from config.settings import get_settings
from app.helpers.jwt_helper import JWTHelper
from app.helpers.logger import get_logger
from app.models.account import Account
from app.models.application import Application
from app.models.candidate_portal_profile import CandidatePortalProfile
from app.models.job import Job
from app.services.base_service import BaseService

logger = get_logger(__name__)


def _asset_root() -> Path:
    settings = get_settings()
    if settings.JOB_ATTACHMENTS_DIR:
        return Path(settings.JOB_ATTACHMENTS_DIR).expanduser().resolve() / "candidate_portal"
    return Path(__file__).resolve().parents[2] / "storage" / "job_attachments" / "candidate_portal"


def _safe_file_name(name: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", name).strip("._")
    return cleaned[:160] or "file"


class CandidatePortalService(BaseService):
    def _next_profile_id(self) -> int:
        mx = self.db.scalar(select(func.coalesce(func.max(CandidatePortalProfile.id), 0)))
        return int(mx or 0) + 1

    def _portal_account_id(self) -> int | None:
        settings = get_settings()
        try:
            aid = int(settings.CANDIDATE_PORTAL_ACCOUNT_ID)
        except (TypeError, ValueError):
            logger.warning("candidate_portal: CANDIDATE_PORTAL_ACCOUNT_ID is not a valid integer")
            return None
        if aid <= 0:
            logger.warning(
                "candidate_portal: CANDIDATE_PORTAL_ACCOUNT_ID is %s (must be > 0). Set it in .env and restart the server.",
                aid,
            )
            return None
        acc = self.db.get(Account, aid)
        if not acc:
            logger.warning(
                "candidate_portal: no row in accounts for CANDIDATE_PORTAL_ACCOUNT_ID=%s",
                aid,
            )
            return None
        return int(acc.id)

    def _portal_disabled_message(self) -> str:
        base = "The candidate portal is not available on this server."
        if get_settings().DEBUG:
            return (
                base
                + " Set CANDIDATE_PORTAL_ACCOUNT_ID in .env to your tenant accounts.id, then restart the API process."
            )
        return base

    def _profile(self, account_id: int, email: str) -> CandidatePortalProfile | None:
        return CandidatePortalProfile.find_by(self.db, account_id=account_id, email=email.lower().strip())

    def _auth_payload(self, profile: CandidatePortalProfile) -> dict:
        access_token = JWTHelper.create_access_token(
            user_id=int(profile.id),
            email=profile.email,
            role="candidate_portal",
        )
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "profile": profile.to_safe_dict(),
        }

    def register(self, email: str, password: str, full_name: str | None = None) -> dict:
        account_id_resolved = self._portal_account_id()
        if not account_id_resolved:
            return self.failure(self._portal_disabled_message())
        em = (email or "").strip().lower()
        if not em or len(password or "") < 8:
            return self.failure("email and password (min 8 chars) are required")
        app = self.db.execute(
            select(Application)
            .where(
                Application.account_id == account_id_resolved,
                Application.candidate_email == em,
                Application.deleted_at == None,
            )
            .order_by(Application.created_at.desc())
        ).scalars().first()
        existing = self._profile(account_id_resolved, em)
        if existing:
            return self.failure("An account for this email already exists. Use Sign in instead of Create account.")
        now = datetime.now(timezone.utc)
        if app:
            display_name = (full_name or app.candidate_name or "").strip() or None
            phone = app.candidate_phone
            location = app.candidate_location
            linkedin_url = app.linkedin_url
            portfolio_url = app.portfolio_url
            resume_url = app.resume_url
        else:
            display_name = (full_name or "").strip() or None
            phone = None
            location = None
            linkedin_url = None
            portfolio_url = None
            resume_url = None
        profile = CandidatePortalProfile(
            id=self._next_profile_id(),
            account_id=account_id_resolved,
            email=em,
            password_hash="",
            full_name=display_name,
            phone=phone,
            location=location,
            linkedin_url=linkedin_url,
            portfolio_url=portfolio_url,
            resume_url=resume_url,
            created_at=now,
            updated_at=now,
        )
        profile.set_password(password)
        try:
            profile.save(self.db)
        except IntegrityError:
            self.db.rollback()
            return self.failure("An account for this email already exists. Use Sign in instead of Create account.")
        return self.success(self._auth_payload(profile))

    def login(self, email: str, password: str) -> dict:
        account_id_resolved = self._portal_account_id()
        if not account_id_resolved:
            return self.failure(self._portal_disabled_message())
        em = (email or "").strip().lower()
        profile = self._profile(account_id_resolved, em)
        if not profile or not profile.check_password(password):
            return self.failure("Invalid email or password")
        if profile.status != "active":
            return self.failure("Candidate profile is inactive")
        profile.last_login_at = datetime.now(timezone.utc)
        profile.updated_at = datetime.now(timezone.utc)
        profile.save(self.db)
        return self.success(self._auth_payload(profile))

    def me(self, profile_id: int) -> dict:
        profile = CandidatePortalProfile.find_by(self.db, id=profile_id)
        if not profile or profile.status != "active":
            return self.failure("Profile not found")
        return self.success(profile.to_safe_dict())

    def update_me(self, profile_id: int, data: dict) -> dict:
        profile = CandidatePortalProfile.find_by(self.db, id=profile_id)
        if not profile or profile.status != "active":
            return self.failure("Profile not found")
        allowed = {
            "full_name",
            "phone",
            "location",
            "headline",
            "summary",
            "linkedin_url",
            "portfolio_url",
            "resume_url",
        }
        updates = {k: data.get(k) for k in allowed if k in data}
        if not updates:
            return self.failure("No updatable fields provided")
        for k, v in updates.items():
            setattr(profile, k, v)
        profile.updated_at = datetime.now(timezone.utc)
        profile.save(self.db)

        rows = Application.where(self.db, account_id=profile.account_id, candidate_email=profile.email)
        for row in rows:
            if row.deleted_at:
                continue
            row.candidate_name = profile.full_name or row.candidate_name
            row.candidate_phone = profile.phone
            row.candidate_location = profile.location
            row.linkedin_url = profile.linkedin_url
            row.portfolio_url = profile.portfolio_url
            row.resume_url = profile.resume_url
            row.updated_at = datetime.now(timezone.utc)
            row.save(self.db)
        return self.success(profile.to_safe_dict())

    def my_applications(self, profile_id: int) -> dict:
        profile = CandidatePortalProfile.find_by(self.db, id=profile_id)
        if not profile or profile.status != "active":
            return self.failure("Profile not found")
        stmt = (
            select(Application, Job)
            .join(Job, Job.id == Application.job_id)
            .where(
                Application.account_id == profile.account_id,
                Application.candidate_email == profile.email,
                Application.deleted_at == None,
                Job.deleted_at == None,
            )
            .order_by(Application.created_at.desc())
        )
        rows = self.db.execute(stmt).all()
        out = []
        for app, job in rows:
            d = app.to_dict()
            d["job"] = {"id": job.id, "title": job.title, "slug": job.slug, "status": job.status}
            out.append(d)
        return self.success(out)

    def upload_asset(
        self,
        profile_id: int,
        *,
        kind: str,
        file_bytes: bytes,
        original_filename: str,
    ) -> dict:
        profile = CandidatePortalProfile.find_by(self.db, id=profile_id)
        if not profile or profile.status != "active":
            return self.failure("Profile not found")
        if kind not in {"avatar", "resume"}:
            return self.failure("Invalid asset kind")
        if not file_bytes:
            return self.failure("file is required")
        now = datetime.now(timezone.utc)
        safe_name = _safe_file_name(original_filename)
        rel_parts = [
            "candidate_portal",
            f"account_{profile.account_id}",
            f"profile_{profile.id}",
            "avatars" if kind == "avatar" else "resumes",
        ]
        target_dir = _asset_root().joinpath(f"account_{profile.account_id}", f"profile_{profile.id}", rel_parts[-1])
        target_dir.mkdir(parents=True, exist_ok=True)
        unique_name = f"{now.strftime('%Y%m%dT%H%M%S')}_{secrets.token_hex(6)}_{safe_name}"
        target_path = target_dir / unique_name
        target_path.write_bytes(file_bytes)
        file_url = "/" + "/".join(["files", *rel_parts, unique_name])
        if kind == "avatar":
            profile.profile_picture_url = file_url
        else:
            profile.resume_url = file_url
        profile.updated_at = now
        profile.save(self.db)
        return self.success({"file_url": file_url, "profile": profile.to_safe_dict()})

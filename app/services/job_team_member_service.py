"""List / mutate per-job hiring team rows (`job_team_members`)."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select

from app.models.job import Job
from app.models.job_team_member import JobTeamMember
from app.models.user import User
from app.services.base_service import BaseService
from app.services.permission_resolution_service import (
    ALLOWED_JOB_TEAM_ROLES,
    PermissionResolutionService,
    permission_key,
)


class JobTeamMemberService(BaseService):
    def list_team(self, account_id: int, job_id: int) -> dict:
        job = Job.find_by(self.db, id=job_id, account_id=account_id)
        if not job or job.deleted_at:
            return self.failure("Job not found")
        stmt = (
            select(JobTeamMember, User.name, User.email)
            .join(User, User.id == JobTeamMember.user_id)
            .where(
                JobTeamMember.account_id == account_id,
                JobTeamMember.job_id == job_id,
            )
            .order_by(JobTeamMember.team_role.asc(), User.name.asc())
        )
        rows = self.db.execute(stmt).all()
        members = []
        for m, name, email in rows:
            d = m.to_dict()
            d["user_name"] = name
            d["user_email"] = email
            members.append(d)
        return self.success(
            {
                "job_id": job_id,
                "hiring_manager_user_id": job.hiring_manager_user_id,
                "recruiter_user_id": job.recruiter_user_id,
                "members": members,
            }
        )

    def add_member(
        self,
        account_id: int,
        job_id: int,
        actor_user_id: int,
        actor_account_user_id: int,
        user_id: int,
        team_role: str,
    ) -> dict:
        job = Job.find_by(self.db, id=job_id, account_id=account_id)
        if not job or job.deleted_at:
            return self.failure("Job not found")
        tr = (team_role or "").strip().lower()
        if tr not in ALLOWED_JOB_TEAM_ROLES:
            return self.failure(
                f"Invalid team_role; allowed: {', '.join(sorted(ALLOWED_JOB_TEAM_ROLES))}"
            )
        pr = PermissionResolutionService(self.db)
        keys = pr.effective_keys(account_id, actor_user_id, actor_account_user_id, job_id)
        if permission_key("jobs", "edit") not in keys and permission_key("settings", "admin_roles") not in keys:
            return self.failure("Not allowed to modify hiring team for this job")

        exists = JobTeamMember.find_by(
            self.db, job_id=job_id, user_id=user_id, team_role=tr
        )
        if exists:
            return self.failure("User already has this team role on the job")
        now = datetime.now(timezone.utc)
        m = JobTeamMember(
            account_id=account_id,
            job_id=job_id,
            user_id=user_id,
            team_role=tr,
            created_at=now,
            updated_at=now,
        )
        m.save(self.db)
        return self.success(m.to_dict())

    def remove_member(self, account_id: int, job_id: int, member_id: int, actor_user_id: int, actor_account_user_id: int) -> dict:
        job = Job.find_by(self.db, id=job_id, account_id=account_id)
        if not job or job.deleted_at:
            return self.failure("Job not found")
        pr = PermissionResolutionService(self.db)
        keys = pr.effective_keys(account_id, actor_user_id, actor_account_user_id, job_id)
        if permission_key("jobs", "edit") not in keys and permission_key("settings", "admin_roles") not in keys:
            return self.failure("Not allowed to modify hiring team for this job")
        m = JobTeamMember.find_by(self.db, id=member_id, account_id=account_id, job_id=job_id)
        if not m:
            return self.failure("Team member not found")
        m.destroy(self.db)
        return self.success({"deleted": True})

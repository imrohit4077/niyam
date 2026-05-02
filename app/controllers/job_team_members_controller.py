"""Nested hiring team for a job (Greenhouse-style job roles + API)."""

from fastapi import HTTPException

from app.controllers.base_controller import BaseController, before_action
from app.controllers.concerns.authenticatable import Authenticatable
from app.models.account_user import AccountUser
from app.services.job_team_member_service import JobTeamMemberService


class JobTeamMembersController(BaseController, Authenticatable):

    @before_action
    def require_auth(self):
        self.authenticate_user()

    def _account_and_actor(self) -> tuple[int, int, int]:
        user_id = self._user_id()
        au = AccountUser.find_by(self.db, user_id=user_id)
        if not au:
            raise HTTPException(status_code=403, detail="No account membership found")
        return au.account_id, int(user_id), au.id

    def index_by_job(self):
        account_id, _, _ = self._account_and_actor()
        job_id = int(self.request.path_params["job_id"])
        self.require_permission("jobs", "view", account_id=account_id, job_id=job_id)
        r = JobTeamMemberService(self.db).list_team(account_id, job_id)
        if not r["ok"]:
            return self.render_error(r["error"], status=404 if "not found" in r["error"].lower() else 400)
        return self.render_json(r["data"])

    async def create_by_job(self):
        account_id, actor_uid, actor_au = self._account_and_actor()
        job_id = int(self.request.path_params["job_id"])
        self.require_permission("jobs", "edit", account_id=account_id, job_id=job_id)
        body = await self._get_body_json()
        uid = body.get("user_id")
        team_role = body.get("team_role")
        if uid is None:
            return self.render_error("user_id is required", status=422)
        try:
            user_id = int(uid)
        except (TypeError, ValueError):
            return self.render_error("user_id must be a number", status=422)
        if not team_role or not isinstance(team_role, str):
            return self.render_error("team_role is required", status=422)
        r = JobTeamMemberService(self.db).add_member(
            account_id, job_id, actor_uid, actor_au, user_id, team_role
        )
        if not r["ok"]:
            return self.render_error(r["error"], status=422)
        return self.render_json(r["data"], status=201)

    def destroy(self):
        account_id, actor_uid, actor_au = self._account_and_actor()
        job_id = int(self.request.path_params["job_id"])
        self.require_permission("jobs", "edit", account_id=account_id, job_id=job_id)
        member_id = int(self.request.path_params["member_id"])
        r = JobTeamMemberService(self.db).remove_member(
            account_id, job_id, member_id, actor_uid, actor_au
        )
        if not r["ok"]:
            return self.render_error(r["error"], status=404 if "not found" in r["error"].lower() else 403)
        return self.render_json(r["data"])

"""Role kickoff requests API (Greenhouse-style HM → recruiter → job)."""

from app.controllers.base_controller import BaseController, before_action
from app.controllers.concerns.authenticatable import Authenticatable
from app.models.account_user import AccountUser
from app.services.role_kickoff_request_service import RoleKickoffRequestService


class RoleKickoffRequestsController(BaseController, Authenticatable):
    @before_action
    def require_auth(self):
        self.authenticate_user()

    def _account_id(self) -> int:
        user_id = self._user_id()
        au = AccountUser.find_by(self.db, user_id=user_id)
        if not au:
            from fastapi import HTTPException

            raise HTTPException(status_code=403, detail="No account membership found")
        return au.account_id

    def _admin_workspace(self) -> bool:
        return self._role() in ("admin", "superadmin", "site_admin")

    def index(self):
        account_id = self._account_id()
        uid = self._user_id()
        scope = (self.request.query_params.get("scope") or "queue").strip().lower()
        svc = RoleKickoffRequestService(self.db)
        if scope == "my":
            self.require_permission("kickoff", "submit", account_id=account_id)
            r = svc.list_for_creator(account_id, int(uid))
        elif scope == "all":
            if not self._admin_workspace():
                from fastapi import HTTPException

                raise HTTPException(status_code=403, detail="Admin workspace role required")
            self.require_permission("jobs", "view", account_id=account_id)
            r = svc.list_all(account_id)
        else:
            self.require_permission("kickoff", "process", account_id=account_id)
            r = svc.list_for_recruiter(account_id, int(uid))
        return self.render_json(r["data"])

    def show(self):
        account_id = self._account_id()
        uid = int(self._user_id())
        kid = int(self.request.path_params["id"])
        self.require_any_permission(
            [("kickoff", "submit"), ("kickoff", "process"), ("jobs", "view")],
            account_id=account_id,
        )
        svc = RoleKickoffRequestService(self.db)
        r = svc.get(account_id, kid)
        if not r["ok"]:
            return self.render_error(r["error"], 404)
        row = r["data"]
        if not self._admin_workspace():
            if row["created_by_user_id"] != uid and row["assigned_recruiter_user_id"] != uid:
                from fastapi import HTTPException

                raise HTTPException(status_code=403, detail="Not allowed to view this request")
        return self.render_json(row)

    async def create(self):
        account_id = self._account_id()
        uid = int(self._user_id())
        self.require_permission("kickoff", "submit", account_id=account_id)
        body = await self._get_body_json()
        r = RoleKickoffRequestService(self.db).create(account_id, uid, body)
        if not r["ok"]:
            return self.render_error(r["error"], 422)
        return self.render_json(r["data"], status=201)

    async def update_after_changes(self):
        account_id = self._account_id()
        uid = int(self._user_id())
        self.require_permission("kickoff", "submit", account_id=account_id)
        kid = int(self.request.path_params["id"])
        body = await self._get_body_json()
        r = RoleKickoffRequestService(self.db).resubmit_after_changes(account_id, kid, uid, body)
        if not r["ok"]:
            return self.render_error(r["error"], 422)
        return self.render_json(r["data"])

    def approve(self):
        account_id = self._account_id()
        uid = int(self._user_id())
        self.require_permission("kickoff", "process", account_id=account_id)
        kid = int(self.request.path_params["id"])
        r = RoleKickoffRequestService(self.db).approve(account_id, kid, uid)
        if not r["ok"]:
            return self.render_error(r["error"], 422)
        return self.render_json(r["data"])

    async def reject(self):
        account_id = self._account_id()
        uid = int(self._user_id())
        self.require_permission("kickoff", "process", account_id=account_id)
        kid = int(self.request.path_params["id"])
        body = await self._get_body_json()
        feedback = (body.get("feedback") or "") if isinstance(body, dict) else ""
        r = RoleKickoffRequestService(self.db).reject(account_id, kid, uid, feedback)
        if not r["ok"]:
            return self.render_error(r["error"], 422)
        return self.render_json(r["data"])

    async def request_changes(self):
        account_id = self._account_id()
        uid = int(self._user_id())
        self.require_permission("kickoff", "process", account_id=account_id)
        kid = int(self.request.path_params["id"])
        body = await self._get_body_json()
        feedback = (body.get("feedback") or "") if isinstance(body, dict) else ""
        r = RoleKickoffRequestService(self.db).request_changes(account_id, kid, uid, feedback)
        if not r["ok"]:
            return self.render_error(r["error"], 422)
        return self.render_json(r["data"])

    def create_job(self):
        account_id = self._account_id()
        uid = int(self._user_id())
        self.require_permission("kickoff", "process", account_id=account_id)
        self.require_permission("jobs", "create", account_id=account_id)
        kid = int(self.request.path_params["id"])
        r = RoleKickoffRequestService(self.db).convert_to_job(account_id, kid, uid)
        if not r["ok"]:
            return self.render_error(r["error"], 422)
        return self.render_json(r["data"], status=201)

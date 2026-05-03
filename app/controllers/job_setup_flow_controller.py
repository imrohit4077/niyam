"""Account-scoped job setup flow (wizard sections + fields)."""

from fastapi import HTTPException

from app.controllers.base_controller import BaseController, before_action
from app.controllers.concerns.authenticatable import Authenticatable
from app.models.account_user import AccountUser
from app.services.job_setup_flow_service import JobSetupFlowService


class JobSetupFlowController(BaseController, Authenticatable):
    @before_action
    def require_auth(self):
        self.authenticate_user()

    def _account_id(self) -> int:
        user_id = self._user_id()
        header_raw = self.request.headers.get("X-Account-Id") or self.request.headers.get("x-account-id")
        if header_raw is not None and str(header_raw).strip() != "":
            try:
                want = int(str(header_raw).strip())
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid X-Account-Id") from None
            au = AccountUser.find_by(self.db, user_id=user_id, account_id=want)
            if not au:
                raise HTTPException(status_code=403, detail="Not a member of this workspace")
            return want
        au = AccountUser.find_by(self.db, user_id=user_id)
        if not au:
            raise HTTPException(status_code=403, detail="No account membership found")
        return au.account_id

    def index(self):
        aid = self._account_id()
        self.require_permission("jobs", "view", account_id=aid)
        svc = JobSetupFlowService(self.db)
        svc.ensure_seeded(aid)
        return self.render_json({"sections": svc.build_catalog(aid)})

    async def create_section(self):
        aid = self._account_id()
        self.require_permission("jobs", "edit", account_id=aid)
        body = await self._get_body_json()
        if not isinstance(body, dict):
            return self.render_error("Invalid body", status=422)
        r = JobSetupFlowService(self.db).create_section(aid, body)
        if not r["ok"]:
            return self.render_error(r["error"], status=422)
        return self.render_json(r["data"])

    async def update_section(self):
        aid = self._account_id()
        self.require_permission("jobs", "edit", account_id=aid)
        sid = int(self.request.path_params["section_id"])
        body = await self._get_body_json()
        if not isinstance(body, dict):
            return self.render_error("Invalid body", status=422)
        r = JobSetupFlowService(self.db).update_section(aid, sid, body)
        if not r["ok"]:
            return self.render_error(r["error"], status=404 if "not found" in r["error"].lower() else 422)
        return self.render_json(r["data"])

    def destroy_section(self):
        aid = self._account_id()
        self.require_permission("jobs", "edit", account_id=aid)
        sid = int(self.request.path_params["section_id"])
        r = JobSetupFlowService(self.db).destroy_section(aid, sid)
        if not r["ok"]:
            return self.render_error(r["error"], status=422)
        return self.render_json(r["data"])

    async def create_field(self):
        aid = self._account_id()
        self.require_permission("jobs", "edit", account_id=aid)
        sid = int(self.request.path_params["section_id"])
        body = await self._get_body_json()
        if not isinstance(body, dict):
            return self.render_error("Invalid body", status=422)
        r = JobSetupFlowService(self.db).create_field(aid, sid, body)
        if not r["ok"]:
            return self.render_error(r["error"], status=404 if "not found" in r["error"].lower() else 422)
        return self.render_json(r["data"])

    async def update_field(self):
        aid = self._account_id()
        self.require_permission("jobs", "edit", account_id=aid)
        fid = int(self.request.path_params["field_id"])
        body = await self._get_body_json()
        if not isinstance(body, dict):
            return self.render_error("Invalid body", status=422)
        r = JobSetupFlowService(self.db).update_field(aid, fid, body)
        if not r["ok"]:
            return self.render_error(r["error"], status=404 if "not found" in r["error"].lower() else 422)
        return self.render_json(r["data"])

    def destroy_field(self):
        aid = self._account_id()
        self.require_permission("jobs", "edit", account_id=aid)
        fid = int(self.request.path_params["field_id"])
        r = JobSetupFlowService(self.db).destroy_field(aid, fid)
        if not r["ok"]:
            return self.render_error(r["error"], status=422)
        return self.render_json(r["data"])

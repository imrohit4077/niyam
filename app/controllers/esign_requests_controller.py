"""E-sign requests: account-wide list, per-application list, manual generation."""

from app.controllers.base_controller import BaseController, before_action
from app.controllers.concerns.authenticatable import Authenticatable
from app.models.account_user import AccountUser
from app.services.esign_automation_service import EsignAutomationService
from app.services.esign_request_service import EsignRequestService


class EsignRequestsController(BaseController, Authenticatable):
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

    def index(self):
        q = self.request.query_params.get("q")
        status = self.request.query_params.get("status")
        lim_raw = self.request.query_params.get("limit")
        try:
            limit = int(lim_raw) if lim_raw else 300
        except ValueError:
            limit = 300
        r = EsignRequestService(self.db).list_for_account(
            self._account_id(), limit=limit, q=q, status=status
        )
        return self.render_json(r["data"])

    def index_for_application(self):
        app_id = int(self.request.path_params["application_id"])
        r = EsignRequestService(self.db).list_for_application(self._account_id(), app_id)
        if not r["ok"]:
            return self.render_error(r["error"], 404)
        return self.render_json(r["data"])

    async def generate_for_application(self):
        account_id = self._account_id()
        app_id = int(self.request.path_params["application_id"])
        body = await self._get_body_json()
        raw_tid = body.get("template_id")
        template_id = int(raw_tid) if raw_tid is not None and str(raw_tid).strip() != "" else None
        r = EsignAutomationService(self.db).manual_generate_documents(
            account_id,
            app_id,
            template_id,
        )
        if not r["ok"]:
            return self.render_error(r["error"], status=422)
        return self.render_json(r["data"], status=201)

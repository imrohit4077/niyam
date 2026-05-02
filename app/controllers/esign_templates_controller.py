"""CRUD /api/v1/esign_templates"""

from app.controllers.base_controller import BaseController, before_action
from app.controllers.concerns.authenticatable import Authenticatable
from app.models.account_user import AccountUser
from app.services.esign_template_service import EsignTemplateService


class EsignTemplatesController(BaseController, Authenticatable):
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
        account_id = self._account_id()
        self.require_permission("esign", "view", account_id=account_id)
        r = EsignTemplateService(self.db).list_templates(account_id)
        return self.render_json(r["data"])

    def show(self):
        account_id = self._account_id()
        self.require_permission("esign", "view", account_id=account_id)
        tid = int(self.request.path_params["id"])
        r = EsignTemplateService(self.db).get_template(self._account_id(), tid)
        if not r["ok"]:
            return self.render_error(r["error"], 404)
        return self.render_json(r["data"])

    async def create(self):
        self.require_permission("esign", "manage", account_id=self._account_id())
        data = await self._get_body_json()
        r = EsignTemplateService(self.db).create_template(self._account_id(), data)
        if not r["ok"]:
            return self.render_error(r["error"], 422)
        return self.render_json(r["data"], status=201)

    async def update(self):
        self.require_permission("esign", "manage", account_id=self._account_id())
        tid = int(self.request.path_params["id"])
        data = await self._get_body_json()
        r = EsignTemplateService(self.db).update_template(self._account_id(), tid, data)
        if not r["ok"]:
            return self.render_error(r["error"], 422)
        return self.render_json(r["data"])

    def destroy(self):
        self.require_permission("esign", "manage", account_id=self._account_id())
        tid = int(self.request.path_params["id"])
        r = EsignTemplateService(self.db).delete_template(self._account_id(), tid)
        if not r["ok"]:
            return self.render_error(r["error"], 404)
        return self.render_json(r["data"])

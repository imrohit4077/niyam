"""GET/POST/PUT/DELETE /api/v1/hiring_attributes — structured hiring scorecard dimensions."""

from app.controllers.base_controller import BaseController, before_action
from app.controllers.concerns.authenticatable import Authenticatable
from app.models.account_user import AccountUser
from app.services.hiring_attribute_service import HiringAttributeService


class HiringAttributesController(BaseController, Authenticatable):
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
        self.require_permission("hiring_structure", "view", account_id=account_id)
        return self.render_json(HiringAttributeService(self.db).list(account_id)["data"])

    def show(self):
        account_id = self._account_id()
        self.require_permission("hiring_structure", "view", account_id=account_id)
        aid = int(self.request.path_params["id"])
        r = HiringAttributeService(self.db).get(account_id, aid)
        if not r["ok"]:
            return self.render_error(r["error"], 404)
        return self.render_json(r["data"])

    async def create(self):
        account_id = self._account_id()
        self.require_permission("hiring_structure", "manage", account_id=account_id)
        body = await self._get_body_json()
        r = HiringAttributeService(self.db).create(account_id, body if isinstance(body, dict) else {})
        if not r["ok"]:
            return self.render_error(r["error"], 422)
        return self.render_json(r["data"], status=201)

    async def update(self):
        account_id = self._account_id()
        self.require_permission("hiring_structure", "manage", account_id=account_id)
        aid = int(self.request.path_params["id"])
        body = await self._get_body_json()
        r = HiringAttributeService(self.db).update(account_id, aid, body if isinstance(body, dict) else {})
        if not r["ok"]:
            return self.render_error(r["error"], 422)
        return self.render_json(r["data"])

    def destroy(self):
        account_id = self._account_id()
        self.require_permission("hiring_structure", "manage", account_id=account_id)
        aid = int(self.request.path_params["id"])
        r = HiringAttributeService(self.db).destroy(account_id, aid)
        if not r["ok"]:
            return self.render_error(r["error"], 404)
        return self.render_json(r["data"])

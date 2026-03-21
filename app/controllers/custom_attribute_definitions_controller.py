"""CRUD for workspace custom attribute definitions (jobs + applications)."""

from app.controllers.base_controller import BaseController, before_action
from app.controllers.concerns.authenticatable import Authenticatable
from app.models.account_user import AccountUser
from app.services.custom_attribute_service import CustomAttributeService


class CustomAttributeDefinitionsController(BaseController, Authenticatable):
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
        et = (self.request.query_params.get("entity_type") or "").strip()
        if not et:
            return self.render_error("entity_type query parameter is required (job or application)", status=422)
        r = CustomAttributeService(self.db).list_definitions(self._account_id(), et)
        if not r["ok"]:
            return self.render_error(r["error"], 422)
        return self.render_json(r["data"])

    async def create(self):
        body = await self._get_body_json()
        r = CustomAttributeService(self.db).create_definition(self._account_id(), body)
        if not r["ok"]:
            return self.render_error(r["error"], 422)
        return self.render_json(r["data"], status=201)

    async def update(self):
        def_id = int(self.request.path_params["id"])
        body = await self._get_body_json()
        r = CustomAttributeService(self.db).update_definition(self._account_id(), def_id, body)
        if not r["ok"]:
            return self.render_error(r["error"], 422)
        return self.render_json(r["data"])

    def destroy(self):
        def_id = int(self.request.path_params["id"])
        r = CustomAttributeService(self.db).delete_definition(self._account_id(), def_id)
        if not r["ok"]:
            return self.render_error(r["error"], 404)
        return self.render_json(r["data"])

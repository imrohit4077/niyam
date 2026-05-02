"""CRUD for workspace custom attribute definitions (jobs + applications)."""

from fastapi import HTTPException

from app.controllers.base_controller import BaseController, before_action
from app.controllers.concerns.authenticatable import Authenticatable
from app.models.account_user import AccountUser
from app.services.custom_attribute_service import CustomAttributeService


class CustomAttributeDefinitionsController(BaseController, Authenticatable):
    @before_action
    def require_auth(self):
        self.authenticate_user()

    def _account_id(self) -> int:
        """Resolve tenant account: prefer X-Account-Id (must match membership), else first membership."""
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
        account_id = self._account_id()
        self.require_permission("jobs", "view", account_id=account_id)
        et = (self.request.query_params.get("entity_type") or "").strip()
        if not et:
            return self.render_error("entity_type query parameter is required (job or application)", status=422)
        r = CustomAttributeService(self.db).list_definitions(account_id, et)
        if not r["ok"]:
            return self.render_error(r["error"], 422)
        return self.render_json(r["data"])

    async def create(self):
        self.require_permission("jobs", "edit", account_id=self._account_id())
        body = await self._get_body_json()
        r = CustomAttributeService(self.db).create_definition(self._account_id(), body)
        if not r["ok"]:
            return self.render_error(r["error"], 422)
        return self.render_json(r["data"], status=201)

    async def update(self):
        self.require_permission("jobs", "edit", account_id=self._account_id())
        def_id = int(self.request.path_params["id"])
        body = await self._get_body_json()
        r = CustomAttributeService(self.db).update_definition(self._account_id(), def_id, body)
        if not r["ok"]:
            return self.render_error(r["error"], 422)
        return self.render_json(r["data"])

    def destroy(self):
        self.require_permission("jobs", "edit", account_id=self._account_id())
        def_id = int(self.request.path_params["id"])
        r = CustomAttributeService(self.db).delete_definition(self._account_id(), def_id)
        if not r["ok"]:
            return self.render_error(r["error"], 404)
        return self.render_json(r["data"])

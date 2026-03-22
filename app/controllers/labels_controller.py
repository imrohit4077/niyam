"""CRUD for workspace labels (Settings → Labels)."""

from app.controllers.base_controller import BaseController, before_action
from app.controllers.concerns.authenticatable import Authenticatable
from app.models.account_user import AccountUser
from app.services.label_service import LabelService


class LabelsController(BaseController, Authenticatable):
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
        r = LabelService(self.db).list_labels(self._account_id())
        return self.render_json(r["data"])

    async def create(self):
        body = await self._get_body_json()
        r = LabelService(self.db).create_label(self._account_id(), body)
        if not r["ok"]:
            return self.render_error(r["error"], 422)
        return self.render_json(r["data"], status=201)

    async def update(self):
        lid = int(self.request.path_params["id"])
        body = await self._get_body_json()
        r = LabelService(self.db).update_label(self._account_id(), lid, body)
        if not r["ok"]:
            return self.render_error(r["error"], 422)
        return self.render_json(r["data"])

    def destroy(self):
        lid = int(self.request.path_params["id"])
        r = LabelService(self.db).delete_label(self._account_id(), lid)
        if not r["ok"]:
            return self.render_error(r["error"], 404)
        return self.render_json(r["data"])

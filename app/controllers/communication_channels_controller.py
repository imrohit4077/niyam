"""CRUD + test for account communication channels (Settings → Communication channels)."""

from fastapi import HTTPException
from pydantic import ValidationError

from app.controllers.base_controller import BaseController, before_action
from app.controllers.concerns.authenticatable import Authenticatable
from app.models.account_user import AccountUser
from app.schemas.communication_channels import CommunicationChannelCreate, CommunicationChannelUpdate
from app.services.communication_channel_service import CommunicationChannelService


class CommunicationChannelsController(BaseController, Authenticatable):
    @before_action
    def require_auth(self):
        self.authenticate_user()

    @before_action
    def ensure_admin(self):
        if self._role() not in ("admin", "superadmin"):
            raise HTTPException(status_code=403, detail="Admin required")

    def _account_id(self) -> int:
        user_id = self._user_id()
        au = AccountUser.find_by(self.db, user_id=user_id)
        if not au:
            from fastapi import HTTPException

            raise HTTPException(status_code=403, detail="No account membership found")
        return au.account_id

    def index(self):
        channel_type = self.params.get("channel_type")
        if channel_type is not None and not isinstance(channel_type, str):
            channel_type = None
        if isinstance(channel_type, str) and not channel_type.strip():
            channel_type = None
        r = CommunicationChannelService(self.db).list_channels(
            self._account_id(),
            channel_type=channel_type.strip() if isinstance(channel_type, str) else None,
        )
        return self.render_json(r["data"])

    def show(self):
        cid = int(self.request.path_params["id"])
        r = CommunicationChannelService(self.db).get_channel(self._account_id(), cid)
        if not r["ok"]:
            return self.render_error(r["error"], 404)
        return self.render_json(r["data"])

    async def create(self):
        raw = await self._get_body_json()
        try:
            parsed = CommunicationChannelCreate.model_validate(raw)
        except ValidationError as e:
            return self.render_error(e.errors().__repr__(), 422)
        body = parsed.model_dump(exclude_none=True)
        uid = self._user_id()
        user_id = int(uid) if uid is not None else None
        r = CommunicationChannelService(self.db).create_channel(self._account_id(), user_id, body)
        if not r["ok"]:
            return self.render_error(r["error"], 422)
        return self.render_json(r["data"], status=201)

    async def update(self):
        cid = int(self.request.path_params["id"])
        raw = await self._get_body_json()
        try:
            parsed = CommunicationChannelUpdate.model_validate(raw)
        except ValidationError as e:
            return self.render_error(e.errors().__repr__(), 422)
        body = parsed.model_dump(exclude_none=True)
        if not body:
            return self.render_error("No fields to update", 422)
        r = CommunicationChannelService(self.db).update_channel(self._account_id(), cid, body)
        if not r["ok"]:
            return self.render_error(r["error"], 422)
        return self.render_json(r["data"])

    def destroy(self):
        cid = int(self.request.path_params["id"])
        r = CommunicationChannelService(self.db).delete_channel(self._account_id(), cid)
        if not r["ok"]:
            return self.render_error(r["error"], 404)
        return self.render_json(r["data"])

    def test(self):
        cid = int(self.request.path_params["id"])
        r = CommunicationChannelService(self.db).test_connection(self._account_id(), cid)
        if not r["ok"]:
            return self.render_error(r["error"], 422)
        return self.render_json(r["data"])

    def set_default(self):
        cid = int(self.request.path_params["id"])
        r = CommunicationChannelService(self.db).set_default(self._account_id(), cid)
        if not r["ok"]:
            return self.render_error(r["error"], 404)
        return self.render_json(r["data"])

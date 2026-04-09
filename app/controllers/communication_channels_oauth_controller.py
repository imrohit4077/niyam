"""Google OAuth start + callback for Gmail communication channels."""

from fastapi import HTTPException
from fastapi.responses import RedirectResponse

from app.controllers.base_controller import BaseController, before_action
from app.controllers.concerns.authenticatable import Authenticatable
from app.models.account_user import AccountUser
from app.services.communication_channel_oauth_service import CommunicationChannelOauthService


class CommunicationChannelsOauthController(BaseController, Authenticatable):
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
            raise HTTPException(status_code=403, detail="No account membership found")
        return au.account_id

    def google_authorize(self):
        uid = self._user_id()
        if uid is None:
            raise HTTPException(status_code=401, detail="Authentication required")
        r = CommunicationChannelOauthService(self.db).google_authorization_url(self._account_id(), int(uid))
        if not r["ok"]:
            return self.render_error(r["error"], status=503)
        return self.render_json(r["data"])

    def google_callback(self):
        code = self.request.query_params.get("code")
        state = self.request.query_params.get("state")
        err = self.request.query_params.get("error")
        r = CommunicationChannelOauthService(self.db).google_callback(code, state, err)
        return RedirectResponse(url=r["redirect_to"], status_code=302)

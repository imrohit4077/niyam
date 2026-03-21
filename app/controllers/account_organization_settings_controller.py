"""GET/PATCH /api/v1/account/organization_settings"""

from app.controllers.base_controller import BaseController, before_action
from app.controllers.concerns.authenticatable import Authenticatable
from app.models.account_user import AccountUser
from app.services.organization_settings_service import OrganizationSettingsService


class AccountOrganizationSettingsController(BaseController, Authenticatable):
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

    def show(self):
        r = OrganizationSettingsService(self.db).get_settings(self._account_id())
        if not r["ok"]:
            return self.render_error(r["error"], 404)
        return self.render_json(r["data"])

    async def update(self):
        data = await self._get_body_json()
        r = OrganizationSettingsService(self.db).update_settings(self._account_id(), data)
        if not r["ok"]:
            return self.render_error(r["error"], 422)
        return self.render_json(r["data"])

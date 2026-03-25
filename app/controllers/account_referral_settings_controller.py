"""GET/PATCH workspace referral program settings (account.settings['referral'])."""

from app.controllers.base_controller import BaseController, before_action
from app.controllers.concerns.authenticatable import Authenticatable
from app.models.account_user import AccountUser
from app.services.referral_account_settings_service import ReferralAccountSettingsService


class AccountReferralSettingsController(BaseController, Authenticatable):

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
        account_id = self._account_id()
        r = ReferralAccountSettingsService(self.db).get_settings(account_id)
        if not r["ok"]:
            return self.render_error(r["error"], status=404)
        return self.render_json(r["data"])

    async def update(self):
        self.require_admin()
        account_id = self._account_id()
        body = await self._get_body_json()
        r = ReferralAccountSettingsService(self.db).update_settings(account_id, body)
        if not r["ok"]:
            return self.render_error(r["error"], status=422)
        return self.render_json(r["data"])

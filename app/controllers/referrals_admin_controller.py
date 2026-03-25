"""Admin-only referral overview (all links, pipeline, history, claimed bonuses)."""

from app.controllers.base_controller import BaseController, before_action
from app.controllers.concerns.authenticatable import Authenticatable
from app.models.account_user import AccountUser
from app.services.referral_admin_service import ReferralAdminService


class ReferralsAdminController(BaseController, Authenticatable):

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

    def overview(self):
        self.require_admin()
        account_id = self._account_id()
        r = ReferralAdminService(self.db).overview(account_id)
        if not r["ok"]:
            return self.render_error(r.get("error") or "Failed", status=500)
        return self.render_json(r["data"])

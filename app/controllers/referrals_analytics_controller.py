"""Referral leaderboard and \"my referrals\" for employees."""

from app.controllers.base_controller import BaseController, before_action
from app.controllers.concerns.authenticatable import Authenticatable
from app.models.account_user import AccountUser
from app.services.referral_service import ReferralAnalyticsService


class ReferralsAnalyticsController(BaseController, Authenticatable):

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

    def leaderboard(self):
        account_id = self._account_id()
        raw = self.request.query_params.get("limit") or "50"
        try:
            limit = int(raw)
        except ValueError:
            limit = 50
        r = ReferralAnalyticsService(self.db).leaderboard(account_id, limit=limit)
        return self.render_json(r["data"])

    def my_referrals(self):
        account_id = self._account_id()
        uid = self._user_id()
        r = ReferralAnalyticsService(self.db).my_referrals(account_id, uid)
        return self.render_json(r["data"])

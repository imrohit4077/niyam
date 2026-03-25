"""Referral bonus payout queue (HR admin)."""

from app.controllers.base_controller import BaseController, before_action
from app.controllers.concerns.authenticatable import Authenticatable
from app.models.account_user import AccountUser
from app.services.referral_service import ReferralBonusService
from fastapi.responses import PlainTextResponse


class ReferralBonusesController(BaseController, Authenticatable):

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
        self.require_admin()
        account_id = self._account_id()
        status = self.request.query_params.get("status")
        r = ReferralBonusService(self.db).list_bonuses(account_id, status=status)
        return self.render_json(r["data"])

    async def update(self):
        self.require_admin()
        account_id = self._account_id()
        bonus_id = int(self.request.path_params["id"])
        body = await self._get_body_json()
        r = ReferralBonusService(self.db).update_bonus(account_id, bonus_id, body)
        if not r["ok"]:
            return self.render_error(r["error"], status=404)
        return self.render_json(r["data"])

    def export_csv(self):
        self.require_admin()
        account_id = self._account_id()
        csv_text = ReferralBonusService(self.db).export_csv(account_id)
        return PlainTextResponse(
            csv_text,
            media_type="text/csv",
            headers={"Content-Disposition": 'attachment; filename="referral_bonuses.csv"'},
        )

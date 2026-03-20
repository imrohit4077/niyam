"""CRUD /api/v1/esign_stage_rules"""

from app.controllers.base_controller import BaseController, before_action
from app.controllers.concerns.authenticatable import Authenticatable
from app.models.account_user import AccountUser
from app.services.esign_rule_service import EsignRuleService


class EsignStageRulesController(BaseController, Authenticatable):
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
        raw = self.request.query_params.get("job_id")
        job_id = int(raw) if raw else None
        r = EsignRuleService(self.db).list_rules(self._account_id(), job_id=job_id)
        return self.render_json(r["data"])

    def show(self):
        rid = int(self.request.path_params["id"])
        r = EsignRuleService(self.db).get_rule(self._account_id(), rid)
        if not r["ok"]:
            return self.render_error(r["error"], 404)
        return self.render_json(r["data"])

    async def create(self):
        data = await self._get_body_json()
        r = EsignRuleService(self.db).create_rule(self._account_id(), data)
        if not r["ok"]:
            return self.render_error(r["error"], 422)
        return self.render_json(r["data"], status=201)

    async def update(self):
        rid = int(self.request.path_params["id"])
        data = await self._get_body_json()
        r = EsignRuleService(self.db).update_rule(self._account_id(), rid, data)
        if not r["ok"]:
            return self.render_error(r["error"], 422)
        return self.render_json(r["data"])

    def destroy(self):
        rid = int(self.request.path_params["id"])
        r = EsignRuleService(self.db).delete_rule(self._account_id(), rid)
        if not r["ok"]:
            return self.render_error(r["error"], 404)
        return self.render_json(r["data"])

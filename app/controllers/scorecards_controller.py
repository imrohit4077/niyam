"""
Aggregated scorecard reads (tenant-scoped).
  GET /api/v1/applications/:application_id/scorecards
  GET /api/v1/jobs/:job_id/scorecards/debrief
"""

from app.controllers.base_controller import BaseController, before_action
from app.controllers.concerns.authenticatable import Authenticatable
from app.models.account_user import AccountUser
from app.models.application import Application
from app.services.access_control import can_read_application, effective_keys
from app.services.permission_resolution_service import permission_key
from app.services.scorecard_service import ScorecardService


class ScorecardsController(BaseController, Authenticatable):

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

    def by_application(self):
        account_id = self._account_id()
        app_id = int(self.request.path_params["application_id"])
        uid = int(self._user_id())
        app = Application.find_by(self.db, id=app_id, account_id=account_id)
        if not app or app.deleted_at or not can_read_application(self.db, account_id, uid, app):
            return self.render_error("Application not found", status=404)
        keys = effective_keys(self.db, account_id, uid, app.job_id)
        if not (
            permission_key("scorecards", "view_all") in keys
            or permission_key("interviews", "view_panel_feedback") in keys
            or permission_key("scorecards", "view_own") in keys
        ):
            return self.render_error("Not allowed", status=403)
        result = ScorecardService(self.db).list_for_application(account_id, app_id)
        if not result["ok"]:
            return self.render_error(result["error"], status=404)
        return self.render_json(result["data"])

    def debrief_for_job(self):
        account_id = self._account_id()
        job_id = int(self.request.path_params["job_id"])
        self.require_any_permission(
            [
                ("interviews", "view_panel_feedback"),
                ("scorecards", "view_all"),
            ],
            account_id=account_id,
            job_id=job_id,
        )
        result = ScorecardService(self.db).debrief_for_job(account_id, job_id)
        if not result["ok"]:
            return self.render_error(result["error"], status=404)
        return self.render_json(result["data"])

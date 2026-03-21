"""
Interviewer workflow (assignments, kit, scorecards).
Routes:
  GET   /api/v1/interviews/my_assignments
  GET   /api/v1/interviews/:assignment_id/kit
  PATCH /api/v1/interviews/:assignment_id
  POST  /api/v1/interviews/:assignment_id/scorecard
"""

from app.controllers.base_controller import BaseController, before_action
from app.controllers.concerns.authenticatable import Authenticatable
from app.helpers.logger import get_logger
from app.models.account_user import AccountUser
from app.services.interview_workflow_service import InterviewWorkflowService

logger = get_logger(__name__)


class InterviewsController(BaseController, Authenticatable):

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

    def my_assignments(self):
        account_id = self._account_id()
        user_id = self._user_id()
        status = self.request.query_params.get("status")
        q = self.request.query_params.get("q")
        result = InterviewWorkflowService(self.db).list_my_assignments(
            account_id, user_id, status=status, q=q
        )
        return self.render_json(result["data"])

    def kit(self):
        account_id = self._account_id()
        assignment_id = int(self.request.path_params["assignment_id"])
        result = InterviewWorkflowService(self.db).get_kit_for_assignment(
            account_id, assignment_id
        )
        if not result["ok"]:
            return self.render_error(result["error"], status=404)
        return self.render_json(result["data"])

    async def submit_scorecard(self):
        account_id = self._account_id()
        user_id = self._user_id()
        assignment_id = int(self.request.path_params["assignment_id"])
        data = await self._get_body_json()
        result = InterviewWorkflowService(self.db).submit_scorecard(
            account_id, assignment_id, user_id, data
        )
        if not result["ok"]:
            return self.render_error(result["error"], status=422)
        logger.info(
            "InterviewsController#scorecard",
            extra={"assignment_id": assignment_id, "user_id": user_id},
        )
        return self.render_json(result["data"], status=201)

    async def update_assignment(self):
        account_id = self._account_id()
        assignment_id = int(self.request.path_params["assignment_id"])
        data = await self._get_body_json()
        result = InterviewWorkflowService(self.db).update_assignment(
            account_id, assignment_id, data
        )
        if not result["ok"]:
            return self.render_error(result["error"], status=422)
        return self.render_json(result["data"])

"""
JobBoardsController — CRUD for job boards (global registry).
Routes:
  GET    /api/v1/job-boards
  POST   /api/v1/job-boards
  GET    /api/v1/job-boards/:id
  PUT    /api/v1/job-boards/:id
  DELETE /api/v1/job-boards/:id
"""

from app.controllers.base_controller import BaseController, before_action
from app.controllers.concerns.authenticatable import Authenticatable
from app.helpers.logger import get_logger
from app.models.account_user import AccountUser
from app.services.job_board_service import JobBoardService

logger = get_logger(__name__)


class JobBoardsController(BaseController, Authenticatable):

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
        account_id = self._account_id()
        self.require_permission("jobs", "view", account_id=account_id)
        active_only = self.request.query_params.get("active") == "true"
        q = self.request.query_params.get("q")
        result = JobBoardService(self.db).list_boards(active_only=active_only, q=q)
        return self.render_json(result["data"])

    def show(self):
        account_id = self._account_id()
        self.require_permission("jobs", "view", account_id=account_id)
        board_id = int(self.request.path_params["id"])
        result = JobBoardService(self.db).get_board(board_id)
        if not result["ok"]:
            return self.render_error(result["error"], status=404)
        return self.render_json(result["data"])

    async def create(self):
        account_id = self._account_id()
        self.require_permission("jobs", "edit", account_id=account_id)
        data = await self._get_body_json()
        result = JobBoardService(self.db).create_board(data)
        if not result["ok"]:
            return self.render_error(result["error"], status=422)
        logger.info(f"JobBoardsController#create — board created: {result['data'].get('slug')}")
        return self.render_json(result["data"], status=201)

    async def update(self):
        account_id = self._account_id()
        self.require_permission("jobs", "edit", account_id=account_id)
        board_id = int(self.request.path_params["id"])
        data = await self._get_body_json()
        result = JobBoardService(self.db).update_board(board_id, data)
        if not result["ok"]:
            return self.render_error(result["error"], status=404)
        return self.render_json(result["data"])

    def destroy(self):
        account_id = self._account_id()
        self.require_permission("jobs", "edit", account_id=account_id)
        board_id = int(self.request.path_params["id"])
        result = JobBoardService(self.db).delete_board(board_id)
        if not result["ok"]:
            return self.render_error(result["error"], status=404)
        return self.render_json(result["data"])

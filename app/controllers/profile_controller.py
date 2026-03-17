"""
ProfileController: current user profile.
Routes: GET /api/v1/profile
"""

from fastapi import HTTPException

from app.controllers.base_controller import BaseController, before_action
from app.controllers.concerns.authenticatable import Authenticatable
from app.helpers.logger import get_logger
from app.services.profile_service import ProfileService

logger = get_logger(__name__)


class ProfileController(BaseController, Authenticatable):

    @before_action
    def require_auth(self):
        self.authenticate_user()

    def show(self):
        user_id = self._user_id()
        logger.info(f"ProfileController#show — user_id={user_id} {self.request.method} {self.request.url.path}")
        result = ProfileService(self.db).get_profile(user_id)
        if not result["ok"]:
            logger.warning(f"ProfileController#show — not found user_id={user_id}")
            return self.render_error(result["error"], status=404)
        logger.info(f"ProfileController#show — responded 200 for user_id={user_id}")
        return self.render_json(result["data"])

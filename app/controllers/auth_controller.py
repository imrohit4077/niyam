"""
AuthController: login and token refresh.
Routes: POST /api/v1/auth/login, POST /api/v1/auth/refresh
"""

from app.controllers.base_controller import BaseController
from app.helpers.logger import get_logger
from app.schemas import LoginRequest, RefreshRequest
from app.services.auth_service import AuthService

logger = get_logger(__name__)


class AuthController(BaseController):

    async def login(self):
        body = await self._get_body_json()
        logger.info(f"AuthController#login — {self.request.method} {self.request.url.path}")
        try:
            req = LoginRequest(**body)
        except Exception as e:
            logger.warning(f"AuthController#login — validation error: {e}")
            return self.render_error(str(e), status=422)

        result = AuthService(self.db).login(req.email, req.password)
        if not result["ok"]:
            logger.warning(f"AuthController#login — failed: {result['error']}")
            return self.render_error(result["error"], status=401)

        logger.info("AuthController#login — responded 200")
        return self.render_json(result["data"])

    async def refresh(self):
        body = await self._get_body_json()
        logger.info(f"AuthController#refresh — {self.request.method} {self.request.url.path}")
        try:
            req = RefreshRequest(**body)
        except Exception as e:
            logger.warning(f"AuthController#refresh — validation error: {e}")
            return self.render_error(str(e), status=422)

        result = AuthService(self.db).refresh(req.refresh_token)
        if not result["ok"]:
            logger.warning(f"AuthController#refresh — failed: {result['error']}")
            return self.render_error(result["error"], status=401)

        logger.info("AuthController#refresh — responded 200")
        return self.render_json(result["data"])

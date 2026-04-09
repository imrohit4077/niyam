"""Read-only reference data (countries catalog)."""

from app.controllers.base_controller import BaseController, before_action
from app.controllers.concerns.authenticatable import Authenticatable
from app.helpers.countries_catalog import load_countries


class ReferenceController(BaseController, Authenticatable):
    @before_action
    def require_auth(self):
        self.authenticate_user()

    def countries(self):
        return self.render_json({"countries": load_countries()})

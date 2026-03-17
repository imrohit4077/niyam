"""Controller concerns (mixins)."""

from app.controllers.concerns.authenticatable import Authenticatable
from app.controllers.concerns.paginatable import Paginatable

__all__ = ["Authenticatable", "Paginatable"]

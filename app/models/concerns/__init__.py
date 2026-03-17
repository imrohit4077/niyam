"""Model concerns (mixins)."""

from app.models.concerns.timestampable import Timestampable
from app.models.concerns.soft_deletable import SoftDeletable
from app.models.concerns.sluggable import Sluggable

__all__ = ["Timestampable", "SoftDeletable", "Sluggable"]

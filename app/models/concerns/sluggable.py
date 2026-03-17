"""
Sluggable concern: slug column and auto-generation from a field.
Rails equivalent: friendly_id / babosa
"""

import re
from typing import Any, TYPE_CHECKING

from sqlalchemy import select
from sqlalchemy.orm import Mapped, mapped_column

if TYPE_CHECKING:
    from sqlalchemy.orm import Session


def sluggable_column(unique: bool = True) -> dict[str, Any]:
    """Return slug column definition."""
    return {
        "slug": mapped_column(
            type_=str,
            unique=unique,
            nullable=True,
            index=True,
        ),
    }


class Sluggable:
    """
    Mixin that adds slug and generate_slug(from_field) / ensure_unique_slug(db).
    """

    slug: Mapped[str | None]

    @staticmethod
    def _slugify(value: str) -> str:
        """Convert string to URL-friendly slug."""
        value = value.lower().strip()
        value = re.sub(r"[^\w\s-]", "", value)
        value = re.sub(r"[-\s]+", "-", value)
        return value.strip("-") or "slug"

    def generate_slug(self, from_field: str = "title") -> str:
        """Generate slug from the given attribute. Call before save."""
        source = getattr(self, from_field, None)
        if not source:
            return getattr(self, "slug", None) or "slug"
        self.slug = self._slugify(str(source))
        return self.slug

    def ensure_unique_slug(self, db: "Session") -> str:
        """Append -2, -3, ... if slug exists. Call after generate_slug."""
        if not self.slug:
            return ""
        model_class = type(self)
        base = self.slug
        slug = base
        n = 2
        while True:
            existing = db.execute(
                select(model_class).where(model_class.slug == slug)
            ).scalars().first()
            if not existing or existing is self:
                break
            slug = f"{base}-{n}"
            n += 1
        self.slug = slug
        return slug

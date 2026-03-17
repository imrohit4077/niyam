"""
Timestampable concern: created_at and updated_at columns with helpers.
Rails equivalent: ActiveRecord::Timestamp
"""

from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, func
from sqlalchemy.orm import Mapped, mapped_column


def timestampable_columns() -> dict[str, Any]:
    """Return column definitions for created_at and updated_at."""
    return {
        "created_at": mapped_column(
            DateTime(timezone=True),
            server_default=func.now(),
            nullable=False,
        ),
        "updated_at": mapped_column(
            DateTime(timezone=True),
            server_default=func.now(),
            onupdate=func.now(),
            nullable=False,
        ),
    }


class Timestampable:
    """
    Mixin that adds created_at and updated_at.
    Use time_since_created() and formatted_created_at() on instances.
    """

    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]

    def time_since_created(self) -> "__import__('datetime').timedelta":
        """Return timedelta since created_at."""
        from datetime import timezone
        now = datetime.now(timezone.utc)
        if self.created_at.tzinfo is None:
            from datetime import timezone as tz
            created = self.created_at.replace(tzinfo=tz.utc)
        else:
            created = self.created_at
        return now - created

    def formatted_created_at(self, fmt: str = "%Y-%m-%d") -> str:
        """Return created_at formatted by fmt."""
        return self.created_at.strftime(fmt)

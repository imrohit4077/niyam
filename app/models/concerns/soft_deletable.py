"""
SoftDeletable concern: deleted_at column and soft delete/restore.
Rails equivalent: paranoia / discard gem
"""

from datetime import datetime
from typing import Any, TypeVar

from sqlalchemy import DateTime, func, select
from sqlalchemy.orm import Mapped, mapped_column

from config.database import Base

T = TypeVar("T", bound=Base)


def soft_deletable_column() -> dict[str, Any]:
    """Return deleted_at column definition."""
    return {
        "deleted_at": mapped_column(DateTime(timezone=True), nullable=True),
    }


class SoftDeletable:
    """
    Mixin that adds deleted_at and soft_delete/restore/not_deleted/only_deleted.
    """

    deleted_at: Mapped[datetime | None]

    @property
    def is_deleted(self) -> bool:
        """True if this record is soft-deleted."""
        return self.deleted_at is not None

    def soft_delete(self, db: "Session") -> None:
        """Set deleted_at to now. Rails: model.discard."""
        from datetime import timezone
        self.deleted_at = datetime.now(timezone.utc)
        db.add(self)
        db.commit()
        db.refresh(self)

    def restore(self, db: "Session") -> None:
        """Clear deleted_at. Rails: model.undiscard."""
        self.deleted_at = None
        db.add(self)
        db.commit()
        db.refresh(self)

    @classmethod
    def not_deleted(cls, db: "Session") -> "list[T]":
        """Scope: exclude soft-deleted records."""
        from sqlalchemy.orm import Session
        stmt = select(cls).where(cls.deleted_at.is_(None))
        return list(db.execute(stmt).scalars().all())

    @classmethod
    def only_deleted(cls, db: "Session") -> "list[T]":
        """Scope: only soft-deleted records."""
        stmt = select(cls).where(cls.deleted_at.isnot(None))
        return list(db.execute(stmt).scalars().all())

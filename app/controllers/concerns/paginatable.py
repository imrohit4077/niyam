"""
Paginatable concern: paginate(query, page, per_page) with meta.
Rails equivalent: .page().per()
"""

from typing import Any

from fastapi import Request
from sqlalchemy.orm import Query

from config.settings import get_settings
from app.schemas import PaginationMeta


class Paginatable:
    """Mixin for controllers that need pagination. Max per_page: 100."""

    def paginate(
        self,
        query: Any,
        page: int = 1,
        per_page: int | None = None,
        max_per_page: int = 100,
    ) -> dict[str, Any]:
        """
        Apply offset/limit to query and return { data: [...], meta: PaginationMeta }.
        query can be SQLAlchemy select or query object with .limit()/.offset().
        """
        settings = get_settings()
        per_page = per_page or settings.DEFAULT_PAGE_SIZE
        per_page = min(per_page, max_per_page, settings.MAX_PAGE_SIZE)
        if page < 1:
            page = 1
        # Support both 2.0 select and legacy query
        if hasattr(query, "count"):
            total = query.count()
        else:
            from sqlalchemy import func, select
            from sqlalchemy.sql import FromClause
            if hasattr(query, "subquery"):
                count_stmt = select(func.count()).select_from(query.subquery())
            else:
                count_stmt = select(func.count()).select_from(query)
            total = self.db.execute(count_stmt).scalar() or 0
        offset = (page - 1) * per_page
        if hasattr(query, "offset"):
            items = query.offset(offset).limit(per_page).all()
        else:
            items = list(self.db.execute(query.offset(offset).limit(per_page)).scalars().all())
        total_pages = (total + per_page - 1) // per_page if total else 0
        meta = PaginationMeta(
            page=page,
            per_page=per_page,
            total=total,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_prev=page > 1,
        )
        return {"data": items, "meta": meta}

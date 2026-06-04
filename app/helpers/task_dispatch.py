"""
Enqueue Celery tasks with optional inline fallback when the broker is unavailable.

Matches patterns in application_service and label_service (API stays fast; work runs async).
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from app.helpers.logger import get_logger

logger = get_logger(__name__)


def dispatch_celery_task(
    task: Any,
    *,
    queue: str = "default",
    inline: Callable[..., Any] | None = None,
    log_context: dict[str, Any] | None = None,
    **kwargs: Any,
) -> bool:
    """
    Try ``task.delay(**kwargs)``. On broker/worker errors, run ``inline(**kwargs)`` if provided.

    Returns True when the task was queued, False when inline ran or nothing ran.
    """
    try:
        task.apply_async(kwargs=kwargs, queue=queue)
        return True
    except Exception:
        extra = log_context or {}
        logger.warning(
            "Could not enqueue Celery task %s",
            getattr(task, "name", task),
            exc_info=True,
            extra=extra,
        )
        if inline is not None:
            try:
                inline(**kwargs)
            except Exception:
                logger.exception(
                    "Inline fallback failed for %s",
                    getattr(task, "name", task),
                    extra=extra,
                )
        return False

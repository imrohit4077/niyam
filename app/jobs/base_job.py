"""
Base job with perform_later, perform_now, retry, and on_failure.
Rails equivalent: ApplicationJob / Sidekiq::Worker
"""

from typing import Any

from config.celery import celery_app


class BaseJob:
    """Base for all async jobs. Override perform() and optionally queue, retry_limit, retry_delay, on_failure."""

    queue = "default"
    retry_limit = 3
    retry_delay = 60  # seconds

    @classmethod
    def perform_later(cls, **kwargs: Any) -> Any:
        """Enqueue job to run asynchronously."""
        return cls.run.apply_async(args=(), kwargs=kwargs, queue=cls.queue)

    @classmethod
    def perform_now(cls, **kwargs: Any) -> Any:
        """Run job synchronously (for tests or inline)."""
        return cls().perform(**kwargs)

    def perform(self, **kwargs: Any) -> Any:
        """Override in subclass. Main job logic."""
        raise NotImplementedError("Subclass must implement perform()")

    def on_failure(self, exc: Exception, kwargs: dict[str, Any]) -> None:
        """Override for custom error handling when job fails after retries."""
        print(f"Job {self.__class__.__name__} failed: {exc} kwargs={kwargs}")

"""Background jobs. Rails equivalent: app/jobs/ (ActiveJob)."""

from app.jobs.base_job import BaseJob

__all__ = ["BaseJob"]

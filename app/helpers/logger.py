"""
Structured logger helper.
Usage: from app.helpers.logger import get_logger; logger = get_logger(__name__)
Outputs: [LEVEL] filename:lineno — message
Rails equivalent: Rails.logger
"""

import logging
import sys


class _RailsFormatter(logging.Formatter):
    """Format: [LEVEL] filename:lineno — message"""

    LEVEL_COLORS = {
        "DEBUG":    "\033[36m",   # cyan
        "INFO":     "\033[32m",   # green
        "WARNING":  "\033[33m",   # yellow
        "ERROR":    "\033[31m",   # red
        "CRITICAL": "\033[35m",   # magenta
    }
    RESET = "\033[0m"

    def format(self, record: logging.LogRecord) -> str:
        color = self.LEVEL_COLORS.get(record.levelname, "")
        level = f"{color}[{record.levelname}]{self.RESET}"
        location = f"{record.filename}:{record.lineno}"
        return f"{level} {location} — {record.getMessage()}"


def get_logger(name: str) -> logging.Logger:
    """Return a named logger with Rails-style formatting."""
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(_RailsFormatter())
        logger.addHandler(handler)
        logger.setLevel(logging.DEBUG)
        logger.propagate = False
    return logger

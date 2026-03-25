"""
Application logger. Rails equivalent: Rails.logger

All behavior (format, colors, levels, SQL) is configured once in
config/logging_setup.py — do not add handlers here.

Usage:
    from app.helpers.logger import get_logger
    logger = get_logger(__name__)
"""

import logging

from config.logging_setup import ensure_logging_configured


def get_logger(name: str) -> logging.Logger:
    """Named logger; shares root Forge formatter after configure_logging() runs."""
    ensure_logging_configured()
    return logging.getLogger(name)

"""
Central logging configuration for ATS (web server, Celery worker, beat, shell).

Rails-style clarity:
  - One place to tune format, colors, levels, and SQL logging.
  - Same Forge formatter for API and background workers (see config/celery.py signals).
  - Worker/beat: set LOG_COLOR_WORKER=false if you ship logs without ANSI escapes.
  - Log lines: file:line first, then UTC time, level (color), process (web|worker|beat),
    layer (Controller/Service/Job/[Celery:…]/[SQL]), message.
  - SQL lines (LOG_SQL): INSERT green, SELECT blue, UPDATE yellow, DELETE red, other cyan.

Usage elsewhere (unchanged):
  from app.helpers.logger import get_logger
  logger = get_logger(__name__)

Do not add handlers in feature code — get_logger() attaches to the shared tree only.
"""

from __future__ import annotations

import inspect
import logging
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# ── Process label (web | worker | beat | shell | app) ─────────────────
_PROCESS_NAME = "app"

# Layer hints from logger name prefix (app.controllers.* → Controller)
_BUCKET_TO_LAYER: dict[str, str] = {
    "controllers": "Controller",
    "services": "Service",
    "jobs": "Job",
    "middleware": "Middleware",
    "helpers": "Helper",
    "models": "Model",
}

# ANSI (disable with NO_COLOR=1 or non-TTY when LOG_COLOR defaults)
_RESET = "\033[0m"
_DIM = "\033[2m"
_LEVEL_STYLES: dict[str, tuple[str, str]] = {
    "DEBUG": ("\033[36m", "cyan"),      # cyan
    "INFO": ("\033[32m", "green"),      # green
    "WARNING": ("\033[33m", "yellow"),  # yellow
    "ERROR": ("\033[31m", "red"),       # red
    "CRITICAL": ("\033[35m", "magenta"),
}
# SQL statement colors (before_cursor_execute → app.sql)
_SQL_COLOR_INSERT = "\033[92m"  # bright green — INSERT
_SQL_COLOR_SELECT = "\033[94m"  # bright blue — SELECT / reads
_SQL_COLOR_UPDATE = "\033[93m"  # bright yellow — UPDATE
_SQL_COLOR_DELETE = "\033[91m"  # bright red — DELETE
_SQL_COLOR_OTHER = "\033[96m"  # bright cyan — PRAGMA, DDL, etc.

_SQL_KIND_TO_COLOR: dict[str, str] = {
    "insert": _SQL_COLOR_INSERT,
    "select": _SQL_COLOR_SELECT,
    "update": _SQL_COLOR_UPDATE,
    "delete": _SQL_COLOR_DELETE,
    "other": _SQL_COLOR_OTHER,
}
_CELERY_ACCENT = "\033[1;35m"  # bold magenta for [Celery:…] tags in worker/beat logs


class ForgeLogFormatter(logging.Formatter):
    """
    filename:lineno [timestamp UTC] [LEVEL] [process] [layer] — message
    SQL (logger app.sql): … [SQL] … — INSERT green, SELECT blue, UPDATE yellow, DELETE red, other cyan.
    """

    def __init__(self, *, use_color: bool = True) -> None:
        super().__init__()
        self._use_color = use_color

    def format(self, record: logging.LogRecord) -> str:
        ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
        level = record.levelname
        proc = getattr(record, "process_name", _PROCESS_NAME)
        layer, _short = _layer_from_logger(record.name)
        loc = f"{record.filename}:{record.lineno}"
        msg = record.getMessage()
        is_sql = record.name.startswith("app.sql")
        # SQL lines: show the app caller (service/controller/…) not the hook in logging_setup.py
        sql_src = getattr(record, "sql_source", None)
        if is_sql and isinstance(sql_src, str) and sql_src.strip():
            loc = sql_src.strip()

        if self._use_color:
            lc, _ = _LEVEL_STYLES.get(level, ("", ""))
            level_s = f"{lc}{level}{_RESET}"
            proc_s = f"{_DIM}{proc}{_RESET}"
            # First column: source location (bold so it stays visible at line start)
            loc_s = f"\033[1m{loc}{_RESET}"
            if is_sql:
                kind = getattr(record, "sql_kind", None) or "other"
                sql_c = _SQL_KIND_TO_COLOR.get(kind, _SQL_COLOR_OTHER)
                layer_s = f"{sql_c}[SQL]{_RESET}"
                msg = f"{sql_c}{msg}{_RESET}"
            elif layer.startswith("[Celery"):
                layer_s = f"{_CELERY_ACCENT}{layer}{_RESET}"
            else:
                layer_s = f"{_DIM}{layer}{_RESET}" if layer else ""
        else:
            level_s, proc_s = level, proc
            loc_s = loc
            layer_s = f"[SQL]" if is_sql else (layer if layer else "")

        layer_part = f" {layer_s}" if layer_s else ""
        # Convention: filename:line_number first, then timestamp and metadata
        prefix = f"{loc_s} [{ts} UTC] [{level_s}] [{proc_s}]{layer_part} —"
        out = f"{prefix} {msg}"
        if record.exc_info:
            out += "\n" + self.formatException(record.exc_info)
        return out


class _ForgeFilter(logging.Filter):
    """Inject process_name into every record for the formatter."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.process_name = _PROCESS_NAME  # type: ignore[attr-defined]
        return True


def _layer_from_logger(name: str) -> tuple[str, str]:
    """Return (display layer string, short module name) for log prefix."""
    if name.startswith("app.sql"):
        return ("", "")  # [SQL] is rendered in formatter (blue brackets)
    if name == "celery" or name.startswith("celery."):
        tail = name.split(".")[-1] if "." in name else name
        return (f"[Celery:{tail}]", tail)
    if not name.startswith("app."):
        return ("", name.split(".")[-1] if "." in name else name)
    parts = name.split(".")
    if len(parts) < 3:
        return ("", parts[-1])
    bucket = parts[1]
    mod = parts[-1]
    layer = _BUCKET_TO_LAYER.get(bucket, bucket.title())
    return (f"[{layer}:{mod}]", mod)


_configured = False
_root_handler_token = "_forge_root_console"


def _want_color(settings: Any, process_name: str | None = None) -> bool:
    if os.environ.get("NO_COLOR"):
        return False
    if os.environ.get("FORCE_COLOR"):
        return True
    if hasattr(settings, "LOG_COLOR") and settings.LOG_COLOR is False:
        return False
    # Background workers often run without a TTY; still show colors when enabled (production-grade console).
    if process_name in ("worker", "beat") and getattr(settings, "LOG_COLOR_WORKER", True):
        return True
    return sys.stdout.isatty()


def _parse_level(name: str) -> int:
    return getattr(logging, name.upper(), logging.INFO)


def silence_sqlalchemy_engine_loggers() -> None:
    """
    Turn off SQLAlchemy's default engine/pool loggers (no duplicate SQL, no base.py line noise).
    Safe to call from database.py even if configure_logging has not run yet.
    """
    for name in ("sqlalchemy.engine", "sqlalchemy.pool"):
        logging.getLogger(name).setLevel(logging.WARNING)


def configure_logging(
    process_name: str | None = None,
    *,
    force: bool = False,
) -> None:
    """
    Idempotent setup: root StreamHandler + Forge formatter, levels, third-party noise reduction.
    Call from main (web), Celery signals (worker/beat), manage.py shell, etc.

    process_name: 'web' | 'worker' | 'beat' | 'shell' | 'app'
    force: if True, re-apply (e.g. after Celery hijacks the root logger).
    """
    global _PROCESS_NAME, _configured

    from config.settings import get_settings

    settings = get_settings()
    if process_name:
        _PROCESS_NAME = process_name

    use_color = _want_color(settings, process_name or _PROCESS_NAME)
    level = _parse_level(getattr(settings, "LOG_LEVEL", "INFO"))

    root = logging.getLogger()
    root.setLevel(level)

    # Remove previous Forge handler when forcing (Celery replaces handlers)
    if force:
        root.handlers = [h for h in root.handlers if getattr(h, _root_handler_token, None) is None]

    has_forge = any(getattr(h, _root_handler_token, None) for h in root.handlers)
    if not has_forge or force:
        handler = logging.StreamHandler(sys.stdout)
        setattr(handler, _root_handler_token, True)
        handler.setFormatter(ForgeLogFormatter(use_color=use_color))
        handler.addFilter(_ForgeFilter())
        root.addHandler(handler)

    # App code
    logging.getLogger("app").setLevel(level)

    # HTTP server / ASGI
    for name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        logging.getLogger(name).setLevel(level)

    # SQLAlchemy built-in logging: always WARNING — we never use echo + engine INFO
    # (avoids duplicate lines and sqlalchemy internal base.py:1846 noise). Real SQL lines
    # go through logger app.sql when LOG_SQL=true (before_cursor_execute).
    silence_sqlalchemy_engine_loggers()
    if getattr(settings, "LOG_SQL", True):
        logging.getLogger("app.sql").setLevel(logging.INFO)
    else:
        logging.getLogger("app.sql").setLevel(logging.WARNING)

    # Other chatty libraries
    for name in ("httpx", "httpcore", "celery.redirected", "kombu", "amqp"):
        logging.getLogger(name).setLevel(logging.WARNING)

    # Celery / background: same log level as app; Forge formatter applies via root handler
    if (process_name or _PROCESS_NAME) in ("worker", "beat"):
        for name in (
            "celery",
            "celery.app",
            "celery.worker",
            "celery.task",
            "celery.beat",
        ):
            logging.getLogger(name).setLevel(level)

    _configured = True


def ensure_logging_configured() -> None:
    """Lazy init when a module logs before main() (e.g. import-time side effects)."""
    global _configured
    if _configured:
        return
    configure_logging(process_name="app")


def _classify_sql_statement(statement: str) -> str:
    """
    Classify SQL for terminal color: insert | select | update | delete | other.
    Strips leading comments (-- …, /* … */) so dialects that prefix comments still classify.
    """
    s = statement.lstrip()
    if not s:
        return "other"
    while True:
        t = s.lstrip()
        if t.startswith("--"):
            nl = s.find("\n")
            if nl == -1:
                return "other"
            s = s[nl + 1 :]
            continue
        if t.startswith("/*"):
            end = s.find("*/")
            if end == -1:
                break
            s = s[end + 2 :]
            continue
        break
    s = s.strip()
    if not s:
        return "other"
    head = s.split(None, 1)[0].upper()
    if head in ("INSERT", "REPLACE"):
        return "insert"
    if head == "UPDATE":
        return "update"
    if head == "DELETE":
        return "delete"
    if head in ("SELECT", "WITH"):
        return "select"
    return "other"


def _sql_app_caller() -> tuple[str, int]:
    """
    Innermost stack frame under app/ (prefers services|controllers|models|jobs).
    Falls back to logging_setup.py if nothing matches (e.g. ad-hoc script outside app/).
    """
    root = Path(__file__).resolve().parent.parent
    hook_name = Path(__file__).name
    preferred = ("services", "controllers", "models", "jobs")
    skip = ("middleware", "helpers")
    any_app: tuple[str, int] | None = None
    for frame_info in inspect.stack()[1:]:
        try:
            p = Path(frame_info.filename).resolve()
            rel = p.relative_to(root)
        except (OSError, ValueError):
            continue
        parts = rel.parts
        if len(parts) >= 2 and parts[0] == "app":
            if parts[1] in preferred:
                return rel.name, frame_info.lineno
            if parts[1] not in skip and any_app is None:
                any_app = (rel.name, frame_info.lineno)
    return any_app or (hook_name, 245)


def attach_sqlalchemy_cursor_logging(engine: Any) -> None:
    """
    Log each executed statement with [SQL] styling when LOG_SQL is true (default: on).
    Uses SQLAlchemy before_cursor_execute — PostgreSQL, MySQL, SQLite, etc.
    """
    from sqlalchemy import event

    from config.settings import get_settings

    if not getattr(get_settings(), "LOG_SQL", True):
        return

    log = logging.getLogger("app.sql")

    @event.listens_for(engine, "before_cursor_execute")
    def _log_sql(
        conn: Any,
        cursor: Any,
        statement: str,
        parameters: Any,
        context: Any,
        executemany: bool,
    ) -> None:
        if not log.isEnabledFor(logging.INFO):
            return
        caller_file, caller_line = _sql_app_caller()
        # One line; truncate huge batches
        params = parameters
        if parameters is not None and isinstance(parameters, (list, tuple)) and len(str(parameters)) > 500:
            params = f"<{len(parameters)} params>"
        msg = statement.strip()[:2000]
        if params is not None:
            msg = f"{msg} | params={params!r}"
        sql_kind = _classify_sql_statement(statement)
        log.info(
            msg,
            extra={
                "sql_source": f"{caller_file}:{caller_line}",
                "sql_kind": sql_kind,
            },
        )


def is_configured() -> bool:
    return _configured

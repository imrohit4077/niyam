"""Persist and remove uploaded blobs (local disk or MinIO)."""

from __future__ import annotations

import mimetypes
import re
from pathlib import Path

from config.settings import get_settings

from app.helpers.object_storage import object_storage_enabled, put_object, remove_object


def attachments_root() -> Path:
    settings = get_settings()
    if settings.JOB_ATTACHMENTS_DIR:
        return Path(settings.JOB_ATTACHMENTS_DIR).expanduser().resolve()
    return Path(__file__).resolve().parents[2] / "storage" / "job_attachments"


def safe_upload_filename(name: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", name).strip("._")
    return cleaned[:140] or "document"


def absolute_public_file_url(file_url: str) -> str:
    """If PUBLIC_FILES_BASE_URL is set and path is our /files/... URL, return absolute URL for clients."""
    u = _normalized_files_path(file_url) or (file_url or "").strip()
    if not u.startswith("/files/"):
        return (file_url or "").strip()
    base = (get_settings().PUBLIC_FILES_BASE_URL or "").strip().rstrip("/")
    if base:
        return f"{base}{u}"
    return u


def _normalized_files_path(file_url: str) -> str | None:
    """Turn stored or absolute /files URL into a path starting with /files/..."""
    u = (file_url or "").strip()
    base = (get_settings().PUBLIC_FILES_BASE_URL or "").strip().rstrip("/")
    if base and u.startswith(base):
        u = u[len(base) :]
    if not u.startswith("/files/") and "/files/" in u:
        u = u[u.index("/files/") :]
    if u.startswith("/files/"):
        return u
    return None


def file_url_to_storage_key(file_url: str) -> str | None:
    u = _normalized_files_path(file_url)
    if not u:
        return None
    rest = u[7:].lstrip("/")
    if not rest or ".." in rest.split("/"):
        return None
    return rest


def persist_uploaded_file(
    rel_parts: list[str],
    unique_name: str,
    file_bytes: bytes,
    original_filename: str,
) -> str:
    """Write bytes to MinIO or under attachments_root; return public path /files/..."""
    if not rel_parts or not unique_name:
        raise ValueError("rel_parts and unique_name are required")
    key = "/".join([*rel_parts, unique_name])
    guessed, _ = mimetypes.guess_type(original_filename or "")
    content_type = guessed or "application/octet-stream"
    if object_storage_enabled():
        put_object(key, file_bytes, content_type)
    else:
        target_dir = attachments_root().joinpath(*rel_parts)
        target_dir.mkdir(parents=True, exist_ok=True)
        (target_dir / unique_name).write_bytes(file_bytes)
    return "/" + "/".join(["files", *rel_parts, unique_name])


def delete_stored_file_if_managed(file_url: str) -> None:
    """Remove a blob we own (same-origin /files/...). External URLs are ignored."""
    key = file_url_to_storage_key(file_url)
    if not key:
        return
    if object_storage_enabled():
        remove_object(key)
        return
    path = attachments_root().joinpath(*key.split("/"))
    try:
        if path.is_file():
            path.unlink()
    except OSError:
        pass

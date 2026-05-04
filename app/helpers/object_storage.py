"""S3-compatible object storage (MinIO) for uploaded files."""

from __future__ import annotations

import io

from app.helpers.logger import get_logger
from config.settings import get_settings

logger = get_logger(__name__)

_minio_client = None


def _normalize_endpoint(endpoint: str) -> str:
    e = (endpoint or "").strip()
    for prefix in ("https://", "http://"):
        if e.startswith(prefix):
            e = e[len(prefix) :]
    return e.split("/")[0].strip()


def object_storage_enabled() -> bool:
    s = get_settings()
    ep = _normalize_endpoint(s.MINIO_ENDPOINT)
    return bool(ep and s.MINIO_ACCESS_KEY and s.MINIO_SECRET_KEY and s.MINIO_BUCKET)


def get_minio_client():
    global _minio_client
    if _minio_client is None:
        from minio import Minio

        s = get_settings()
        region = (s.MINIO_REGION or "").strip() or None
        _minio_client = Minio(
            _normalize_endpoint(s.MINIO_ENDPOINT),
            access_key=s.MINIO_ACCESS_KEY,
            secret_key=s.MINIO_SECRET_KEY,
            secure=s.MINIO_USE_SSL,
            region=region,
        )
    return _minio_client


def ensure_bucket_exists() -> None:
    if not object_storage_enabled():
        return
    s = get_settings()
    client = get_minio_client()
    bucket = s.MINIO_BUCKET
    if not client.bucket_exists(bucket):
        client.make_bucket(bucket)


def put_object(object_name: str, data: bytes, content_type: str) -> None:
    client = get_minio_client()
    bucket = get_settings().MINIO_BUCKET
    stream = io.BytesIO(data)
    client.put_object(bucket, object_name, stream, length=len(data), content_type=content_type)
    st = client.stat_object(bucket, object_name)
    logger.info(
        "MinIO put_object ok bucket=%s key=%s bytes=%s content_type=%s",
        bucket,
        object_name,
        len(data),
        st.content_type or content_type,
    )


def remove_object(object_name: str) -> None:
    if not object_storage_enabled():
        return
    from minio.error import S3Error

    try:
        get_minio_client().remove_object(get_settings().MINIO_BUCKET, object_name)
    except S3Error:
        pass


def stat_object(object_name: str):
    return get_minio_client().stat_object(get_settings().MINIO_BUCKET, object_name)


def get_object(object_name: str):
    return get_minio_client().get_object(get_settings().MINIO_BUCKET, object_name)


def validate_storage_key_from_path(full_path: str) -> str | None:
    """Return object key or None if path is unsafe (traversal)."""
    raw = (full_path or "").strip().replace("\\", "/")
    segments = [s for s in raw.split("/") if s and s != "."]
    if not segments or any(s == ".." for s in segments):
        return None
    return "/".join(segments)

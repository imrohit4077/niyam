"""Register GET/HEAD /files/... (MinIO) or StaticFiles mount (local disk)."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.requests import Request
from starlette.responses import JSONResponse, Response, StreamingResponse

from app.helpers.object_storage import (
    get_object,
    object_storage_enabled,
    stat_object,
    validate_storage_key_from_path,
)
from app.helpers.uploaded_file_storage import attachments_root


def register_uploaded_files_routes(app: FastAPI) -> None:
    root = attachments_root()
    root.mkdir(parents=True, exist_ok=True)

    if object_storage_enabled():

        @app.api_route("/files/{full_path:path}", methods=["GET", "HEAD"])
        async def serve_uploaded_file(full_path: str, request: Request) -> Response:
            key = validate_storage_key_from_path(full_path)
            if not key:
                return JSONResponse(
                    status_code=404,
                    content={"success": False, "error": "Not found", "code": 404},
                )
            from minio.error import S3Error

            try:
                st = stat_object(key)
            except S3Error as e:
                code = getattr(e, "code", None)
                http_status = getattr(getattr(e, "response", None), "status", None)
                if code in ("NoSuchKey", "NotFound") or http_status == 404:
                    return JSONResponse(
                        status_code=404,
                        content={"success": False, "error": "Not found", "code": 404},
                    )
                raise
            ct = st.content_type or "application/octet-stream"
            cl = str(st.size) if st.size is not None else None
            headers = {"content-type": ct}
            if cl:
                headers["content-length"] = cl
            if request.method == "HEAD":
                return Response(status_code=200, headers=headers)

            obj = get_object(key)

            def body_iter():
                try:
                    for chunk in obj.stream(64 * 1024):
                        yield chunk
                finally:
                    obj.close()
                    obj.release_conn()

            return StreamingResponse(
                body_iter(),
                media_type=ct,
                headers=headers if cl else {"content-type": ct},
            )

    else:
        app.mount("/files", StaticFiles(directory=str(root)), name="files")

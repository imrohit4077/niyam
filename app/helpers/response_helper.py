"""
Standardized JSON response helpers.
Rails equivalent: render json: { ... } with a standard envelope
"""

from typing import Any

from fastapi.responses import JSONResponse


def success_response(data: Any, status: int = 200, meta: dict[str, Any] | None = None) -> JSONResponse:
    """Return standard success envelope: { success: true, data, meta? }."""
    body: dict[str, Any] = {"success": True, "data": data}
    if meta:
        body["meta"] = meta
    return JSONResponse(content=body, status_code=status)


def error_response(error: str, code: int = 400) -> JSONResponse:
    """Return standard error envelope: { success: false, error, code }."""
    return JSONResponse(
        content={"success": False, "error": error, "code": code},
        status_code=code,
    )

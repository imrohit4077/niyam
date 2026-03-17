"""
Base controller: before_action, render_json, params.
Rails equivalent: ApplicationController
"""

from typing import Any, Callable

from fastapi import Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.helpers.response_helper import success_response, error_response

_BEFORE_ACTIONS: dict[type, list[tuple[Callable[..., None], list[str], list[str]]]] = {}
_AFTER_ACTIONS: dict[type, list[Callable[..., Any]]] = {}
_SKIP_BEFORE: dict[type, list[tuple[str, list[str]]]] = {}


def before_action(
    fn: Callable[..., None] | None = None,
    only: list[str] | None = None,
    except_list: list[str] | None = None,
) -> Callable[..., None]:
    only = only or []
    except_list = except_list or []

    def decorator(f: Callable[..., None]) -> Callable[..., None]:
        f._before_action = (only, except_list)  # type: ignore
        return f

    if fn is not None:
        return decorator(fn)
    return decorator


def after_action(fn: Callable[..., Any]) -> Callable[..., Any]:
    fn._after_action = True  # type: ignore
    return fn


def skip_before_action(filter_name: str, only: list[str] | None = None) -> Callable[[type], type]:
    def decorator(cls: type) -> type:
        if cls not in _SKIP_BEFORE:
            _SKIP_BEFORE[cls] = []
        _SKIP_BEFORE[cls].append((filter_name, only or []))
        return cls
    return decorator


class BaseController:
    @classmethod
    def __init_subclass__(cls, **kwargs: Any) -> None:
        super().__init_subclass__(**kwargs)
        for name in dir(cls):
            attr = getattr(cls, name)
            if callable(attr) and getattr(attr, "_before_action", None):
                only, except_list = attr._before_action  # type: ignore
                if cls not in _BEFORE_ACTIONS:
                    _BEFORE_ACTIONS[cls] = []
                _BEFORE_ACTIONS[cls].append((attr, only, except_list))

    def __init__(self, request: Request, db: Session) -> None:
        self.request = request
        self.db = db
        self.current_user = getattr(request.state, "current_user", None)

    @property
    def params(self) -> dict[str, Any]:
        path = getattr(self.request, "path_params", None) or {}
        query = dict(self.request.query_params) if self.request.query_params else {}
        body = {}
        try:
            if self.request.headers.get("content-type", "").startswith("application/json"):
                body = getattr(self.request.state, "_json_body", {})
        except Exception:
            pass
        return {**path, **query, **body}

    def render_json(
        self,
        data: Any,
        status: int = 200,
        meta: dict[str, Any] | None = None,
    ) -> JSONResponse:
        return success_response(data, status=status, meta=meta)

    def render_error(self, msg: str, status: int = 400) -> JSONResponse:
        return error_response(msg, code=status)

    async def _get_body_json(self) -> dict[str, Any]:
        if hasattr(self.request.state, "_json_body"):
            return getattr(self.request.state, "_json_body")
        try:
            body = await self.request.json()
        except Exception:
            body = {}
        self.request.state._json_body = body  # type: ignore
        return body

    @classmethod
    def _run_before_actions(cls, instance: "BaseController", action: str) -> None:
        for c in cls.__mro__:
            if c not in _BEFORE_ACTIONS:
                continue
            skip_list = _SKIP_BEFORE.get(c, [])
            for fn, only, except_list in _BEFORE_ACTIONS[c]:
                if only and action not in only:
                    continue
                if except_list and action in except_list:
                    continue
                skip = False
                for skip_name, skip_only in skip_list:
                    if skip_name == fn.__name__ and (not skip_only or action in skip_only):
                        skip = True
                        break
                if skip:
                    continue
                fn(instance)

    @classmethod
    def _run_after_actions(cls, instance: "BaseController", action: str, response: Any) -> Any:
        for c in cls.__mro__:
            if c not in _AFTER_ACTIONS:
                continue
            for fn in _AFTER_ACTIONS[c]:
                response = fn(instance, response) or response
        return response

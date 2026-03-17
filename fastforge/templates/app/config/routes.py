"""
Route helpers: resources(), _wrap(). Used by app/routes/*_routes.py.
Rails equivalent: config/routes.rb — resources() registers REST actions.
"""

import asyncio
from typing import Callable

from fastapi import APIRouter, Request, Depends
from sqlalchemy.orm import Session

from config.database import get_db


def _wrap(
    controller_cls: type,
    action: str,
    handler: Callable,
    run_before: bool = True,
) -> Callable:
    async def _async_wrapper(
        request: Request,
        db: Session = Depends(get_db),
        **path_params: int | str,
    ):
        request.state.path_params = path_params or {}
        ctrl = controller_cls(request=request, db=db)
        if run_before:
            controller_cls._run_before_actions(ctrl, action)
        result = handler(ctrl)
        if asyncio.iscoroutine(result):
            return await result
        return result

    return _async_wrapper


def resources(
    app_or_router: "APIRouter | FastAPI",
    path: str,
    controller_cls: type,
    only: list[str] | None = None,
) -> None:
    """Register REST resource routes: index, show, create, update, destroy."""
    only = only or ["index", "show", "create", "update", "destroy"]
    if "index" in only:
        app_or_router.add_api_route(
            path,
            _wrap(controller_cls, "index", lambda c: c.index()),
            methods=["GET"],
        )
    if "create" in only:
        app_or_router.add_api_route(
            path,
            _wrap(controller_cls, "create", lambda c: c.create()),
            methods=["POST"],
        )
    if "show" in only:
        app_or_router.add_api_route(
            f"{path}/{{id:int}}",
            _wrap(controller_cls, "show", lambda c: c.show()),
            methods=["GET"],
        )
    if "update" in only:
        app_or_router.add_api_route(
            f"{path}/{{id:int}}",
            _wrap(controller_cls, "update", lambda c: c.update()),
            methods=["PUT"],
        )
    if "destroy" in only:
        app_or_router.add_api_route(
            f"{path}/{{id:int}}",
            _wrap(controller_cls, "destroy", lambda c: c.destroy()),
            methods=["DELETE"],
        )

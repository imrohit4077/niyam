"""
Central route definitions. Rails equivalent: config/routes.rb
Single file where all routes are registered. Uses resources() and namespace().
Add your controllers and routes here.
"""

import asyncio
from typing import Callable

from fastapi import APIRouter, Request, Depends
from sqlalchemy.orm import Session

from config.database import get_db
from app.helpers.response_helper import error_response


def _wrap(
    controller_cls: type,
    action: str,
    handler: Callable,
    run_before: bool = True,
) -> Callable:
    """Run before_actions then call controller action. Return response."""

    async def _async_wrapper(
        request: Request,
        db: Session = Depends(get_db),
    ):
        request.state.path_params = getattr(request, "path_params", None) or {}
        ctrl = controller_cls(request=request, db=db)
        try:
            if run_before:
                controller_cls._run_before_actions(ctrl, action)
        except Exception as e:
            from fastapi import HTTPException as _HTTPException
            if isinstance(e, _HTTPException):
                raise
            return error_response(str(e), code=500)
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
    """
    Register REST resource routes: index, show, create, update, destroy.
    GET path -> index, POST path -> create, GET path/{id} -> show, PUT path/{id} -> update, DELETE path/{id} -> destroy.
    """
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


def namespace(app: "FastAPI", prefix: str):
    """Context manager: yield a router with prefix, then include it in app."""
    router = APIRouter(prefix=prefix)
    yield router
    app.include_router(router)


def draw_routes(app: "FastAPI") -> None:
    """
    Register all routes. Rails equivalent: config/routes.rb
    """
    from app.controllers.auth_controller import AuthController
    from app.controllers.profile_controller import ProfileController
    from app.controllers.jobs_controller import JobsController
    from app.controllers.job_boards_controller import JobBoardsController
    from app.controllers.job_postings_controller import JobPostingsController
    from app.controllers.applications_controller import ApplicationsController

    router = APIRouter(prefix="/api/v1")

    # Auth (public)
    router.add_api_route("/auth/login", _wrap(AuthController, "login", lambda c: c.login()), methods=["POST"])
    router.add_api_route("/auth/refresh", _wrap(AuthController, "refresh", lambda c: c.refresh()), methods=["POST"])

    # Profile (protected)
    router.add_api_route(
        "/profile",
        _wrap(ProfileController, "show", lambda c: c.show()),
        methods=["GET"],
    )

    # Jobs CRUD
    resources(router, "/jobs", JobsController)

    # Job versions (nested under jobs)
    router.add_api_route(
        "/jobs/{job_id:int}/versions",
        _wrap(JobsController, "list_versions", lambda c: c.list_versions()),
        methods=["GET"],
    )
    router.add_api_route(
        "/jobs/{job_id:int}/versions",
        _wrap(JobsController, "create_version", lambda c: c.create_version()),
        methods=["POST"],
    )

    # Job boards CRUD
    resources(router, "/job-boards", JobBoardsController)

    # Job postings CRUD
    resources(router, "/postings", JobPostingsController)

    # Applications CRUD
    resources(router, "/applications", ApplicationsController, only=["index", "show", "create", "destroy"])

    # Application stage update
    router.add_api_route(
        "/applications/{id:int}/stage",
        _wrap(ApplicationsController, "update_stage", lambda c: c.update_stage()),
        methods=["PATCH"],
    )

    app.include_router(router)

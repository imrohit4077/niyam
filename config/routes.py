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
    from app.controllers.hiring_plans_controller import HiringPlansController
    from app.controllers.pipeline_stages_controller import PipelineStagesController
    from app.controllers.interview_plans_controller import InterviewPlansController
    from app.controllers.interviews_controller import InterviewsController
    from app.controllers.scorecards_controller import ScorecardsController
    from app.controllers.account_members_controller import AccountMembersController
    from app.controllers.public_apply_controller import PublicApplyController
    from app.controllers.esign_templates_controller import EsignTemplatesController
    from app.controllers.esign_stage_rules_controller import EsignStageRulesController
    from app.controllers.esign_requests_controller import EsignRequestsController
    from app.controllers.account_esign_settings_controller import AccountEsignSettingsController
    from app.controllers.account_organization_settings_controller import AccountOrganizationSettingsController
    from app.controllers.account_appearance_settings_controller import AccountAppearanceSettingsController
    from app.controllers.custom_attribute_definitions_controller import CustomAttributeDefinitionsController
    from app.controllers.public_esign_controller import PublicEsignController
    from app.controllers.esign_webhooks_controller import EsignWebhooksController

    router = APIRouter(prefix="/api/v1")

    # Auth (public)
    router.add_api_route("/auth/login", _wrap(AuthController, "login", lambda c: c.login()), methods=["POST"])
    router.add_api_route("/auth/refresh", _wrap(AuthController, "refresh", lambda c: c.refresh()), methods=["POST"])

    # Public job application (no auth; token is capability URL)
    router.add_api_route(
        "/public/apply/{token}",
        _wrap(PublicApplyController, "show", lambda c: c.show(), run_before=False),
        methods=["GET"],
    )
    router.add_api_route(
        "/public/apply/{token}",
        _wrap(PublicApplyController, "create", lambda c: c.create(), run_before=False),
        methods=["POST"],
    )

    router.add_api_route(
        "/public/esign/sign/{token}",
        _wrap(PublicEsignController, "show_sign", lambda c: c.show_sign(), run_before=False),
        methods=["GET"],
    )
    router.add_api_route(
        "/public/esign/sign/{token}",
        _wrap(PublicEsignController, "submit_sign", lambda c: c.submit_sign(), run_before=False),
        methods=["POST"],
    )
    router.add_api_route(
        "/public/esign/sign/{token}/download",
        _wrap(PublicEsignController, "download_signed", lambda c: c.download_signed(), run_before=False),
        methods=["GET"],
    )

    router.add_api_route(
        "/webhooks/esign",
        _wrap(EsignWebhooksController, "receive", lambda c: c.receive(), run_before=False),
        methods=["POST"],
    )

    # Profile (protected)
    router.add_api_route(
        "/profile",
        _wrap(ProfileController, "show", lambda c: c.show()),
        methods=["GET"],
    )

    router.add_api_route(
        "/account/members",
        _wrap(AccountMembersController, "index", lambda c: c.index()),
        methods=["GET"],
    )

    router.add_api_route(
        "/account/esign_settings",
        _wrap(AccountEsignSettingsController, "show", lambda c: c.show()),
        methods=["GET"],
    )
    router.add_api_route(
        "/account/esign_settings",
        _wrap(AccountEsignSettingsController, "update", lambda c: c.update()),
        methods=["PATCH"],
    )

    router.add_api_route(
        "/account/organization_settings",
        _wrap(AccountOrganizationSettingsController, "show", lambda c: c.show()),
        methods=["GET"],
    )
    router.add_api_route(
        "/account/organization_settings",
        _wrap(AccountOrganizationSettingsController, "update", lambda c: c.update()),
        methods=["PATCH"],
    )

    router.add_api_route(
        "/account/appearance_settings",
        _wrap(AccountAppearanceSettingsController, "show", lambda c: c.show()),
        methods=["GET"],
    )
    router.add_api_route(
        "/account/appearance_settings",
        _wrap(AccountAppearanceSettingsController, "update", lambda c: c.update()),
        methods=["PATCH"],
    )

    router.add_api_route(
        "/custom_attribute_definitions",
        _wrap(CustomAttributeDefinitionsController, "index", lambda c: c.index()),
        methods=["GET"],
    )
    router.add_api_route(
        "/custom_attribute_definitions",
        _wrap(CustomAttributeDefinitionsController, "create", lambda c: c.create()),
        methods=["POST"],
    )
    router.add_api_route(
        "/custom_attribute_definitions/{id:int}",
        _wrap(CustomAttributeDefinitionsController, "update", lambda c: c.update()),
        methods=["PATCH"],
    )
    router.add_api_route(
        "/custom_attribute_definitions/{id:int}",
        _wrap(CustomAttributeDefinitionsController, "destroy", lambda c: c.destroy()),
        methods=["DELETE"],
    )

    resources(router, "/esign_templates", EsignTemplatesController)
    resources(router, "/esign_stage_rules", EsignStageRulesController)

    # Jobs CRUD
    resources(router, "/jobs", JobsController)

    router.add_api_route(
        "/jobs/{job_id:int}/analytics",
        _wrap(JobsController, "analytics", lambda c: c.analytics()),
        methods=["GET"],
    )
    router.add_api_route(
        "/jobs/{job_id:int}/attachments",
        _wrap(JobsController, "list_attachments", lambda c: c.list_attachments()),
        methods=["GET"],
    )
    router.add_api_route(
        "/jobs/{job_id:int}/attachments",
        _wrap(JobsController, "create_attachment", lambda c: c.create_attachment()),
        methods=["POST"],
    )
    router.add_api_route(
        "/jobs/{job_id:int}/attachments/{attachment_id:int}",
        _wrap(JobsController, "destroy_attachment", lambda c: c.destroy_attachment()),
        methods=["DELETE"],
    )

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
    router.add_api_route(
        "/jobs/{job_id:int}/versions/{version_id:int}",
        _wrap(JobsController, "update_version", lambda c: c.update_version()),
        methods=["PUT"],
    )

    router.add_api_route(
        "/jobs/{job_id:int}/hiring_plan",
        _wrap(HiringPlansController, "show_for_job", lambda c: c.show_for_job()),
        methods=["GET"],
    )

    router.add_api_route(
        "/jobs/{job_id:int}/pipeline_stages/reorder",
        _wrap(PipelineStagesController, "reorder_by_job", lambda c: c.reorder_by_job()),
        methods=["PATCH"],
    )
    router.add_api_route(
        "/jobs/{job_id:int}/pipeline_stages",
        _wrap(PipelineStagesController, "index_by_job", lambda c: c.index_by_job()),
        methods=["GET"],
    )
    router.add_api_route(
        "/jobs/{job_id:int}/pipeline_stages",
        _wrap(PipelineStagesController, "create_by_job", lambda c: c.create_by_job()),
        methods=["POST"],
    )

    router.add_api_route(
        "/jobs/{job_id:int}/interview_plans/{plan_id:int}/kit",
        _wrap(InterviewPlansController, "get_kit_for_job", lambda c: c.get_kit_for_job()),
        methods=["GET"],
    )
    router.add_api_route(
        "/jobs/{job_id:int}/interview_plans/{plan_id:int}/kit",
        _wrap(InterviewPlansController, "upsert_kit_for_job", lambda c: c.upsert_kit_for_job()),
        methods=["PUT"],
    )
    router.add_api_route(
        "/jobs/{job_id:int}/interview_plans/{plan_id:int}",
        _wrap(InterviewPlansController, "show_for_job", lambda c: c.show_for_job()),
        methods=["GET"],
    )
    router.add_api_route(
        "/jobs/{job_id:int}/interview_plans/{plan_id:int}",
        _wrap(InterviewPlansController, "update_for_job", lambda c: c.update_for_job()),
        methods=["PUT"],
    )
    router.add_api_route(
        "/jobs/{job_id:int}/interview_plans/{plan_id:int}",
        _wrap(InterviewPlansController, "destroy_for_job", lambda c: c.destroy_for_job()),
        methods=["DELETE"],
    )
    router.add_api_route(
        "/jobs/{job_id:int}/interview_plans",
        _wrap(InterviewPlansController, "index_by_job", lambda c: c.index_by_job()),
        methods=["GET"],
    )
    router.add_api_route(
        "/jobs/{job_id:int}/interview_plans",
        _wrap(InterviewPlansController, "create_by_job", lambda c: c.create_by_job()),
        methods=["POST"],
    )

    router.add_api_route(
        "/interviews/my_assignments",
        _wrap(InterviewsController, "my_assignments", lambda c: c.my_assignments()),
        methods=["GET"],
    )
    router.add_api_route(
        "/interviews/{assignment_id:int}/kit",
        _wrap(InterviewsController, "kit", lambda c: c.kit()),
        methods=["GET"],
    )
    router.add_api_route(
        "/interviews/{assignment_id:int}/scorecard",
        _wrap(InterviewsController, "submit_scorecard", lambda c: c.submit_scorecard()),
        methods=["POST"],
    )
    router.add_api_route(
        "/interviews/{assignment_id:int}",
        _wrap(InterviewsController, "update_assignment", lambda c: c.update_assignment()),
        methods=["PATCH"],
    )

    router.add_api_route(
        "/applications/{application_id:int}/scorecards",
        _wrap(ScorecardsController, "by_application", lambda c: c.by_application()),
        methods=["GET"],
    )
    router.add_api_route(
        "/jobs/{job_id:int}/scorecards/debrief",
        _wrap(ScorecardsController, "debrief_for_job", lambda c: c.debrief_for_job()),
        methods=["GET"],
    )

    # Job boards CRUD
    resources(router, "/job-boards", JobBoardsController)

    # Job postings CRUD
    resources(router, "/postings", JobPostingsController)

    resources(router, "/hiring_plans", HiringPlansController)

    resources(router, "/pipeline_stages", PipelineStagesController, only=["show", "update", "destroy"])

    # Applications CRUD
    resources(router, "/applications", ApplicationsController, only=["index", "show", "create", "destroy"])
    router.add_api_route(
        "/applications/{id:int}",
        _wrap(ApplicationsController, "update", lambda c: c.update()),
        methods=["PATCH"],
    )

    # Application stage update
    router.add_api_route(
        "/applications/{id:int}/stage",
        _wrap(ApplicationsController, "update_stage", lambda c: c.update_stage()),
        methods=["PATCH"],
    )

    router.add_api_route(
        "/esign_requests",
        _wrap(EsignRequestsController, "index", lambda c: c.index()),
        methods=["GET"],
    )

    router.add_api_route(
        "/applications/{application_id:int}/esign_requests",
        _wrap(EsignRequestsController, "index_for_application", lambda c: c.index_for_application()),
        methods=["GET"],
    )

    router.add_api_route(
        "/applications/{application_id:int}/esign_requests/generate",
        _wrap(EsignRequestsController, "generate_for_application", lambda c: c.generate_for_application()),
        methods=["POST"],
    )

    app.include_router(router)

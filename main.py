"""
FastAPI application entry point.
Rails equivalent: config/application.rb + config.ru

Creates the FastAPI app, registers middleware, draws routes,
and defines startup/shutdown events. Includes health check endpoint.
"""

from config.logging_setup import configure_logging

configure_logging(process_name="web")

from contextlib import asynccontextmanager
import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from config.settings import get_settings
from config.database import engine
from config.routes import draw_routes
from app.middleware.auth_middleware import AuthMiddleware
from app.middleware.audit_log_middleware import AuditLogMiddleware
from app.middleware.logging_middleware import LoggingMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events. Rails equivalent: config/application.rb initializers."""
    settings = get_settings()
    yield
    engine.dispose()


def create_app() -> FastAPI:
    """Factory to create and configure the FastAPI application."""
    settings = get_settings()
    app = FastAPI(
        title=settings.APP_NAME,
        description="Rails-style FastAPI boilerplate",
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"] if settings.DEBUG else [],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Custom middleware (order: last added = first to run on request)
    app.add_middleware(LoggingMiddleware)
    app.add_middleware(AuthMiddleware)
    app.add_middleware(AuditLogMiddleware)

    # Health check - no auth required
    @app.get("/health", tags=["Health"])
    async def health_check() -> dict[str, Any]:
        """Health check endpoint for load balancers and monitoring."""
        return {"status": "ok", "app": settings.APP_NAME}

    # Register all routes (like Rails routes.rb)
    draw_routes(app)

    @app.exception_handler(SQLAlchemyError)
    async def sqlalchemy_exception_handler(_request: Request, exc: SQLAlchemyError) -> JSONResponse:
        """Return JSON (not HTML/plain) so API clients don't break on res.json()."""
        logging.getLogger("app.database").exception("Database error: %s", exc)
        hint = (
            "Database error. If you just pulled new code, run: python manage.py db migrate"
        )
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": hint, "code": 500},
        )

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

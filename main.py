"""
FastAPI application entry point.
Rails equivalent: config/application.rb + config.ru

Creates the FastAPI app, registers middleware, draws routes,
and defines startup/shutdown events. Includes health check endpoint.
"""

from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config.settings import get_settings
from config.database import engine
from config.routes import draw_routes
from app.middleware.auth_middleware import AuthMiddleware
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

    # Health check - no auth required
    @app.get("/health", tags=["Health"])
    async def health_check() -> dict[str, Any]:
        """Health check endpoint for load balancers and monitoring."""
        return {"status": "ok", "app": settings.APP_NAME}

    # Register all routes (like Rails routes.rb)
    draw_routes(app)

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

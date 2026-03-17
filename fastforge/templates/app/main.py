"""
FastAPI application entry point.
Rails equivalent: config/application.rb + config.ru

Uses auto-load routes: all modules under app.routes are discovered and included.
Add new route files in app/routes/ (e.g. users_routes.py) — no central config needed.
"""

from contextlib import asynccontextmanager
import pkgutil
import importlib
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config.settings import get_settings
from config.database import engine
from app.middleware.auth_middleware import AuthMiddleware
from app.middleware.logging_middleware import LoggingMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    settings = get_settings()
    yield
    engine.dispose()


def create_app() -> FastAPI:
    """Factory to create and configure the FastAPI application."""
    settings = get_settings()
    app = FastAPI(
        title=settings.APP_NAME,
        description="FastForge — FastAPI + Rails-style conventions",
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"] if settings.DEBUG else [],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(LoggingMiddleware)
    app.add_middleware(AuthMiddleware)

    @app.get("/health", tags=["Health"])
    async def health_check() -> dict[str, Any]:
        return {"status": "ok", "app": settings.APP_NAME}

    # Auto-load routes from app.routes (Rails-like: just add a file)
    import app.routes as routes_pkg
    for loader, name, is_pkg in pkgutil.walk_packages(routes_pkg.__path__, prefix=f"{routes_pkg.__name__}."):
        if name == "app.routes.__init__":
            continue
        try:
            module = importlib.import_module(name)
            if hasattr(module, "router"):
                app.include_router(module.router)
        except Exception as e:
            import warnings
            warnings.warn(f"Could not load route module {name}: {e}")

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

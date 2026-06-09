import tomllib
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.analyze import router as analyze_router
from app.api.routes.downloads import router as downloads_router
from app.api.routes.history import router as history_router
from app.api.routes.health import router as health_router
from app.api.routes.playlists import router as playlists_router
from app.api.routes.settings import router as settings_router
from app.core.config import get_settings
from app.core.errors import register_error_handlers
from app.db.database import init_db


def get_api_version() -> str:
    pyproject_path = Path(__file__).resolve().parents[1] / "pyproject.toml"
    pyproject = tomllib.loads(pyproject_path.read_text(encoding="utf-8"))
    return str(pyproject["project"]["version"])


def create_app() -> FastAPI:
    settings = get_settings()
    init_db()
    app = FastAPI(title="Nextract API", version=get_api_version())

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router, prefix="/api")
    app.include_router(analyze_router, prefix="/api")
    app.include_router(downloads_router, prefix="/api")
    app.include_router(playlists_router, prefix="/api")
    app.include_router(history_router, prefix="/api")
    app.include_router(settings_router, prefix="/api")
    register_error_handlers(app)

    return app


app = create_app()

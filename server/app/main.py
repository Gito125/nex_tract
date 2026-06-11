import tomllib
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.analyze import router as analyze_router
from app.api.routes.downloads import router as downloads_router
from app.api.routes.history import router as history_router
from app.api.routes.health import router as health_router
from app.api.routes.playlists import router as playlists_router
from app.api.routes.proxy import router as proxy_router
from app.api.routes.settings import router as settings_router
from app.core.config import CORS_ORIGINS, IS_PACKAGED
from app.core.errors import register_error_handlers
from app.db.database import init_db
from app.workers.queue import shutdown_queue


def get_api_version() -> str:
    try:
        if IS_PACKAGED:
            return "0.1.0"
        pyproject_path = Path(__file__).resolve().parents[1] / "pyproject.toml"
        pyproject = tomllib.loads(pyproject_path.read_text(encoding="utf-8"))
        return str(pyproject["project"]["version"])
    except Exception:
        return "0.1.0"

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await shutdown_queue()


def create_app() -> FastAPI:
    init_db()
    app = FastAPI(title="Nextract API", version=get_api_version(), lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=CORS_ORIGINS,
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
    app.include_router(proxy_router, prefix="/api")
    register_error_handlers(app)

    return app


app = create_app()

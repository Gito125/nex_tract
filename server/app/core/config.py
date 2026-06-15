import os
from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict, NoDecode
from typing import Annotated

NEXTRACT_ENV = os.environ.get("NEXTRACT_ENV", "development")
IS_PACKAGED = NEXTRACT_ENV == "packaged"

PORT = int(os.environ.get("NEXTRACT_PORT", "57000" if IS_PACKAGED else "8000"))

if IS_PACKAGED:
    DATA_DIR = Path(os.environ["NEXTRACT_DATA_DIR"])
else:
    DATA_DIR = Path(__file__).resolve().parents[3] / "data"

DATA_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = Path(os.environ.get("NEXTRACT_DB_PATH", str(DATA_DIR / "nextract.db")))

if IS_PACKAGED:
    DOWNLOADS_DIR = Path(os.environ["NEXTRACT_DOWNLOADS_DIR"])
else:
    DOWNLOADS_DIR = Path(__file__).resolve().parents[3] / "downloads" / "Nextract"

DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)

if IS_PACKAGED:
    FFMPEG_PATH = os.environ.get("FFMPEG_PATH", "ffmpeg")
else:
    FFMPEG_PATH = "ffmpeg"

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=None if IS_PACKAGED else Path(__file__).resolve().parents[3] / ".env",
        env_prefix="NEXTRACT_",
        extra="ignore",
    )

    env: str = NEXTRACT_ENV
    database_url: str = f"sqlite:///{DB_PATH}"
    download_root: Path = DOWNLOADS_DIR
    ffmpeg_path: str = FFMPEG_PATH
    port: int = PORT
    cors_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: [
            "tauri://localhost",
            "https://tauri.localhost",
            "http://tauri.localhost",
            "http://localhost",
            "http://127.0.0.1",
        ] if IS_PACKAGED else [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3004",
            "http://127.0.0.1:3004",
        ]
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_cors_origins(cls, value: object) -> object:
        if isinstance(value, str):
            origins = [origin.strip() for origin in value.split(",") if origin.strip()]
            # Ensure both trailing-slash and non-trailing-slash versions are supported
            clean_origins = []
            for origin in origins:
                clean_origins.append(origin)
                if origin.endswith("/"):
                    clean_origins.append(origin[:-1])
                else:
                    clean_origins.append(origin + "/")
            return list(set(clean_origins))
        return value

@lru_cache
def get_settings() -> Settings:
    return Settings()

CORS_ORIGINS = get_settings().cors_origins

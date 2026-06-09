from collections.abc import Generator
from pathlib import Path

from sqlalchemy import inspect, text
from sqlmodel import Session, SQLModel, create_engine

from app.core.config import get_settings

settings = get_settings()
connect_args = (
    {"check_same_thread": False}
    if settings.database_url.startswith("sqlite")
    else {}
)
engine = create_engine(settings.database_url, connect_args=connect_args)


def init_db() -> None:
    if settings.database_url.startswith("sqlite"):
        sqlite_path = settings.database_url.removeprefix("sqlite:///")
        Path(sqlite_path).parent.mkdir(parents=True, exist_ok=True)
    SQLModel.metadata.create_all(engine)
    _ensure_download_progress_columns()


def get_session() -> Generator[Session]:
    with Session(engine) as session:
        yield session


def _ensure_download_progress_columns() -> None:
    if not settings.database_url.startswith("sqlite"):
        return

    inspector = inspect(engine)
    if "downloads" not in inspector.get_table_names():
        return

    existing_columns = {
        column["name"] for column in inspector.get_columns("downloads")
    }
    column_definitions = {
        "speed": "TEXT",
        "eta": "TEXT",
        "progress_status": "TEXT NOT NULL DEFAULT 'queued'",
    }

    with engine.begin() as connection:
        for name, definition in column_definitions.items():
            if name not in existing_columns:
                connection.execute(
                    text(f"ALTER TABLE downloads ADD COLUMN {name} {definition}")
                )

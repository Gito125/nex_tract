from datetime import UTC, datetime
from enum import StrEnum
from uuid import uuid4

from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(UTC)


class DownloadStatus(StrEnum):
    PENDING = "pending"
    DOWNLOADING = "downloading"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class DownloadJob(SQLModel, table=True):
    __tablename__ = "downloads"

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    url: str
    platform: str = Field(default="youtube", index=True)
    media_type: str = Field(default="video", index=True)
    title: str
    thumbnail: str | None = None
    duration: int | None = None
    selected_quality: str
    audio_format: str | None = None
    status: str = Field(default=DownloadStatus.PENDING.value, index=True)
    progress: int = 0
    output_path: str | None = None
    file_size: int | None = None
    error_message: str | None = None
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
    completed_at: datetime | None = None

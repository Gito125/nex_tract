from datetime import UTC, datetime
from enum import StrEnum
from typing import ClassVar
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


class PlaylistStatus(StrEnum):
    PENDING = "pending"
    DOWNLOADING = "downloading"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class PlaylistItemStatus(StrEnum):
    QUEUED = "queued"
    DOWNLOADING = "downloading"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"
    CANCELLED = "cancelled"


class DownloadJob(SQLModel, table=True):
    __tablename__: ClassVar[str] = "downloads"

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
    speed: str | None = None
    eta: str | None = None
    progress_status: str = Field(default="queued")
    output_path: str | None = None
    file_size: int | None = None
    error_message: str | None = None
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
    completed_at: datetime | None = None


class Playlist(SQLModel, table=True):
    __tablename__: ClassVar[str] = "playlists"

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    url: str
    platform: str = Field(default="youtube", index=True)
    title: str
    thumbnail: str | None = None
    total_items: int = 0
    completed_items: int = 0
    failed_items: int = 0
    skipped_items: int = 0
    cancelled_items: int = 0
    selected_quality: str
    audio_format: str | None = None
    skip_existing: bool = False
    status: str = Field(default=PlaylistStatus.PENDING.value, index=True)
    progress: int = 0
    current_item_index: int | None = None
    current_item_title: str | None = None
    current_item_progress: int | None = None
    speed: str | None = None
    eta: str | None = None
    output_path: str | None = None
    error_message: str | None = None
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
    completed_at: datetime | None = None


class PlaylistItem(SQLModel, table=True):
    __tablename__: ClassVar[str] = "playlist_items"

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    playlist_id: str = Field(index=True)
    url: str
    title: str
    thumbnail: str | None = None
    duration: int | None = None
    item_index: int = Field(index=True)
    status: str = Field(default=PlaylistItemStatus.QUEUED.value, index=True)
    progress: int = 0
    speed: str | None = None
    eta: str | None = None
    progress_status: str = Field(default="queued")
    output_path: str | None = None
    file_size: int | None = None
    error_message: str | None = None
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
    completed_at: datetime | None = None


class DownloadHistoryItem(SQLModel, table=True):
    __tablename__: ClassVar[str] = "download_history"

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    job_id: str = Field(index=True)
    url: str = Field(index=True)
    platform: str = Field(default="youtube", index=True)
    media_type: str = Field(default="video", index=True)
    title: str
    thumbnail: str | None = None
    duration: int | None = None
    selected_quality: str
    audio_format: str | None = None
    status: str = Field(index=True)
    output_path: str | None = None
    download_folder: str | None = None
    file_size: int | None = None
    error_message: str | None = None
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
    completed_at: datetime = Field(default_factory=utc_now, index=True)


class AppSettings(SQLModel, table=True):
    __tablename__: ClassVar[str] = "settings"

    id: int = Field(default=1, primary_key=True)
    download_folder: str
    default_quality: str = Field(default="best")
    default_audio_format: str = Field(default="m4a")
    theme: str = Field(default="system")
    filename_template: str = Field(default="{title}-{id}-{quality}")
    skip_existing: bool = Field(default=False)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.platforms.base import PlatformValue
from app.schemas.download import AudioFormat, DownloadType, QualityValue

PlaylistStatusValue = Literal[
    "pending",
    "downloading",
    "completed",
    "failed",
    "cancelled",
]
PlaylistItemStatusValue = Literal[
    "queued",
    "downloading",
    "completed",
    "failed",
    "skipped",
    "cancelled",
]
PlaylistEstimateKind = Literal["exact", "approximate", "unknown"]


class PlaylistCreateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    url: str = Field(min_length=1, max_length=2048)
    quality: QualityValue
    download_type: DownloadType = Field(alias="downloadType")
    audio_format: AudioFormat | None = Field(default=None, alias="audioFormat")
    selected_indexes: list[int] | None = Field(default=None, alias="selectedIndexes")
    range_start: int | None = Field(default=None, alias="rangeStart")
    range_end: int | None = Field(default=None, alias="rangeEnd")
    skip_existing: bool | None = Field(default=None, alias="skipExisting")


class PlaylistSizeEstimateItem(BaseModel):
    index: int
    url: str = Field(min_length=1, max_length=2048)


class PlaylistSizeEstimateRequest(BaseModel):
    items: list[PlaylistSizeEstimateItem] = Field(min_length=1, max_length=20)
    qualities: list[QualityValue] | None = None


class PlaylistQualitySizeEstimate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    quality: QualityValue
    total_bytes: int | None = Field(default=None, alias="totalBytes")
    estimated_items: int = Field(alias="estimatedItems")
    unavailable_items: int = Field(alias="unavailableItems")
    estimate_kind: PlaylistEstimateKind = Field(alias="estimateKind")


class PlaylistSizeEstimateResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    requested_items: int = Field(alias="requestedItems")
    analyzed_items: int = Field(alias="analyzedItems")
    failed_items: int = Field(alias="failedItems")
    estimates: list[PlaylistQualitySizeEstimate]


class PlaylistItemResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    playlist_id: str = Field(alias="playlistId")
    url: str
    title: str
    thumbnail: str | None = None
    duration: int | None = None
    item_index: int = Field(alias="itemIndex")
    status: PlaylistItemStatusValue
    progress: int
    speed: str | None = None
    eta: str | None = None
    progress_status: str = Field(alias="progressStatus")
    output_path: str | None = Field(default=None, alias="outputPath")
    file_size: int | None = Field(default=None, alias="fileSize")
    error_message: str | None = Field(default=None, alias="errorMessage")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")
    completed_at: datetime | None = Field(default=None, alias="completedAt")


class PlaylistResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    url: str
    platform: PlatformValue
    title: str
    thumbnail: str | None = None
    total_items: int = Field(alias="totalItems")
    completed_items: int = Field(alias="completedItems")
    failed_items: int = Field(alias="failedItems")
    skipped_items: int = Field(alias="skippedItems")
    cancelled_items: int = Field(alias="cancelledItems")
    selected_quality: QualityValue = Field(alias="selectedQuality")
    audio_format: AudioFormat | None = Field(default=None, alias="audioFormat")
    skip_existing: bool = Field(alias="skipExisting")
    status: PlaylistStatusValue
    progress: int
    current_item_index: int | None = Field(default=None, alias="currentItemIndex")
    current_item_title: str | None = Field(default=None, alias="currentItemTitle")
    current_item_progress: int | None = Field(default=None, alias="currentItemProgress")
    speed: str | None = None
    eta: str | None = None
    output_path: str | None = Field(default=None, alias="outputPath")
    error_message: str | None = Field(default=None, alias="errorMessage")
    items: list[PlaylistItemResponse]
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")
    completed_at: datetime | None = Field(default=None, alias="completedAt")

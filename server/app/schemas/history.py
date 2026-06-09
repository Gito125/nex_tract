from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.platforms.base import PlatformValue
from app.schemas.download import AudioFormat, QualityValue

HistoryStatusValue = Literal["completed", "failed"]


class HistoryItemResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    job_id: str = Field(alias="jobId")
    url: str
    platform: PlatformValue
    media_type: Literal["video"] = Field(alias="mediaType")
    title: str
    thumbnail: str | None = None
    duration: int | None = None
    selected_quality: QualityValue = Field(alias="selectedQuality")
    audio_format: AudioFormat | None = Field(default=None, alias="audioFormat")
    status: HistoryStatusValue
    output_path: str | None = Field(default=None, alias="outputPath")
    download_folder: str | None = Field(default=None, alias="downloadFolder")
    file_size: int | None = Field(default=None, alias="fileSize")
    error_message: str | None = Field(default=None, alias="errorMessage")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")
    completed_at: datetime = Field(alias="completedAt")


class HistoryListResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    items: list[HistoryItemResponse]
    total: int
    limit: int
    offset: int


class HistoryActionResponse(BaseModel):
    message: str

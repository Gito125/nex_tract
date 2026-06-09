from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

QualityValue = Literal[
    "best",
    "1080p",
    "720p",
    "480p",
    "360p",
    "audio_m4a",
    "audio_mp3",
    "audio_opus",
]
DownloadType = Literal["video", "audio"]
AudioFormat = Literal["m4a", "mp3", "opus"]
DownloadStatusValue = Literal[
    "pending",
    "downloading",
    "completed",
    "failed",
    "cancelled",
]
ProgressStatusValue = Literal[
    "queued",
    "downloading",
    "merging",
    "postprocessing",
    "completed",
    "failed",
    "cancelled",
]


class DownloadCreateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    url: str = Field(min_length=1, max_length=2048)
    quality: QualityValue
    download_type: DownloadType = Field(alias="downloadType")
    audio_format: AudioFormat | None = Field(default=None, alias="audioFormat")


class DownloadJobResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    url: str
    platform: Literal["youtube"]
    media_type: Literal["video"] = Field(alias="mediaType")
    title: str
    thumbnail: str | None = None
    duration: int | None = None
    selected_quality: QualityValue = Field(alias="selectedQuality")
    audio_format: AudioFormat | None = Field(default=None, alias="audioFormat")
    status: DownloadStatusValue
    progress: int
    speed: str | None = None
    eta: str | None = None
    progress_status: ProgressStatusValue = Field(alias="progressStatus")
    output_path: str | None = Field(default=None, alias="outputPath")
    file_size: int | None = Field(default=None, alias="fileSize")
    error_message: str | None = Field(default=None, alias="errorMessage")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")
    completed_at: datetime | None = Field(default=None, alias="completedAt")


class DownloadQueueResponse(BaseModel):
    jobs: list[DownloadJobResponse]

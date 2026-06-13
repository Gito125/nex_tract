from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.platforms.base import MediaType, PlatformValue


class AnalyzeRequest(BaseModel):
    url: str = Field(min_length=1, max_length=2048)


class QualityOption(BaseModel):
    label: str
    value: Literal[
        "best",
        "1080p",
        "720p",
        "480p",
        "360p",
        "audio_m4a",
        "audio_mp3",
        "audio_opus",
        "image_original",
    ]
    available: bool = True
    kind: Literal["video", "audio", "image"]


class RawFormat(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    format_id: str | None = Field(default=None, alias="formatId")
    ext: str | None = None
    height: int | None = None
    width: int | None = None
    fps: float | None = None
    vcodec: str | None = None
    acodec: str | None = None
    filesize: int | None = None
    tbr: float | None = None


class PlaylistAnalyzeItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    index: int
    title: str
    url: str
    thumbnail: str | None = None
    duration: int | None = None
    available: bool = True
    error_message: str | None = Field(default=None, alias="errorMessage")


class PlaylistSummary(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str | None = None
    title: str | None = None
    item_count: int = Field(default=0, alias="itemCount")
    items: list[PlaylistAnalyzeItem] = Field(default_factory=list)


class AnalyzeResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    platform: PlatformValue
    type: MediaType
    title: str
    thumbnail: str | None = None
    duration: int | None = None
    creator: str | None = None
    webpage_url: str = Field(alias="webpageUrl")
    qualities: list[QualityOption]
    raw_formats: list[RawFormat] = Field(default_factory=list, alias="rawFormats")
    playlist: PlaylistSummary | None = None
    notice: str | None = None
    image_count: int | None = Field(default=None, alias="imageCount")
    is_generic: bool | None = Field(default=None, alias="isGeneric")
    extraction_method: Literal["ytdlp_generic", "ytdlp_relaxed", "html_scrape"] | None = Field(default=None, alias="extractionMethod")

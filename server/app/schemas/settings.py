from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

DefaultQualityValue = Literal["best", "1080p", "720p", "480p", "360p", "audio"]
DefaultAudioFormatValue = Literal["m4a", "mp3", "opus"]
ThemeValue = Literal["system", "light", "dark"]


class SettingsResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    download_folder: str = Field(alias="downloadFolder")
    default_quality: DefaultQualityValue = Field(alias="defaultQuality")
    default_audio_format: DefaultAudioFormatValue = Field(alias="defaultAudioFormat")
    theme: ThemeValue
    filename_template: str = Field(alias="filenameTemplate")
    skip_existing: bool = Field(alias="skipExisting")
    generic_fallback_enabled: bool = Field(alias="genericFallbackEnabled")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class SettingsUpdateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    download_folder: str | None = Field(default=None, alias="downloadFolder")
    default_quality: DefaultQualityValue | None = Field(
        default=None, alias="defaultQuality"
    )
    default_audio_format: DefaultAudioFormatValue | None = Field(
        default=None, alias="defaultAudioFormat"
    )
    theme: ThemeValue | None = None
    filename_template: str | None = Field(default=None, alias="filenameTemplate")
    skip_existing: bool | None = Field(default=None, alias="skipExisting")
    generic_fallback_enabled: bool | None = Field(default=None, alias="genericFallbackEnabled")

from datetime import UTC, datetime
from pathlib import Path
from typing import cast

from sqlmodel import Session

from app.core.config import get_settings as get_runtime_settings
from app.db.models import AppSettings
from app.schemas.settings import (
    DefaultAudioFormatValue,
    DefaultQualityValue,
    SettingsResponse,
    SettingsUpdateRequest,
    ThemeValue,
)
from app.services.exceptions import SettingsError

SETTINGS_ID = 1
DEFAULT_FILENAME_TEMPLATE = "{title}-{id}-{quality}"
ALLOWED_TEMPLATE_FIELDS = {"title", "id", "quality", "platform"}


def get_app_settings(session: Session) -> AppSettings:
    settings = session.get(AppSettings, SETTINGS_ID)
    if settings:
        return settings

    settings = AppSettings(download_folder=str(default_download_folder()))
    session.add(settings)
    session.commit()
    session.refresh(settings)
    return settings


def get_settings_response(session: Session) -> SettingsResponse:
    return settings_to_response(get_app_settings(session))


def update_app_settings(
    request: SettingsUpdateRequest,
    session: Session,
) -> SettingsResponse:
    settings = get_app_settings(session)

    if request.download_folder is not None:
        settings.download_folder = str(_validate_download_folder(request.download_folder))
    if request.default_quality is not None:
        settings.default_quality = request.default_quality
    if request.default_audio_format is not None:
        settings.default_audio_format = request.default_audio_format
    if request.theme is not None:
        settings.theme = request.theme
    if request.filename_template is not None:
        settings.filename_template = _validate_filename_template(
            request.filename_template
        )
    if request.skip_existing is not None:
        settings.skip_existing = request.skip_existing

    settings.updated_at = _utc_now()
    session.add(settings)
    session.commit()
    session.refresh(settings)
    return settings_to_response(settings)


def settings_to_response(settings: AppSettings) -> SettingsResponse:
    return SettingsResponse(
        downloadFolder=settings.download_folder,
        defaultQuality=cast(DefaultQualityValue, settings.default_quality),
        defaultAudioFormat=cast(
            DefaultAudioFormatValue, settings.default_audio_format
        ),
        theme=cast(ThemeValue, settings.theme),
        filenameTemplate=settings.filename_template,
        skipExisting=settings.skip_existing,
        createdAt=settings.created_at,
        updatedAt=settings.updated_at,
    )


def default_download_folder() -> Path:
    return get_runtime_settings().download_root.resolve()


def _validate_download_folder(value: str) -> Path:
    raw_value = value.strip()
    if not raw_value:
        raise SettingsError("Download folder cannot be empty.")

    try:
        path = Path(raw_value).expanduser().resolve()
        path.mkdir(parents=True, exist_ok=True)
    except OSError as exc:
        raise SettingsError("Could not create or access that download folder.") from exc

    if not path.is_dir():
        raise SettingsError("Download folder must be a folder.")

    probe = path / ".nextract-write-test"
    try:
        probe.write_text("", encoding="utf-8")
        probe.unlink(missing_ok=True)
    except OSError as exc:
        raise SettingsError("Nextract cannot write to that download folder.") from exc

    return path


def _validate_filename_template(value: str) -> str:
    template = value.strip()
    if not template:
        raise SettingsError("Filename template cannot be empty.")
    if len(template) > 160:
        raise SettingsError("Filename template must be 160 characters or fewer.")

    fields = _template_fields(template)
    unknown_fields = sorted(fields - ALLOWED_TEMPLATE_FIELDS)
    if unknown_fields:
        names = ", ".join(f"{{{field}}}" for field in unknown_fields)
        raise SettingsError(f"Unsupported filename template field: {names}.")

    if "{title}" not in template:
        raise SettingsError("Filename template must include {title}.")

    return template


def _template_fields(template: str) -> set[str]:
    fields: set[str] = set()
    start = 0
    while True:
        open_index = template.find("{", start)
        if open_index == -1:
            return fields
        close_index = template.find("}", open_index + 1)
        if close_index == -1:
            raise SettingsError("Filename template has an unclosed placeholder.")
        fields.add(template[open_index + 1 : close_index])
        start = close_index + 1


def _utc_now() -> datetime:
    return datetime.now(UTC)

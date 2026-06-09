from typing import Any

from app.platforms.youtube import extract_youtube_metadata
from app.schemas.analyze import AnalyzeResponse, PlaylistAnalyzeItem, PlaylistSummary
from app.services.exceptions import AnalyzeError
from app.services.format_service import (
    normalize_quality_options,
    sanitize_raw_formats,
    standard_playlist_quality_options,
)
from app.utils.platform_detector import PlatformInfo, PlatformValidationError, detect_platform


def analyze_url(url: str) -> AnalyzeResponse:
    try:
        platform = detect_platform(url)
    except PlatformValidationError as exc:
        raise AnalyzeError(exc.message, status_code=400) from exc

    if platform.platform != "youtube":
        raise AnalyzeError("Only YouTube links are supported in this version.")

    metadata = extract_youtube_metadata(platform.url, platform.media_type)

    if platform.media_type == "playlist":
        return _playlist_response(platform, metadata)

    return _video_response(platform, metadata)


def _video_response(platform: PlatformInfo, metadata: dict[str, Any]) -> AnalyzeResponse:
    formats = _list_value(metadata.get("formats"))

    return AnalyzeResponse(
        platform="youtube",
        type="video",
        title=_string_value(metadata.get("title"), "Untitled YouTube video"),
        thumbnail=_thumbnail(metadata),
        duration=_int_or_none(metadata.get("duration")),
        creator=_creator(metadata),
        webpageUrl=_string_value(metadata.get("webpage_url"), platform.url),
        qualities=normalize_quality_options(formats),
        rawFormats=sanitize_raw_formats(formats),
    )


def _playlist_response(
    platform: PlatformInfo, metadata: dict[str, Any]
) -> AnalyzeResponse:
    entries = _list_value(metadata.get("entries"))
    title = _string_value(metadata.get("title"), "YouTube playlist")
    items = [_playlist_item(entry, index) for index, entry in enumerate(entries, start=1)]

    return AnalyzeResponse(
        platform="youtube",
        type="playlist",
        title=title,
        thumbnail=_thumbnail(metadata),
        duration=None,
        creator=_creator(metadata),
        webpageUrl=_string_value(metadata.get("webpage_url"), platform.url),
        qualities=standard_playlist_quality_options(),
        rawFormats=[],
        playlist=PlaylistSummary(
            id=_string_or_none(metadata.get("id")),
            title=title,
            itemCount=len(items),
            items=items,
        ),
    )


def _playlist_item(entry: dict[str, Any], index: int) -> PlaylistAnalyzeItem:
    title = _string_value(entry.get("title"), f"Playlist item {index}")
    url = _entry_url(entry)
    error_message = _playlist_item_error(entry, title)

    return PlaylistAnalyzeItem(
        index=index,
        title=title,
        url=url,
        thumbnail=_thumbnail(entry),
        duration=_int_or_none(entry.get("duration")),
        available=error_message is None and bool(url),
        errorMessage=error_message,
    )


def _entry_url(entry: dict[str, Any]) -> str:
    for key in ("webpage_url", "url"):
        value = _string_or_none(entry.get(key))
        if not value:
            continue
        if value.startswith(("http://", "https://")):
            return value

    video_id = _string_or_none(entry.get("id")) or _string_or_none(entry.get("url"))
    if video_id:
        return f"https://www.youtube.com/watch?v={video_id}"

    return ""


def _playlist_item_error(entry: dict[str, Any], title: str) -> str | None:
    lower_title = title.lower()
    if "deleted video" in lower_title:
        return "This playlist item appears to be deleted."
    if "private video" in lower_title:
        return "This playlist item appears to be private."

    availability = _string_or_none(entry.get("availability"))
    if availability and availability not in {"public", "unlisted"}:
        return "This playlist item may be restricted."

    return None


def _creator(metadata: dict[str, Any]) -> str | None:
    for key in ("uploader", "channel", "creator"):
        value = _string_or_none(metadata.get(key))
        if value:
            return value
    return None


def _thumbnail(metadata: dict[str, Any]) -> str | None:
    thumbnail = _string_or_none(metadata.get("thumbnail"))
    if thumbnail:
        return thumbnail

    thumbnails = metadata.get("thumbnails")
    if isinstance(thumbnails, list):
        for item in reversed(thumbnails):
            if isinstance(item, dict):
                url = _string_or_none(item.get("url"))
                if url:
                    return url

    return None


def _list_value(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []
    return [item for item in value if isinstance(item, dict)]


def _string_value(value: Any, fallback: str) -> str:
    if isinstance(value, str) and value.strip():
        return value
    return fallback


def _string_or_none(value: Any) -> str | None:
    if isinstance(value, str) and value.strip():
        return value
    return None


def _int_or_none(value: Any) -> int | None:
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    return None

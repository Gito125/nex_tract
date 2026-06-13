from typing import Any
from urllib.parse import urlparse

from app.platforms.registry import get_adapter
from app.schemas.analyze import AnalyzeResponse, PlaylistAnalyzeItem, PlaylistSummary
from app.services.exceptions import AnalyzeError, UnsupportedPlatformError
from app.services.generic_service import run_generic_pipeline
from app.db.database import engine
from sqlmodel import Session
from app.services.settings_service import get_app_settings
from app.services.format_service import (
    image_quality_options,
    normalize_quality_options,
    sanitize_raw_formats,
    standard_playlist_quality_options,
)
from app.services.thumbnail_proxy_service import proxied_thumbnail_url
from app.utils.platform_detector import (
    PlatformInfo,
    PlatformValidationError,
    detect_platform,
)


def analyze_url(url: str) -> AnalyzeResponse:
    try:
        platform = detect_platform(url)
    except PlatformValidationError as exc:
        with Session(engine) as session:
            app_settings = get_app_settings(session)
            if app_settings.generic_fallback_enabled:
                return run_generic_pipeline(url)
            else:
                raise UnsupportedPlatformError(exc.message, status_code=400) from exc

    adapter = get_adapter(platform.platform)
    metadata = adapter.extract_metadata(platform.url, platform.media_type)

    if platform.media_type == "playlist":
        if platform.platform != "youtube":
            raise AnalyzeError(
                "Playlist downloads are currently only available for YouTube."
            )
        return _playlist_response(platform, metadata)

    return _video_response(
        platform, metadata, fallback_title=f"Untitled {adapter.display_name} video"
    )


PLAYLIST_FALLBACK_NOTICE = "This list is not available as a public playlist, so Nextract loaded the current video instead."


def _video_response(
    platform: PlatformInfo,
    metadata: dict[str, Any],
    notice: str | None = None,
    fallback_title: str | None = None,
) -> AnalyzeResponse:
    formats = _list_value(metadata.get("formats"))
    adapter = get_adapter(platform.platform)
    response_type = _media_type_from_metadata(metadata, formats)
    if platform.platform == "x" and response_type == "video" and not formats:
        raise AnalyzeError(
            "This X post does not contain downloadable video or image media."
        )

    return AnalyzeResponse(
        platform=platform.platform,
        type=response_type,
        title=_string_value(
            metadata.get("title"),
            fallback_title or f"Untitled {adapter.display_name} video",
        ),
        thumbnail=_response_thumbnail(platform, metadata),
        duration=_int_or_none(metadata.get("duration")),
        creator=_creator(metadata),
        webpageUrl=_webpage_url(platform, metadata),
        qualities=(
            image_quality_options()
            if response_type in {"image", "gallery"}
            else normalize_quality_options(formats)
        ),
        rawFormats=sanitize_raw_formats(formats, metadata),
        notice=notice,
        imageCount=_image_count(metadata) if response_type == "gallery" else None,
    )


def _playlist_response(
    platform: PlatformInfo, metadata: dict[str, Any]
) -> AnalyzeResponse:
    entries = _list_value(metadata.get("entries"))
    if not entries:
        if _is_watch_url(platform.url) and _looks_like_video_metadata(metadata):
            return _video_response(
                platform,
                metadata,
                notice=PLAYLIST_FALLBACK_NOTICE,
            )
        raise AnalyzeError("This playlist is unavailable or has no public videos.")

    title = _string_value(metadata.get("title"), "YouTube playlist")
    items = [
        _playlist_item(entry, index) for index, entry in enumerate(entries, start=1)
    ]

    return AnalyzeResponse(
        platform=platform.platform,
        type="playlist",
        title=title,
        thumbnail=_response_thumbnail(platform, metadata),
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


def _is_watch_url(url: str) -> bool:
    return urlparse(url).path == "/watch"


def _looks_like_video_metadata(metadata: dict[str, Any]) -> bool:
    return (
        bool(_list_value(metadata.get("formats")))
        or _string_or_none(metadata.get("id")) is not None
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


def _media_type_from_metadata(
    metadata: dict[str, Any],
    formats: list[dict[str, Any]],
) -> str:
    # If the adapter explicitly injected a media type hint, use it
    if "_nextract_media_type" in metadata:
        return metadata["_nextract_media_type"]

    if any(_has_video(item) for item in formats):
        return "video"

    image_count = _image_count(metadata)
    if image_count > 1:
        return "gallery"
    if image_count == 1 or _looks_like_image_metadata(metadata, formats):
        return "image"

    return "video"


def _image_count(metadata: dict[str, Any]) -> int:
    entries = _list_value(metadata.get("entries"))
    if entries:
        return len(entries)

    images = metadata.get("images")
    if isinstance(images, list):
        return len([item for item in images if isinstance(item, dict | str)])

    if _looks_like_image_metadata(metadata, _list_value(metadata.get("formats"))):
        return 1

    return 0


def _looks_like_image_metadata(
    metadata: dict[str, Any],
    formats: list[dict[str, Any]],
) -> bool:
    if formats:
        return any(_is_image_format(item) for item in formats) and not any(
            _has_video(item) or _has_audio(item) for item in formats
        )

    ext = _string_or_none(metadata.get("ext"))
    if ext and ext.lower() in {"jpg", "jpeg", "png", "webp", "avif"}:
        return True

    return (
        _thumbnail(metadata) is not None
        and _int_or_none(metadata.get("duration")) is None
    )


def _is_image_format(item: dict[str, Any]) -> bool:
    ext = _string_or_none(item.get("ext"))
    if ext and ext.lower() in {"jpg", "jpeg", "png", "webp", "avif"}:
        return True

    url = _string_or_none(item.get("url"))
    return bool(
        url
        and url.lower()
        .split("?")[0]
        .endswith((".jpg", ".jpeg", ".png", ".webp", ".avif"))
    )


def _webpage_url(platform: PlatformInfo, metadata: dict[str, Any]) -> str:
    if platform.platform != "youtube":
        return platform.url
    return _string_value(metadata.get("webpage_url"), platform.url)


def _thumbnail(metadata: dict[str, Any]) -> str | None:
    thumbnails = metadata.get("thumbnails")
    if isinstance(thumbnails, list):
        for item in reversed(thumbnails):
            if isinstance(item, dict):
                url = _string_or_none(item.get("url"))
                if _is_usable_image_url(url):
                    return url

    thumbnail = _string_or_none(metadata.get("thumbnail"))
    if _is_usable_image_url(thumbnail):
        return thumbnail

    return None


def _response_thumbnail(platform: PlatformInfo, metadata: dict[str, Any]) -> str | None:
    thumbnail = _thumbnail(metadata)
    if platform.platform in {"instagram", "facebook"}:
        return proxied_thumbnail_url(thumbnail)
    return thumbnail


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


def _has_video(item: dict[str, Any]) -> bool:
    vcodec = item.get("vcodec")
    return isinstance(vcodec, str) and vcodec != "none"


def _has_audio(item: dict[str, Any]) -> bool:
    acodec = item.get("acodec")
    return isinstance(acodec, str) and acodec != "none"


def _is_usable_image_url(value: str | None) -> bool:
    return bool(value and value.startswith("https://"))


def _int_or_none(value: Any) -> int | None:
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    return None

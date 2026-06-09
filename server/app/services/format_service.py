from typing import Any, Literal

from app.schemas.analyze import QualityOption, RawFormat

VideoQualityValue = Literal["1080p", "720p", "480p", "360p"]

VIDEO_QUALITIES: tuple[tuple[VideoQualityValue, int], ...] = (
    ("1080p", 1080),
    ("720p", 720),
    ("480p", 480),
    ("360p", 360),
)


def normalize_quality_options(formats: list[dict[str, Any]]) -> list[QualityOption]:
    heights = {
        value
        for value in (_int_or_none(item.get("height")) for item in formats)
        if value is not None and _has_video(item=_format_by_height(formats, value))
    }
    has_video = any(_has_video(item) for item in formats)
    has_audio = any(_has_audio(item) for item in formats)
    has_m4a = any(_has_audio(item) and item.get("ext") == "m4a" for item in formats)
    has_opus = any(
        _has_audio(item)
        and (item.get("ext") == "opus" or _codec_contains(item.get("acodec"), "opus"))
        for item in formats
    )

    options: list[QualityOption] = []

    if has_video:
        options.append(
            QualityOption(label="Best quality", value="best", kind="video")
        )

    for label, height in VIDEO_QUALITIES:
        if height in heights:
            options.append(QualityOption(label=label, value=label, kind="video"))

    if has_audio and has_m4a:
        options.append(
            QualityOption(label="Audio only (M4A)", value="audio_m4a", kind="audio")
        )
    if has_audio:
        options.append(
            QualityOption(label="Audio only (MP3)", value="audio_mp3", kind="audio")
        )
    if has_audio and has_opus:
        options.append(
            QualityOption(label="Audio only (OPUS)", value="audio_opus", kind="audio")
        )

    return options


def sanitize_raw_formats(formats: list[dict[str, Any]]) -> list[RawFormat]:
    return [
        RawFormat(
            formatId=_string_or_none(item.get("format_id")),
            ext=_string_or_none(item.get("ext")),
            height=_int_or_none(item.get("height")),
            width=_int_or_none(item.get("width")),
            fps=_float_or_none(item.get("fps")),
            vcodec=_string_or_none(item.get("vcodec")),
            acodec=_string_or_none(item.get("acodec")),
            filesize=_int_or_none(item.get("filesize") or item.get("filesize_approx")),
            tbr=_float_or_none(item.get("tbr")),
        )
        for item in formats
    ]


def _has_video(item: dict[str, Any]) -> bool:
    vcodec = item.get("vcodec")
    return isinstance(vcodec, str) and vcodec != "none"


def _has_audio(item: dict[str, Any]) -> bool:
    acodec = item.get("acodec")
    return isinstance(acodec, str) and acodec != "none"


def _format_by_height(
    formats: list[dict[str, Any]], height: int
) -> dict[str, Any]:
    for item in formats:
        if _int_or_none(item.get("height")) == height and _has_video(item):
            return item
    return {}


def _codec_contains(value: Any, expected: str) -> bool:
    return isinstance(value, str) and expected in value.lower()


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


def _float_or_none(value: Any) -> float | None:
    if isinstance(value, int | float):
        return float(value)
    return None

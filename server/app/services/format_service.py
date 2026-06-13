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
    """
    Build quality options from a yt-dlp formats list.

    Handles three common format shapes returned by yt-dlp:
    - Separate video-only + audio-only streams (YouTube, Vimeo)
    - Merged audio+video streams (Facebook, Reddit, TikTok, most generic sites)
    - Audio-only streams (SoundCloud, podcasts, Bandcamp)

    The ``vcodec`` / ``acodec`` fields are treated as absent (not "none")
    when they are None or missing — this is common for merged streams where
    the extractor doesn't explicitly annotate codec fields.
    """

    # --- capability detection ---
    has_video = any(_fmt_has_video(f) for f in formats)
    # A format carries audio if it has an explicit audio codec OR if it is a
    # merged stream that has no explicit vcodec=none marker but still has a url
    # (i.e. it is a real playable file, not a video-only shard).
    has_audio = any(_fmt_has_audio(f) for f in formats) or any(
        _fmt_is_merged(f) for f in formats
    )

    # Detect which concrete video heights are offered.
    heights: set[int] = set()
    for fmt in formats:
        h = _int_or_none(fmt.get("height"))
        if h is None:
            continue
        # Accept the height if the format carries video (strict) OR if it is a
        # merged / ambiguous stream (no explicit vcodec=none).
        if _fmt_has_video(fmt) or _fmt_is_merged(fmt):
            heights.add(h)

    # Detect audio container types for richer audio options.
    has_m4a = any(
        _fmt_has_audio(f) and f.get("ext") == "m4a" for f in formats
    ) or any(
        _fmt_is_merged(f) and f.get("ext") in {"m4a", "mp4"} for f in formats
    )
    has_opus = any(
        (_fmt_has_audio(f) or _fmt_is_merged(f))
        and (f.get("ext") == "opus" or _codec_contains(f.get("acodec"), "opus"))
        for f in formats
    )

    options: list[QualityOption] = []

    # ── Video options ────────────────────────────────────────────────────────
    if has_video or any(_fmt_is_merged(f) for f in formats):
        options.append(QualityOption(label="Best quality", value="best", kind="video"))

    for label, height in VIDEO_QUALITIES:
        if height in heights:
            options.append(QualityOption(label=label, value=label, kind="video"))

    # ── Audio options ────────────────────────────────────────────────────────
    # Always offer audio extraction when the media has any audio track.
    if has_audio:
        if has_m4a:
            options.append(
                QualityOption(label="Audio only (M4A)", value="audio_m4a", kind="audio")
            )
        options.append(
            QualityOption(label="Audio only (MP3)", value="audio_mp3", kind="audio")
        )
        if has_opus:
            options.append(
                QualityOption(label="Audio only (OPUS)", value="audio_opus", kind="audio")
            )

    return options


def standard_playlist_quality_options() -> list[QualityOption]:
    return [
        QualityOption(label="Best quality", value="best", kind="video"),
        QualityOption(label="1080p", value="1080p", kind="video"),
        QualityOption(label="720p", value="720p", kind="video"),
        QualityOption(label="480p", value="480p", kind="video"),
        QualityOption(label="360p", value="360p", kind="video"),
        QualityOption(label="Audio only (M4A)", value="audio_m4a", kind="audio"),
        QualityOption(label="Audio only (MP3)", value="audio_mp3", kind="audio"),
        QualityOption(label="Audio only (OPUS)", value="audio_opus", kind="audio"),
    ]


def image_quality_options() -> list[QualityOption]:
    return [
        QualityOption(label="Original image", value="image_original", kind="image")
    ]


def sanitize_raw_formats(
    formats: list[dict[str, Any]],
    metadata: dict[str, Any] | None = None,
) -> list[RawFormat]:
    return [
        RawFormat(
            formatId=_string_or_none(item.get("format_id")),
            ext=_string_or_none(item.get("ext")),
            height=_int_or_none(item.get("height")),
            width=_int_or_none(item.get("width")),
            fps=_float_or_none(item.get("fps")),
            vcodec=_string_or_none(item.get("vcodec")),
            acodec=_string_or_none(item.get("acodec")),
            filesize=_format_size(item, metadata or {}),
            tbr=_float_or_none(item.get("tbr")),
        )
        for item in formats
    ]


# ---------------------------------------------------------------------------
# Internal format-shape helpers
# ---------------------------------------------------------------------------

def _fmt_has_video(item: dict[str, Any]) -> bool:
    """Format explicitly carries video (vcodec is set and is not 'none')."""
    vcodec = item.get("vcodec")
    return isinstance(vcodec, str) and vcodec.lower() != "none"


def _fmt_has_audio(item: dict[str, Any]) -> bool:
    """Format explicitly carries audio (acodec is set and is not 'none')."""
    acodec = item.get("acodec")
    return isinstance(acodec, str) and acodec.lower() != "none"


def _fmt_is_merged(item: dict[str, Any]) -> bool:
    """
    Format is a merged/muxed stream where codec fields are absent (None) rather
    than explicitly 'none'. Common on Facebook, Reddit, TikTok, generic sites.
    A format with a url but no explicit vcodec/acodec is treated as merged.
    """
    vcodec = item.get("vcodec")
    acodec = item.get("acodec")
    has_url = bool(item.get("url") or item.get("manifest_url") or item.get("fragment_base_url"))
    # Explicitly video-only or audio-only streams have one codec set to "none"
    vcodec_none = isinstance(vcodec, str) and vcodec.lower() == "none"
    acodec_none = isinstance(acodec, str) and acodec.lower() == "none"
    is_split_stream = vcodec_none or acodec_none
    return has_url and not is_split_stream and not _fmt_has_video(item) and not _fmt_has_audio(item)


# Keep old names as aliases so existing callers in analyze_service.py don't break.
_has_video = _fmt_has_video
_has_audio = _fmt_has_audio


def _format_by_height(
    formats: list[dict[str, Any]], height: int
) -> dict[str, Any]:
    for item in formats:
        if _int_or_none(item.get("height")) == height and (
            _fmt_has_video(item) or _fmt_is_merged(item)
        ):
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


def _format_size(item: dict[str, Any], metadata: dict[str, Any]) -> int | None:
    filesize = _int_or_none(item.get("filesize"))
    if filesize and filesize > 0:
        return filesize

    approximate_size = _int_or_none(item.get("filesize_approx"))
    if approximate_size and approximate_size > 0:
        return approximate_size

    bitrate = _float_or_none(item.get("tbr"))
    duration = _float_or_none(metadata.get("duration"))
    if bitrate and bitrate > 0 and duration and duration > 0:
        return int((bitrate * 1000 / 8) * duration)

    return None

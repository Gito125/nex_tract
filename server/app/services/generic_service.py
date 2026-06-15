import logging
import yt_dlp
from typing import Any, Literal, cast

import os
import httpx
from bs4 import BeautifulSoup
from fastapi import HTTPException

from app.platforms.base import YTDLP_BROWSER_HEADERS
from app.schemas.analyze import AnalyzeResponse, QualityOption

logger = logging.getLogger(__name__)

ExtractionMethod = Literal["ytdlp_generic", "ytdlp_relaxed", "html_scrape"]

# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def run_generic_pipeline(url: str) -> AnalyzeResponse:
    """
    Multi-stage extraction pipeline for unsupported / generic sites.

    Stages (each silently falls through to the next on failure):
      1. yt-dlp with browser UA  — native extractors (xvideos, pornhub, xhamster …)
      2. yt-dlp with browser UA + generic:impersonate
      3. yt-dlp with browser UA + relaxed TLS
      4. BeautifulSoup HTML scrape — catches plain <video src="…"> embeds
    """
    failure_reasons: list[str] = []
    stderrs: list[str] = []

    # Stage 1 — native extractor + browser UA
    payload1, stderr1 = _run_ytdlp(url, [*YTDLP_BROWSER_HEADERS])
    if payload1 and payload1.get("title"):
        return _build_generic_response(url, payload1, "ytdlp_generic")
    failure_reasons.append("stage1(native+UA): no usable data")
    if stderr1:
        stderrs.append(stderr1)

    # Bail out early if stage 1 shows a network-level block — stages 2-3
    # will get the same DNS error, so skip them and go straight to a clear message.
    if _is_network_blocked(stderr1):
        _raise_network_blocked_error(url, stderr1)

    # Stage 2 — generic:impersonate
    payload2, stderr2 = _run_ytdlp(
        url, [*YTDLP_BROWSER_HEADERS, "--extractor-args", "generic:impersonate"]
    )
    if payload2 and payload2.get("title"):
        return _build_generic_response(url, payload2, "ytdlp_generic")
    failure_reasons.append("stage2(impersonate): no usable data")
    if stderr2:
        stderrs.append(stderr2)

    # Stage 3 — relaxed TLS
    payload3, stderr3 = _run_ytdlp(url, [*YTDLP_BROWSER_HEADERS, "--no-check-certificate"])
    if payload3 and payload3.get("title"):
        return _build_generic_response(url, payload3, "ytdlp_relaxed")
    failure_reasons.append("stage3(relaxed-tls): no usable data")
    if stderr3:
        stderrs.append(stderr3)

    # Stage 4 — HTML scrape
    result4 = _scrape_video_src(url)
    if result4 and result4.get("title"):
        return _build_generic_response(url, result4, "html_scrape")
    failure_reasons.append("stage4(html-scrape): no <video> tags found")

    logger.warning("Generic pipeline exhausted for %s: %s", url, "; ".join(failure_reasons))

    # If every yt-dlp stage failed with a network error, surface that clearly.
    combined_stderr = "\n".join(stderrs)
    if _is_network_blocked(combined_stderr):
        _raise_network_blocked_error(url, combined_stderr)

    raise HTTPException(
        status_code=422,
        detail={
            "error": "extraction_failed",
            "message": (
                "Nextract couldn't extract media from this URL. "
                "The site may not be supported, or the content may be private or restricted."
            ),
            "reasons": failure_reasons,
            "suggestion": (
                "Make sure the URL points directly to a video page. "
                "If it works in a browser, the site may require login or use "
                "DRM-protected streams that yt-dlp cannot access."
            ),
        },
    )


def _is_network_blocked(stderr: str | None) -> bool:
    """Return True when stderr shows the hostname could not be resolved or reached."""
    if not stderr:
        return False
    msg = stderr.lower()
    return any(kw in msg for kw in [
        "[errno -2]",
        "name or service not known",
        "failed to resolve",
        "temporary failure in name resolution",
        "network is unreachable",
        "[errno 101]",
        "[errno 111]",
    ])


def _raise_network_blocked_error(url: str, stderr: str | None) -> None:
    """Raise a clear HTTP 422 when the site is DNS/network-blocked."""
    from urllib.parse import urlparse
    hostname = urlparse(url).hostname or url
    raise HTTPException(
        status_code=422,
        detail={
            "error": "network_blocked",
            "message": (
                f"\u201c{hostname}\u201d could not be reached. "
                "The site may be blocked by your DNS or ISP, or your internet connection "
                "may be down. Try a different network or DNS resolver (e.g. 1.1.1.1)."
            ),
            "suggestion": (
                "If you are in a region where this site is restricted, "
                "a VPN or alternative DNS may allow access."
            ),
        },
    )




# ---------------------------------------------------------------------------
# yt-dlp runner
# ---------------------------------------------------------------------------

def _run_ytdlp(
    url: str, extra_args: list[str], timeout: int = 45
) -> tuple[dict[str, Any] | None, str | None]:
    """
    Run yt-dlp via its Python API and return (payload, error_message).
    payload is None on any failure.
    """
    # Map CLI-style extra_args to ydl_opts where possible,
    # but for simplicity we'll start with standard opts.
    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "extract_flat": True,
        "socket_timeout": timeout,
        "extractor_args": {"youtube": {"player_client": ["android"]}},
        "retries": 1,
    }
    
    proxy = os.environ.get("YOUTUBE_PROXY")
    if proxy:
        ydl_opts["proxy"] = proxy

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            payload = ydl.extract_info(url, download=False)
            return payload, None
    except Exception as e:
        logger.error("yt-dlp error for %s: %s", url, str(e))
        return None, str(e)




# ---------------------------------------------------------------------------
# HTML scrape fallback
# ---------------------------------------------------------------------------

def _scrape_video_src(url: str) -> dict[str, Any] | None:
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }

    with httpx.Client(follow_redirects=True, timeout=15.0) as client:
        try:
            response = client.get(url, headers=headers)
            response.raise_for_status()
        except (httpx.RequestError, httpx.HTTPStatusError):
            return None

    soup = BeautifulSoup(response.text, "html.parser")

    sources: list[str] = []
    for tag in soup.find_all("video"):
        src = tag.get("src")
        if src and isinstance(src, str) and src.startswith("http"):
            sources.append(src)
        for source in tag.find_all("source"):
            src = source.get("src")
            if src and isinstance(src, str) and src.startswith("http"):
                sources.append(src)

    if not sources:
        return None

    title = "Unknown Media"
    og_title = soup.find("meta", property="og:title")
    if og_title and og_title.get("content"):
        title = str(og_title.get("content"))
    else:
        title_tag = soup.find("title")
        if title_tag and title_tag.text:
            title = title_tag.text.strip()

    thumbnail: str | None = None
    og_image = soup.find("meta", property="og:image")
    if og_image and og_image.get("content"):
        thumbnail = str(og_image.get("content"))

    return {"title": title, "thumbnail": thumbnail, "direct_urls": sources}


# ---------------------------------------------------------------------------
# Response builder
# ---------------------------------------------------------------------------

def _build_generic_response(
    url: str,
    payload: dict[str, Any],
    method: ExtractionMethod,
) -> AnalyzeResponse:
    from app.services.format_service import (
        normalize_quality_options,
        sanitize_raw_formats,
        _fmt_has_video,
        _fmt_has_audio,
        _fmt_is_merged,
    )

    raw_formats: list[Any] = []
    qualities: list[QualityOption] = []
    media_type = "video"

    if method == "html_scrape":
        qualities = [
            QualityOption(label="Best quality", value="best", available=True, kind="video"),
            QualityOption(label="Audio only (M4A)", value="audio_m4a", available=True, kind="audio"),
            QualityOption(label="Audio only (MP3)", value="audio_mp3", available=True, kind="audio"),
        ]
    else:
        fmt_list = payload.get("formats", [])
        valid_formats: list[dict[str, Any]] = [
            f for f in (fmt_list if isinstance(fmt_list, list) else [])
            if isinstance(f, dict)
        ]

        if valid_formats:
            qualities = normalize_quality_options(valid_formats)
            raw_formats = sanitize_raw_formats(valid_formats, payload)

            has_video_fmt = any(_fmt_has_video(f) or _fmt_is_merged(f) for f in valid_formats)
            has_audio_fmt = any(_fmt_has_audio(f) or _fmt_is_merged(f) for f in valid_formats)
            hint = payload.get("_nextract_media_type")
            top_ext = str(payload.get("ext", "")).lower()
            audio_exts = {"mp3", "m4a", "aac", "flac", "ogg", "opus", "wav", "wma"}

            if hint == "audio" or (
                not has_video_fmt and (has_audio_fmt or top_ext in audio_exts)
            ):
                media_type = "audio"

        if not qualities:
            qualities = [
                QualityOption(label="Best quality", value="best", available=True, kind="video"),
                QualityOption(label="Audio only (M4A)", value="audio_m4a", available=True, kind="audio"),
                QualityOption(label="Audio only (MP3)", value="audio_mp3", available=True, kind="audio"),
            ]

    return AnalyzeResponse(
        platform="generic",
        type=cast(Any, media_type),
        title=payload.get("title", "Unknown Media") or "Unknown Media",
        thumbnail=payload.get("thumbnail"),
        duration=(
            payload.get("duration")
            if isinstance(payload.get("duration"), (int, float))
            else None
        ),
        creator=(
            payload.get("uploader")
            or payload.get("channel")
            or payload.get("creator")
        ),
        webpageUrl=url,
        qualities=qualities,
        rawFormats=raw_formats,
        isGeneric=True,
        extractionMethod=method,
    )

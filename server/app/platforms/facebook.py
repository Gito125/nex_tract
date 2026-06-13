import yt_dlp
from typing import Any, cast
from urllib.parse import ParseResult

from app.platforms.base import PlatformAdapter, DEFAULT_USER_AGENT, MediaType
from app.services.exceptions import AnalyzeError, MediaUnavailableError

SUPPORTED_FACEBOOK_HOSTS = {"facebook.com", "www.facebook.com", "m.facebook.com", "fb.watch"}


class FacebookAdapter(PlatformAdapter):
    name = "facebook"
    display_name = "Facebook"
    hosts = SUPPORTED_FACEBOOK_HOSTS

    def detect_media_type(self, parsed: ParseResult) -> MediaType:
        return "video"

    def extract_metadata(self, url: str, media_type: MediaType) -> dict[str, Any]:
        return extract_facebook_metadata(url)


def extract_facebook_metadata(
    url: str,
    timeout: int = 45,
) -> dict[str, Any]:
    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "extract_flat": True,
        "socket_timeout": timeout,
        "user_agent": DEFAULT_USER_AGENT,
    }

    try:
        with yt_dlp.YoutubeDL(cast(Any, ydl_opts)) as ydl:
            payload = ydl.extract_info(url, download=False)
            if payload is None:
                _raise_facebook_error("Video is unavailable")
            return cast(dict[str, Any], payload)
    except Exception as e:
        _raise_facebook_error(str(e))
        # _raise_facebook_error always raises, but for type checking:
        return {}


def _raise_facebook_error(output: str) -> None:
    """Analyse yt-dlp output and raise the most specific AnalyzeError subclass."""
    msg = output.lower()

    # --- Login / authentication ---
    if any(kw in msg for kw in [
        "you must log in",
        "login required",
        "not available anonymously",
        "authentication required",
        "cookies required",
        "checkpoint required",
    ]):
        raise MediaUnavailableError(
            "This Facebook video requires a login to view. "
            "Nextract does not currently support authenticated Facebook downloads."
        )

    # --- Private / restricted ---
    if any(kw in msg for kw in [
        "this content isn't available",
        "only visible to",
        "friends only",
        "content not available",
    ]):
        raise MediaUnavailableError(
            "This Facebook video is private or restricted and cannot be downloaded."
        )

    # --- Rate limiting ---
    if "429" in msg or "too many requests" in msg:
        raise AnalyzeError(
            "Facebook is rate-limiting requests. Please wait a moment and try again.",
            status_code=429,
        )

    # --- Genuine network failures (DNS / TCP) — be very specific ---
    if any(kw in msg for kw in [
        "failed to resolve",
        "name or service not known",
        "temporary failure in name resolution",
        "network is unreachable",
        "[errno -2]",
        "[errno 101]",
    ]):
        raise AnalyzeError(
            "Could not reach Facebook. Check your internet connection and try again.",
            status_code=503,
        )

    # --- Removed / unavailable ---
    if any(kw in msg for kw in [
        "video is unavailable",
        "has been removed",
        "does not exist",
        "page not found",
        "no longer available",
    ]):
        raise AnalyzeError(
            "This Facebook video is unavailable or has been removed.",
            status_code=400,
        )

    # --- Wrong URL type ---
    if "unsupported url" in msg or "unable to extract" in msg:
        raise AnalyzeError(
            "This Facebook link doesn't point to a downloadable video. "
            "Make sure it's a direct video, Reel, or Watch link.",
            status_code=400,
        )

    # --- Fallback ---
    raise AnalyzeError(
        "Could not analyze this Facebook link. "
        "The video may be private, region-locked, or require a login.",
        status_code=400,
    )

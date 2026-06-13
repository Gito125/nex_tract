import json
import subprocess
from typing import Any
from urllib.parse import ParseResult

from app.platforms.base import PlatformAdapter, YTDLP_BROWSER_HEADERS, _combined_output
from app.services.exceptions import AnalyzeError, MediaUnavailableError

SUPPORTED_FACEBOOK_HOSTS = {"facebook.com", "www.facebook.com", "m.facebook.com", "fb.watch"}


class FacebookAdapter(PlatformAdapter):
    name = "facebook"
    display_name = "Facebook"
    hosts = SUPPORTED_FACEBOOK_HOSTS

    def detect_media_type(self, parsed: ParseResult) -> str:
        return "video"

    def extract_metadata(self, url: str, media_type: str) -> dict[str, Any]:
        return extract_facebook_metadata(url)


def extract_facebook_metadata(
    url: str,
    timeout: int = 45,
) -> dict[str, Any]:
    args = [
        "yt-dlp",
        "--dump-single-json",
        "--no-warnings",
        "--no-playlist",
        *YTDLP_BROWSER_HEADERS,
        url,
    ]

    try:
        result = subprocess.run(
            args,
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
    except FileNotFoundError as exc:
        raise AnalyzeError(
            "yt-dlp is not installed or is not available to the backend.",
            status_code=500,
        ) from exc
    except subprocess.TimeoutExpired as exc:
        raise AnalyzeError(
            "Analysis timed out. Please try again.",
            status_code=504,
        ) from exc

    output = _combined_output(result)

    # yt-dlp outputs "null" (JSON null) on some failure modes — treat that as a failure.
    stdout_stripped = result.stdout.strip()
    failed = result.returncode != 0 or not stdout_stripped or stdout_stripped == "null"

    if failed:
        _raise_facebook_error(output)

    try:
        payload = json.loads(result.stdout)
    except json.JSONDecodeError as exc:
        raise AnalyzeError(
            "The analyzer returned unreadable metadata. Please try another link.",
            status_code=502,
        ) from exc

    if not isinstance(payload, dict):
        _raise_facebook_error(output)

    return payload


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

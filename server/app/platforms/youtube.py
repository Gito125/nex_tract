import subprocess  # noqa: F401
import yt_dlp
from typing import Any, cast
from urllib.parse import ParseResult, parse_qs

from yt_dlp.networking.impersonate import ImpersonateTarget

from app.platforms.base import PlatformAdapter, MediaType
from app.services.exceptions import AnalyzeError

SUPPORTED_YOUTUBE_HOSTS = {
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "music.youtube.com",
    "youtu.be",
}


class YouTubeAdapter(PlatformAdapter):
    name = "youtube"
    display_name = "YouTube"
    hosts = SUPPORTED_YOUTUBE_HOSTS

    def detect_media_type(self, parsed: ParseResult) -> MediaType:
        query = parse_qs(parsed.query)
        if parsed.path == "/playlist" and query.get("list"):
            return "playlist"
        if query.get("list"):
            return "playlist"
        return "video"

    def extract_metadata(self, url: str, media_type: MediaType) -> dict[str, Any]:
        return extract_youtube_metadata(url, media_type)


def extract_youtube_metadata(
    url: str,
    media_type: MediaType,
    timeout: int = 45,
) -> dict[str, Any]:
    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "extract_flat": True if media_type == "playlist" else False,
        "socket_timeout": timeout,
        "source_address": "0.0.0.0",
        "legacyserverconnect": True,
        "extractor_args": {"youtube": {"player_client": ["android"]}},
        "impersonate": ImpersonateTarget.from_str("chrome-110"),
        "retries": 1,
    }

    try:
        with yt_dlp.YoutubeDL(cast(Any, ydl_opts)) as ydl:
            payload = ydl.extract_info(url, download=False)
            if payload is None:
                if media_type == "playlist":
                    raise AnalyzeError("This playlist is unavailable or no longer exists.", status_code=400)
                raise AnalyzeError("Could not analyze this YouTube link.")
            return cast(dict[str, Any], payload)
    except Exception as e:
        error_msg = str(e)
        friendly_error = _friendly_ytdlp_error(error_msg, media_type)
        raise AnalyzeError(friendly_error, status_code=400) from e


def _friendly_ytdlp_error(output: str, media_type: MediaType) -> str:
    message = output.lower()

    if "429" in message or "too many requests" in message or "rate-limit" in message:
        return "YouTube is rate-limiting requests. Try again later."
    if (
        "failed to resolve" in message
        or "name or service not known" in message
        or "temporary failure in name resolution" in message
        or "network is unreachable" in message
        or "connection timed out" in message
        or "transporterror" in message
        or "connectionerror" in message
        or "unable to download api page" in message
    ):
        return "Could not reach YouTube. Check your internet connection and try again."
    if "private" in message or "sign in" in message:
        return "This media appears to be private or restricted."
    if media_type == "playlist" and (
        "does not exist" in message
        or "not found" in message
        or "unavailable" in message
        or "null" in message
    ):
        return "This playlist is unavailable or no longer exists."
    if "unavailable" in message:
        return "This media is unavailable."
    if "unsupported url" in message:
        return "This YouTube link is not supported."
    if media_type == "playlist":
        return "This playlist could not be loaded from YouTube. Check that the playlist is public and try again."

    return "Could not analyze this YouTube link."

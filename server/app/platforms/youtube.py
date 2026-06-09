import json
import subprocess
from typing import Any, Literal
from urllib.parse import ParseResult, parse_qs

from app.platforms.base import PlatformAdapter
from app.services.exceptions import AnalyzeError

MediaType = Literal["video", "playlist"]

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
    args = ["yt-dlp", "--dump-single-json", "--no-warnings"]

    if media_type == "playlist":
        args.extend(["--flat-playlist", "--yes-playlist", "--ignore-errors"])
    else:
        args.append("--no-playlist")

    args.append(url)

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

    if result.returncode != 0:
        raise AnalyzeError(
            _friendly_ytdlp_error(_combined_output(result), media_type),
            status_code=400,
        )

    try:
        payload = json.loads(result.stdout)
    except json.JSONDecodeError as exc:
        raise AnalyzeError(
            "The analyzer returned unreadable metadata. Please try another link.",
            status_code=502,
        ) from exc

    if not isinstance(payload, dict):
        raise AnalyzeError(
            _friendly_ytdlp_error(_combined_output(result), media_type),
            status_code=400,
        )

    return payload


def _combined_output(result: subprocess.CompletedProcess[str]) -> str:
    return "\n".join(part for part in [result.stderr, result.stdout] if part)


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

import json
import subprocess
from typing import Any, Literal
from urllib.parse import ParseResult

from app.platforms.base import PlatformAdapter, YTDLP_BROWSER_HEADERS, _combined_output
from app.services.exceptions import AnalyzeError, MediaUnavailableError

MediaType = Literal["video", "playlist"]

SUPPORTED_SOUNDCLOUD_HOSTS = {"soundcloud.com", "www.soundcloud.com", "m.soundcloud.com"}


class SoundCloudAdapter(PlatformAdapter):
    name = "soundcloud"
    display_name = "SoundCloud"
    hosts = SUPPORTED_SOUNDCLOUD_HOSTS

    def detect_media_type(self, parsed: ParseResult) -> MediaType:
        path = parsed.path.strip("/")
        parts = path.split("/")
        if len(parts) >= 2 and parts[1] == "sets":
            return "playlist"
        # User profiles might also be treated as playlists. For safety we let yt-dlp determine,
        # but Nextract generally maps sets to playlists.
        if len(parts) == 1 and path != "":
            return "playlist"  # Likely a user profile
        return "video"  # The base adapter signature uses "video" for single items, which will be mapped to audio in our logic.

    def extract_metadata(self, url: str, media_type: MediaType) -> dict[str, Any]:
        return extract_soundcloud_metadata(url, media_type)


def extract_soundcloud_metadata(
    url: str,
    media_type: MediaType,
    timeout: int = 45,
) -> dict[str, Any]:
    args = ["yt-dlp", "--dump-single-json", "--no-warnings", *YTDLP_BROWSER_HEADERS]

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

    output = _combined_output(result)
    lower_output = output.lower()

    if "private" in lower_output or "not available" in lower_output or "could not download webpage" in lower_output:
        raise MediaUnavailableError(
            "This SoundCloud track is private or unavailable in your region."
        )

    if result.returncode != 0:
        raise AnalyzeError(
            _friendly_ytdlp_error(output, media_type),
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
            _friendly_ytdlp_error(output, media_type),
            status_code=400,
        )
        
    # Inject audio-only type into payload so it's handled properly by analyze_service
    # If it's a playlist, leave it as playlist. If it's a single track, set to 'audio'.
    if payload.get("_type") == "playlist":
        payload["_nextract_media_type"] = "playlist"
    else:
        payload["_nextract_media_type"] = "audio"

    return payload


def _friendly_ytdlp_error(output: str, media_type: MediaType) -> str:
    return "Could not analyze this SoundCloud link."

import json
import subprocess
from typing import Any, Literal
from urllib.parse import ParseResult

from app.platforms.base import PlatformAdapter, YTDLP_BROWSER_HEADERS, _combined_output
from app.services.exceptions import AnalyzeError, MediaUnavailableError

MediaType = Literal["video", "playlist"]

SUPPORTED_VIMEO_HOSTS = {"vimeo.com"}


class VimeoAdapter(PlatformAdapter):
    name = "vimeo"
    display_name = "Vimeo"
    hosts = SUPPORTED_VIMEO_HOSTS

    def detect_media_type(self, parsed: ParseResult) -> MediaType:
        path = parsed.path.lower()
        if path.startswith(("/channels/", "/groups/", "/album/", "/showcase/")):
            return "playlist"
        return "video"

    def extract_metadata(self, url: str, media_type: MediaType) -> dict[str, Any]:
        return extract_vimeo_metadata(url, media_type)


def extract_vimeo_metadata(
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

    if "This video is password protected" in output:
        raise MediaUnavailableError(
            "This Vimeo video is password-protected. Nextract cannot download password-protected content."
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

    # Detect playlist type from output
    if payload.get("_type") == "playlist":
        payload["_nextract_media_type"] = "playlist"

    return payload


def _friendly_ytdlp_error(output: str, media_type: MediaType) -> str:
    message = output.lower()
    
    if "private" in message or "not available" in message:
        return "This Vimeo media appears to be private or restricted."

    return "Could not analyze this Vimeo link."

import json
import subprocess
from typing import Any, Literal
from urllib.parse import ParseResult

from app.platforms.base import PlatformAdapter, YTDLP_BROWSER_HEADERS, _combined_output
from app.services.exceptions import AnalyzeError, MediaUnavailableError

MediaType = Literal["video"]

SUPPORTED_REDDIT_HOSTS = {"reddit.com", "www.reddit.com", "old.reddit.com", "redd.it", "v.redd.it"}


class RedditAdapter(PlatformAdapter):
    name = "reddit"
    display_name = "Reddit"
    hosts = SUPPORTED_REDDIT_HOSTS

    def extract_metadata(self, url: str, media_type: str) -> dict[str, Any]:
        return extract_reddit_metadata(url)


def extract_reddit_metadata(
    url: str,
    timeout: int = 45,
) -> dict[str, Any]:
    args = ["yt-dlp", "--dump-single-json", "--no-warnings", "--no-playlist", *YTDLP_BROWSER_HEADERS, url]

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

    if result.returncode != 0:
        message = output.lower()
        if "age restricted" in message or "login" in message or "nsfw" in message or "verification" in message:
            raise MediaUnavailableError(
                "This Reddit post may be restricted. Nextract cannot access age-gated content without authentication."
            )
        raise AnalyzeError(
            _friendly_ytdlp_error(output),
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
            _friendly_ytdlp_error(output),
            status_code=400,
        )

    # Check if there are downloadable video or audio formats
    formats = payload.get("formats", [])
    has_video = any(f.get("vcodec") and f.get("vcodec") != "none" for f in formats if isinstance(f, dict))
    has_audio = any(f.get("acodec") and f.get("acodec") != "none" for f in formats if isinstance(f, dict))
    
    if not formats or (not has_video and not has_audio):
        raise MediaUnavailableError("This Reddit post does not contain downloadable video or audio.")

    return payload


def _friendly_ytdlp_error(output: str) -> str:
    message = output.lower()
    
    if "private" in message or "not available" in message:
        return "This Reddit post appears to be private or restricted."

    return "Could not analyze this Reddit link."

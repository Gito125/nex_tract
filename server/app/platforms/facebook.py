import json
import subprocess
from typing import Any, Literal
from urllib.parse import ParseResult

from app.platforms.base import PlatformAdapter, YTDLP_BROWSER_HEADERS, _combined_output
from app.services.exceptions import AnalyzeError, MediaUnavailableError

MediaType = Literal["video"]

SUPPORTED_FACEBOOK_HOSTS = {"facebook.com", "www.facebook.com", "m.facebook.com", "fb.watch"}


class FacebookAdapter(PlatformAdapter):
    name = "facebook"
    display_name = "Facebook"
    hosts = SUPPORTED_FACEBOOK_HOSTS

    def extract_metadata(self, url: str, media_type: str) -> dict[str, Any]:
        return extract_facebook_metadata(url)


def extract_facebook_metadata(
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
    lower_output = output.lower()

    if any(keyword in lower_output for keyword in ["login", "sign in", "authentication", "private", "not available anonymously", "cookies"]):
        raise MediaUnavailableError(
            "This Facebook video requires a login to access. Nextract does not currently support authenticated Facebook downloads."
        )

    if result.returncode != 0:
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

    return payload


def _friendly_ytdlp_error(output: str) -> str:
    message = output.lower()
    return "Could not analyze this Facebook link."

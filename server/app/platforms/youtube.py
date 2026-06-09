import json
import subprocess
from typing import Any, Literal

from app.services.exceptions import AnalyzeError

MediaType = Literal["video", "playlist"]


def extract_youtube_metadata(url: str, media_type: MediaType) -> dict[str, Any]:
    args = ["yt-dlp", "--dump-single-json", "--no-warnings"]

    if media_type == "playlist":
        args.extend(["--flat-playlist", "--yes-playlist"])
    else:
        args.append("--no-playlist")

    args.append(url)

    try:
        result = subprocess.run(
            args,
            capture_output=True,
            text=True,
            timeout=45,
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
        raise AnalyzeError(_friendly_ytdlp_error(result.stderr), status_code=400)

    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError as exc:
        raise AnalyzeError(
            "The analyzer returned unreadable metadata. Please try another link.",
            status_code=502,
        ) from exc


def _friendly_ytdlp_error(stderr: str) -> str:
    message = stderr.lower()

    if "private" in message or "sign in" in message:
        return "This media appears to be private or restricted."
    if "unavailable" in message:
        return "This media is unavailable."
    if "unsupported url" in message:
        return "This YouTube link is not supported."

    return "Could not analyze this YouTube link."

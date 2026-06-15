import subprocess
import yt_dlp
from dataclasses import dataclass
from typing import Any, Literal, cast
from urllib.parse import ParseResult

from app.services.exceptions import AnalyzeError

PlatformValue = Literal["youtube", "tiktok", "instagram", "x", "vimeo", "reddit", "facebook", "soundcloud", "generic"]
MediaType = Literal["video", "audio", "image", "gallery", "playlist"]
YTDLP_BROWSER_HEADERS = [
    "--add-header",
    "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
    "--add-header",
    "Accept-Language: en-US,en;q=0.9",
]
DEFAULT_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36"


@dataclass(frozen=True)
class PlatformInfo:
    platform: PlatformValue
    media_type: MediaType
    url: str


class PlatformValidationError(Exception):
    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


class PlatformAdapter:
    name: PlatformValue
    display_name: str
    hosts: set[str]

    def can_handle(self, parsed: ParseResult) -> bool:
        return (parsed.hostname or "").lower() in self.hosts

    def detect_media_type(self, parsed: ParseResult) -> MediaType:
        return "video"

    def validate_public_single_link(self, parsed: ParseResult) -> None:
        return

    def canonicalize_url(self, parsed: ParseResult) -> str:
        return parsed.geturl()

    def extract_metadata(self, url: str, media_type: MediaType) -> dict[str, Any]:
        return run_ytdlp_metadata(
            url,
            media_type=media_type,
            display_name=self.display_name,
        )

    def build_download_args(
        self,
        *,
        url: str,
        output_root: str,
        output_template: str,
        quality_format: str | None,
        audio_format: str | None,
        media_type: MediaType = "video",
    ) -> list[str]:
        import sys
        args = [
            sys.executable,
            "-m",
            "yt_dlp",
            "--no-warnings",
            "--no-simulate",
            "--no-overwrites",
            "--progress",
            "--newline",
            *YTDLP_BROWSER_HEADERS,
            "--paths",
            output_root,
            "--output",
            output_template,
            "--print",
            "after_move:filepath",
            "--extractor-args",
            "youtube:player_client=android",
        ]

        if media_type == "gallery":
            args.append("--yes-playlist")
        else:
            args.append("--no-playlist")

        if quality_format is not None:
            args.extend(["--format", quality_format])

        if audio_format:
            args.extend(["--extract-audio", "--audio-format", audio_format])
        elif media_type == "video":
            args.extend(["--merge-output-format", "mp4"])

        args.append(url)
        return args




def run_ytdlp_metadata(
    url: str,
    *,
    media_type: MediaType,
    display_name: str,
    timeout: int = 45,
) -> dict[str, Any]:
    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "extract_flat": True if media_type == "playlist" else False,
        "socket_timeout": timeout,
        "user_agent": DEFAULT_USER_AGENT,
        "extractor_args": {"youtube": {"player_client": ["android"]}},
        "retries": 1,
    }

    try:
        with yt_dlp.YoutubeDL(cast(Any, ydl_opts)) as ydl:
            payload = ydl.extract_info(url, download=False)
            if payload is None:
                raise AnalyzeError(f"Could not analyze this {display_name} link.")
            return cast(dict[str, Any], payload)
    except Exception as e:
        error_msg = str(e)
        friendly_error = friendly_ytdlp_error(error_msg, media_type, display_name)
        raise AnalyzeError(friendly_error, status_code=400) from e


def friendly_ytdlp_error(
    output: str,
    media_type: MediaType,
    display_name: str,
) -> str:
    message = output.lower()

    if "429" in message or "too many requests" in message or "rate-limit" in message:
        return f"{display_name} is rate-limiting requests. Try again later."
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
        return f"Could not reach {display_name}. Check your internet connection and try again."
    if (
        "private" in message
        or "sign in" in message
        or "login" in message
        or "cookies" in message
        or "not available anonymously" in message
        or "restricted" in message
    ):
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
        return f"This {display_name} link is not supported."
    if media_type == "playlist":
        return f"This playlist could not be loaded from {display_name}. Check that the playlist is public and try again."

    return f"Could not analyze this {display_name} link."


def _combined_output(result: subprocess.CompletedProcess[str]) -> str:
    return "\n".join(part for part in [result.stderr, result.stdout] if part)

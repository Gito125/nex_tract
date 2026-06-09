from dataclasses import dataclass
from typing import Literal
from urllib.parse import parse_qs, urlparse

SUPPORTED_YOUTUBE_HOSTS = {
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "music.youtube.com",
    "youtu.be",
}


@dataclass(frozen=True)
class PlatformInfo:
    platform: Literal["youtube"]
    media_type: Literal["video", "playlist"]
    url: str


class PlatformValidationError(Exception):
    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


def detect_platform(url: str) -> PlatformInfo:
    parsed = urlparse(url.strip())

    if parsed.scheme not in {"http", "https"}:
        raise PlatformValidationError("Only http and https links are supported.")

    hostname = (parsed.hostname or "").lower()

    if hostname not in SUPPORTED_YOUTUBE_HOSTS:
        raise PlatformValidationError("Only YouTube links are supported in this version.")

    query = parse_qs(parsed.query)
    media_type: Literal["video", "playlist"] = "video"

    if parsed.path == "/playlist" and query.get("list"):
        media_type = "playlist"
    elif query.get("list"):
        media_type = "playlist"

    return PlatformInfo(platform="youtube", media_type=media_type, url=url.strip())

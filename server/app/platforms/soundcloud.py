import yt_dlp
from typing import Any, Literal
from urllib.parse import ParseResult

from app.platforms.base import PlatformAdapter, YTDLP_BROWSER_HEADERS
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
    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "extract_flat": True if media_type == "playlist" else False,
        "socket_timeout": timeout,
        "user_agent": next((v for k, v in YTDLP_BROWSER_HEADERS if k.lower() == "user-agent"), None),
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            payload = ydl.extract_info(url, download=False)
            if payload is None:
                raise MediaUnavailableError("This SoundCloud track is private or unavailable.")
            
            # Inject audio-only type into payload so it's handled properly by analyze_service
            # If it's a playlist, leave it as playlist. If it's a single track, set to 'audio'.
            if payload.get("_type") == "playlist":
                payload["_nextract_media_type"] = "playlist"
            else:
                payload["_nextract_media_type"] = "audio"
                
            return payload
    except Exception as e:
        error_msg = str(e).lower()
        if "private" in error_msg or "not available" in error_msg:
            raise MediaUnavailableError("This SoundCloud track is private or unavailable.")
        raise AnalyzeError("Could not analyze this SoundCloud link.", status_code=400) from e

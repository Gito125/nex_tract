import json
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import ParseResult, urlencode, urlparse
from urllib.request import Request, urlopen

from app.platforms.base import PlatformAdapter, PlatformValidationError
from app.services.exceptions import AnalyzeError

INSTAGRAM_OEMBED_URL = "https://api.instagram.com/oembed/"

# Full browser UA required for Instagram's servers and CDN.
_BROWSER_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)


class InstagramAdapter(PlatformAdapter):
    name = "instagram"
    display_name = "Instagram"
    hosts = {"instagram.com", "www.instagram.com"}

    def validate_public_single_link(self, parsed: ParseResult) -> None:
        path_parts = [part for part in parsed.path.split("/") if part]
        if len(path_parts) >= 2 and path_parts[0] in {"reel", "p", "tv"}:
            return

        raise PlatformValidationError("Paste a public Instagram reel, post, or video link.")

    def canonicalize_url(self, parsed: ParseResult) -> str:
        return parsed._replace(
            scheme="https",
            netloc="www.instagram.com",
            query="",
            fragment="",
        ).geturl()

    def extract_metadata(self, url: str, media_type: Any) -> dict[str, Any]:
        """Extract metadata via yt-dlp with an oEmbed fallback.

        When yt-dlp is blocked or returns an error (bot detection, login walls
        are common for Instagram), we fall back to Instagram's public oEmbed
        API which requires no authentication and works for all public posts.

        The synthetic metadata returned by the oEmbed path includes a minimal
        'best' quality format so the quality selector renders correctly.
        """
        try:
            return super().extract_metadata(url, media_type)
        except AnalyzeError as primary_exc:
            try:
                return _fetch_oembed_metadata(url)
            except _OEmbedError:
                # Both yt-dlp and oEmbed failed — surface the original error.
                raise primary_exc


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

class _OEmbedError(Exception):
    pass


def _fetch_oembed_metadata(url: str) -> dict[str, Any]:
    """Fetch Instagram's public oEmbed endpoint and return synthetic metadata.

    Raises _OEmbedError on any failure so the caller can fall back gracefully.
    """
    oembed_url = f"{INSTAGRAM_OEMBED_URL}?{urlencode({'url': url, 'format': 'json'})}"
    request = Request(
        oembed_url,
        headers={
            "User-Agent": _BROWSER_UA,
            "Accept": "application/json",
        },
    )

    try:
        with urlopen(request, timeout=15) as response:
            raw = response.read().decode("utf-8")
    except (HTTPError, URLError, OSError) as exc:
        raise _OEmbedError("oEmbed request failed") from exc

    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise _OEmbedError("oEmbed response was not valid JSON") from exc

    if not isinstance(payload, dict):
        raise _OEmbedError("oEmbed response was not a JSON object")

    thumbnail_url = _str_or_none(payload.get("thumbnail_url"))
    author = _str_or_none(payload.get("author_name"))
    title = _str_or_none(payload.get("title")) or _str_or_none(payload.get("author_name")) or "Instagram post"

    # Derive a shortcode from the original URL for an ID field.
    shortcode = _shortcode_from_url(url) or "unknown"

    # Inject a synthetic 'best' quality format so the quality selector works.
    # yt-dlp will be used for the actual download with the 'best' format string.
    synthetic_format = {
        "format_id": "best",
        "ext": "mp4",
        "vcodec": "avc1",
        "acodec": "mp4a",
        "height": None,
        "width": None,
        "filesize": None,
    }

    return {
        "id": shortcode,
        "title": title,
        "uploader": author,
        "webpage_url": url,
        "thumbnail": thumbnail_url,
        "ext": "mp4",
        "formats": [synthetic_format],
        # Signal to callers that this came from the oEmbed fallback.
        "_oembed_fallback": True,
    }


def _shortcode_from_url(url: str) -> str | None:
    """Extract the shortcode segment from an Instagram URL path."""
    path_parts = [p for p in urlparse(url).path.split("/") if p]
    # Path is one of: /reel/<code>/ or /p/<code>/ or /tv/<code>/
    if len(path_parts) >= 2 and path_parts[0] in {"reel", "p", "tv"}:
        return path_parts[1]
    return None


def _str_or_none(value: Any) -> str | None:
    if isinstance(value, str) and value.strip():
        return value
    return None

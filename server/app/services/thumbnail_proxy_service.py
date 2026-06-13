from dataclasses import dataclass
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlparse
from urllib.request import Request, urlopen

from app.services.exceptions import AnalyzeError

MAX_THUMBNAIL_BYTES = 5 * 1024 * 1024
ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/avif",
}

# Instagram's CDN gates requests on recognisable browser User-Agents.
# A bare "Nextract/…" UA results in 403s — use a real Chrome UA instead.
# Facebook's CDN (fbcdn.net) has the same restriction.
_BROWSER_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)

_INSTAGRAM_REFERER = "https://www.instagram.com/"
_FACEBOOK_REFERER = "https://www.facebook.com/"


@dataclass(frozen=True)
class ProxiedThumbnail:
    content: bytes
    content_type: str


class ThumbnailProxyError(Exception):
    def __init__(self, message: str, status_code: int = 400) -> None:
        self.message = message
        self.status_code = status_code
        super().__init__(message)


def proxied_thumbnail_url(url: str | None) -> str | None:
    """Rewrite an Instagram or Facebook CDN URL to our proxy endpoint.

    Any URL that is not from a proxied CDN is returned unchanged.
    """
    if not url:
        return None
    if not (is_instagram_cdn_url(url) or is_facebook_cdn_url(url)):
        return url
    return f"/api/proxy/thumbnail?url={quote(url, safe='')}"


def fetch_proxied_thumbnail(url: str) -> ProxiedThumbnail:
    """Fetch an Instagram or Facebook CDN image server-side and return its bytes.

    Raises ThumbnailProxyError with an appropriate status code on failure.
    Only Instagram and Facebook CDN hostnames are accepted; all others are rejected with 400.
    """
    is_instagram = is_instagram_cdn_url(url)
    is_facebook = is_facebook_cdn_url(url)
    if not (is_instagram or is_facebook):
        raise ThumbnailProxyError(
            "This thumbnail URL cannot be proxied.", status_code=400
        )
    referer = _INSTAGRAM_REFERER if is_instagram else _FACEBOOK_REFERER

    # Send headers that the CDN expects from a real browser.
    request = Request(
        url,
        headers={
            "User-Agent": _BROWSER_UA,
            "Referer": referer,
            "Accept": "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8,*/*;q=0.5",
            "Accept-Language": "en-US,en;q=0.9",
        },
    )

    try:
        with urlopen(request, timeout=15) as response:
            content_type = (
                response.headers.get("content-type", "").split(";")[0].lower()
            )
            if content_type not in ALLOWED_CONTENT_TYPES:
                raise ThumbnailProxyError(
                    "The thumbnail response was not an image.", status_code=502
                )

            content = response.read(MAX_THUMBNAIL_BYTES + 1)
    except ThumbnailProxyError:
        raise
    except HTTPError as exc:
        raise ThumbnailProxyError(
            "Could not load the thumbnail image.",
            status_code=exc.code if 400 <= exc.code < 500 else 502,
        ) from exc
    except (OSError, URLError) as exc:
        raise ThumbnailProxyError(
            "Could not reach Instagram's thumbnail CDN.",
            status_code=502,
        ) from exc

    if len(content) > MAX_THUMBNAIL_BYTES:
        raise ThumbnailProxyError("The thumbnail image is too large.", status_code=413)

    return ProxiedThumbnail(content=content, content_type=content_type)


def is_instagram_cdn_url(url: str) -> bool:
    """Return True for https://scontent-*.cdninstagram.com and cdninstagram.com URLs."""
    parsed = urlparse(url)
    hostname = (parsed.hostname or "").lower()

    return parsed.scheme == "https" and (
        hostname == "cdninstagram.com" or hostname.endswith(".cdninstagram.com")
    )


def is_facebook_cdn_url(url: str) -> bool:
    """Return True for https://*.fbcdn.net thumbnail URLs."""
    parsed = urlparse(url)
    hostname = (parsed.hostname or "").lower()

    return parsed.scheme == "https" and (
        hostname == "fbcdn.net"
        or hostname.endswith(".fbcdn.net")
        or hostname.endswith(".xx.fbcdn.net")
    )


def ensure_proxyable_instagram_thumbnail(url: str | None) -> str | None:
    try:
        return proxied_thumbnail_url(url)
    except ValueError as exc:
        raise AnalyzeError("Could not prepare this Instagram thumbnail.") from exc

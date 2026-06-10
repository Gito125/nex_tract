import logging
from collections.abc import AsyncIterator
from dataclasses import dataclass
from urllib.parse import quote, urljoin, urlparse

import httpx

logger = logging.getLogger(__name__)

BROWSER_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/142.0.0.0 Safari/537.36"
)
INSTAGRAM_REFERER = "https://www.instagram.com/"
MEDIA_ACCEPT_HEADER = (
    "image/avif,image/webp,image/apng,image/svg+xml,image/*,video/*,*/*;q=0.8"
)
MAX_REDIRECTS = 3


@dataclass
class ProxiedInstagramMedia:
    response: httpx.Response
    client: httpx.AsyncClient

    @property
    def content_type(self) -> str:
        return self.response.headers.get("content-type", "application/octet-stream")

    async def iter_bytes(self) -> AsyncIterator[bytes]:
        try:
            async for chunk in self.response.aiter_bytes():
                if chunk:
                    yield chunk
        finally:
            await self.aclose()

    async def aclose(self) -> None:
        await self.response.aclose()
        await self.client.aclose()


class InstagramMediaProxyError(Exception):
    def __init__(self, message: str, status_code: int = 400) -> None:
        self.message = message
        self.status_code = status_code
        super().__init__(message)


def proxied_instagram_media_url(url: str | None, *, download: bool = False) -> str | None:
    if not url:
        return None
    if not is_allowed_instagram_media_url(url):
        return url

    suffix = "&download=1" if download else ""
    return f"/api/proxy/media?url={quote(url, safe='')}{suffix}"


def is_allowed_instagram_media_url(url: str) -> bool:
    parsed = urlparse(url)
    hostname = (parsed.hostname or "").lower()

    return parsed.scheme == "https" and (
        hostname == "cdninstagram.com"
        or hostname.endswith(".cdninstagram.com")
        or hostname in {"instagram.com", "www.instagram.com"}
    )


async def open_proxied_instagram_media(url: str) -> ProxiedInstagramMedia:
    _validate_proxy_url(url)
    client = httpx.AsyncClient(
        timeout=httpx.Timeout(30.0, connect=10.0),
        follow_redirects=False,
    )

    try:
        response = await _send_validated_request(client, url, MAX_REDIRECTS)
    except InstagramMediaProxyError:
        await client.aclose()
        raise
    except httpx.HTTPError as exc:
        await client.aclose()
        raise InstagramMediaProxyError(
            "Could not reach Instagram's media CDN.",
            status_code=502,
        ) from exc

    if response.status_code >= 400:
        await response.aclose()
        await client.aclose()
        raise InstagramMediaProxyError(
            "Could not load this media from Instagram.",
            status_code=502,
        )

    return ProxiedInstagramMedia(response=response, client=client)


async def _send_validated_request(
    client: httpx.AsyncClient,
    url: str,
    redirects_remaining: int,
) -> httpx.Response:
    request = client.build_request("GET", url, headers=_instagram_fetch_headers())
    response = await client.send(request, stream=True)

    if not 300 <= response.status_code < 400:
        return response

    location = response.headers.get("location")
    await response.aclose()
    if not location or redirects_remaining <= 0:
        raise InstagramMediaProxyError(
            "Could not load this media from Instagram.",
            status_code=502,
        )

    redirected_url = urljoin(url, location)
    _validate_proxy_url(redirected_url)
    return await _send_validated_request(
        client,
        redirected_url,
        redirects_remaining - 1,
    )


def _instagram_fetch_headers() -> dict[str, str]:
    return {
        "User-Agent": BROWSER_USER_AGENT,
        "Referer": INSTAGRAM_REFERER,
        "Accept": MEDIA_ACCEPT_HEADER,
    }


def _validate_proxy_url(url: str) -> None:
    if is_allowed_instagram_media_url(url):
        return

    hostname = (urlparse(url).hostname or "").lower()
    logger.warning("Rejected Instagram media proxy URL host: %s", hostname or "<none>")
    raise InstagramMediaProxyError(
        "This media URL cannot be proxied.",
        status_code=400,
    )

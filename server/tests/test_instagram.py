"""Unit tests for Instagram platform integration.

Covers:
- Proxy route: correct Content-Type, streaming, hostname allowlist, 502 on CDN failure
- Analyze response: no raw CDN URL ever returned to frontend
- oEmbed fallback: triggers when yt-dlp fails, extracts thumbnail + author
"""
import json
import subprocess
from urllib.error import URLError
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.thumbnail_proxy_service import is_instagram_cdn_url

client = TestClient(app)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

class _FakeCDNResponse:
    """Fake urllib response for Instagram CDN thumbnail requests."""

    def __init__(self, content: bytes, content_type: str = "image/jpeg") -> None:
        self.content = content
        self.headers = {"content-type": content_type}

    def __enter__(self) -> "_FakeCDNResponse":
        return self

    def __exit__(self, *_: object) -> None:
        pass

    def read(self, _size: int) -> bytes:
        return self.content


class _FakeOEmbedResponse:
    """Fake urllib response for Instagram oEmbed API."""

    def __init__(self, payload: dict) -> None:
        self._payload = payload

    def __enter__(self) -> "_FakeOEmbedResponse":
        return self

    def __exit__(self, *_: object) -> None:
        pass

    def read(self) -> bytes:
        return json.dumps(self._payload).encode("utf-8")


def _ytdlp_failure(error_text: str = "ERROR: [instagram] Login required") -> subprocess.CompletedProcess:
    return subprocess.CompletedProcess(
        args=["yt-dlp"], returncode=1, stdout="", stderr=error_text
    )


def _ytdlp_success(metadata: dict) -> subprocess.CompletedProcess:
    return subprocess.CompletedProcess(
        args=["yt-dlp"], returncode=0, stdout=json.dumps(metadata), stderr=""
    )


def _instagram_reel_metadata(shortcode: str = "ABC123") -> dict:
    return {
        "id": shortcode,
        "title": "Example Reel",
        "uploader": "Instagram Creator",
        "webpage_url": f"https://www.instagram.com/reel/{shortcode}/",
        "thumbnail": f"https://scontent-lax3-1.cdninstagram.com/v/t51/{shortcode}.jpg",
        "duration": 15,
        "formats": [
            {
                "format_id": "0",
                "ext": "mp4",
                "vcodec": "avc1",
                "acodec": "mp4a",
                "height": 1080,
                "filesize": 8_000_000,
                "tbr": 4000,
            }
        ],
    }


# ---------------------------------------------------------------------------
# Proxy route tests
# ---------------------------------------------------------------------------

VALID_CDN_URL = "https://scontent-lax3-1.cdninstagram.com/v/t51/example.jpg"


def test_proxy_thumbnail_returns_correct_content_type_and_bytes() -> None:
    with patch(
        "app.services.thumbnail_proxy_service.urlopen",
        return_value=_FakeCDNResponse(b"fake-image-bytes", "image/jpeg"),
    ):
        response = client.get("/api/proxy/thumbnail", params={"url": VALID_CDN_URL})

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("image/jpeg")
    assert response.content == b"fake-image-bytes"


def test_proxy_thumbnail_sets_cache_control_header() -> None:
    with patch(
        "app.services.thumbnail_proxy_service.urlopen",
        return_value=_FakeCDNResponse(b"x", "image/webp"),
    ):
        response = client.get("/api/proxy/thumbnail", params={"url": VALID_CDN_URL})

    assert response.status_code == 200
    assert "max-age=3600" in response.headers.get("cache-control", "")


def test_proxy_thumbnail_rejects_non_instagram_hostname_with_400() -> None:
    """Hostnames outside cdninstagram.com must be rejected — security allowlist."""
    for bad_url in [
        "https://evil.com/steal.jpg",
        "https://pbs.twimg.com/media/evil.jpg",
        "https://cdn.example.com/image.jpg",
        "https://cdninstagram.com.evil.com/img.jpg",   # subdomain-spoofing attempt
    ]:
        response = client.get("/api/proxy/thumbnail", params={"url": bad_url})
        assert response.status_code == 400, f"Expected 400 for {bad_url}, got {response.status_code}"


def test_proxy_thumbnail_returns_502_not_500_when_cdn_unreachable() -> None:
    """CDN network failures must map to 502, not an unhandled 500."""
    with patch(
        "app.services.thumbnail_proxy_service.urlopen",
        side_effect=URLError("connection refused"),
    ):
        response = client.get("/api/proxy/thumbnail", params={"url": VALID_CDN_URL})

    assert response.status_code == 502


def test_proxy_thumbnail_accepts_cdninstagram_subdomains() -> None:
    for cdn_url in [
        "https://scontent-lax3-1.cdninstagram.com/v/t51/img.jpg",
        "https://scontent.cdninstagram.com/v/t51/img.jpg",
        "https://cdninstagram.com/v/t51/img.jpg",
    ]:
        assert is_instagram_cdn_url(cdn_url), f"Expected CDN URL to be accepted: {cdn_url}"


# ---------------------------------------------------------------------------
# No raw CDN URL in analyze response
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "url",
    [
        "https://www.instagram.com/reel/DW0r9ENE_Mi/",
        "https://www.instagram.com/reel/DWyymafjsI6/",
        "https://www.instagram.com/reel/DW52L0-kh2M/",
    ],
)
def test_analyze_instagram_thumbnail_never_exposes_raw_cdn_url(url: str) -> None:
    """The thumbnail in the analyze response must be a proxy URL, never raw CDN."""
    shortcode = url.rstrip("/").split("/")[-1]
    with patch(
        "app.platforms.base.subprocess.run",
        return_value=_ytdlp_success(_instagram_reel_metadata(shortcode)),
    ):
        response = client.post("/api/analyze", json={"url": url})

    assert response.status_code == 200
    thumbnail = response.json()["thumbnail"]
    assert thumbnail is not None
    # The thumbnail must be routed through our proxy — not a direct CDN URL.
    # The CDN hostname appears URL-encoded inside the proxy URL param, which is correct.
    assert thumbnail.startswith("/api/proxy/thumbnail?url="), (
        f"Thumbnail was not routed through proxy: {thumbnail}"
    )
    # Ensure the raw CDN hostname is not the start of the URL (i.e. not returned directly)
    assert not thumbnail.startswith("https://scontent")
    assert not thumbnail.startswith("https://cdninstagram")


# ---------------------------------------------------------------------------
# oEmbed fallback
# ---------------------------------------------------------------------------

def test_instagram_oembed_fallback_triggers_when_ytdlp_fails() -> None:
    """When yt-dlp fails, oEmbed should be tried and produce a 200 response."""
    with (
        patch(
            "app.platforms.base.subprocess.run",
            return_value=_ytdlp_failure("ERROR: [instagram] 429 Rate limited"),
        ),
        patch(
            "app.platforms.instagram.urlopen",
            return_value=_FakeOEmbedResponse({
                "thumbnail_url": "https://scontent-lax3-1.cdninstagram.com/v/t51/fallback.jpg",
                "author_name": "fallback_creator",
                "title": "Fallback reel title",
            }),
        ),
    ):
        response = client.post(
            "/api/analyze",
            json={"url": "https://www.instagram.com/reel/ABC123/"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["platform"] == "instagram"
    assert body["creator"] == "fallback_creator"
    assert body["title"] == "Fallback reel title"


def test_instagram_oembed_fallback_thumbnail_also_proxied() -> None:
    """oEmbed thumbnail URL (CDN) must also be rewritten through the proxy."""
    with (
        patch(
            "app.platforms.base.subprocess.run",
            return_value=_ytdlp_failure(),
        ),
        patch(
            "app.platforms.instagram.urlopen",
            return_value=_FakeOEmbedResponse({
                "thumbnail_url": "https://scontent-lax3-1.cdninstagram.com/v/t51/oembed.jpg",
                "author_name": "creator",
                "title": "Post",
            }),
        ),
    ):
        response = client.post(
            "/api/analyze",
            json={"url": "https://www.instagram.com/reel/XYZ/"},
        )

    assert response.status_code == 200
    thumbnail = response.json()["thumbnail"]
    assert thumbnail is not None
    # The CDN URL is URL-encoded inside the proxy param — the thumbnail itself
    # must start with /api/proxy/thumbnail, not with the raw CDN hostname.
    assert thumbnail.startswith("/api/proxy/thumbnail?url=")
    assert not thumbnail.startswith("https://scontent")
    assert not thumbnail.startswith("https://cdninstagram")


def test_instagram_both_ytdlp_and_oembed_failure_returns_error() -> None:
    """When both yt-dlp and oEmbed fail, return a clean 400 — not a 500 crash."""
    with (
        patch(
            "app.platforms.base.subprocess.run",
            return_value=_ytdlp_failure("ERROR: [instagram] This post is unavailable"),
        ),
        patch(
            "app.platforms.instagram.urlopen",
            side_effect=URLError("network error"),
        ),
    ):
        response = client.post(
            "/api/analyze",
            json={"url": "https://www.instagram.com/reel/BROKEN/"},
        )

    assert response.status_code == 400
    assert "detail" in response.json()

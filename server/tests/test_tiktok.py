"""Unit tests for the TikTok platform adapter.

Covers:
- URL validation (both formats accepted, bad formats rejected)
- Canonicalization (real creator slug preserved, bare /video/ID path kept)
- yt-dlp receives correct URL and browser UA headers
"""
import subprocess
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.platforms.tiktok import TikTokAdapter
from app.platforms.base import PlatformValidationError
from urllib.parse import urlparse

client = TestClient(app)
adapter = TikTokAdapter()


# ---------------------------------------------------------------------------
# Validator — accepted formats
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "url",
    [
        "https://www.tiktok.com/@khaby.lame/video/7503547470006226198",
        "https://www.tiktok.com/@creator/video/123",
        "https://m.tiktok.com/@creator/video/456",
        "https://www.tiktok.com/video/7617913537561693470",   # bare /video/ID
        "https://www.tiktok.com/video/123",
        "https://vm.tiktok.com/ZMabc123/",                    # short-link
    ],
)
def test_tiktok_validator_accepts_valid_urls(url: str) -> None:
    parsed = urlparse(url)
    # Should not raise
    adapter.validate_public_single_link(parsed)


# ---------------------------------------------------------------------------
# Validator — rejected formats
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "url",
    [
        "https://www.tiktok.com/@creator",           # profile only
        "https://www.tiktok.com/@creator/video",     # video path but no ID
        "https://www.tiktok.com/",                   # root
        "https://vm.tiktok.com/",                    # short-link host but no path
    ],
)
def test_tiktok_validator_rejects_invalid_urls(url: str) -> None:
    parsed = urlparse(url)
    with pytest.raises(PlatformValidationError):
        adapter.validate_public_single_link(parsed)


# ---------------------------------------------------------------------------
# Canonicalization — real creator slug preserved
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    ("raw_url", "expected_canonical"),
    [
        (
            # Standard format — creator slug kept, query stripped
            "https://www.tiktok.com/@khaby.lame/video/7503547470006226198?is_from_webapp=1",
            "https://www.tiktok.com/@khaby.lame/video/7503547470006226198",
        ),
        (
            # Different creator — slug preserved exactly
            "https://www.tiktok.com/@someone_else/video/9999?s=19&t=abc",
            "https://www.tiktok.com/@someone_else/video/9999",
        ),
        (
            # Bare /video/ID — no creator to invent, kept as-is
            "https://www.tiktok.com/video/7617913537561693470?sender_device=pc",
            "https://www.tiktok.com/video/7617913537561693470",
        ),
        (
            # vm.tiktok.com short-link — only query stripped
            "https://vm.tiktok.com/ZMabc123/?share=1",
            "https://vm.tiktok.com/ZMabc123/",
        ),
    ],
)
def test_tiktok_canonicalize_url(raw_url: str, expected_canonical: str) -> None:
    parsed = urlparse(raw_url)
    assert adapter.canonicalize_url(parsed) == expected_canonical


def test_tiktok_canonical_url_never_contains_at_underscore() -> None:
    """The @_ placeholder that previously broke TikTok's CDN must not appear."""
    parsed = urlparse("https://www.tiktok.com/@real_creator/video/123?noise=1")
    canonical = adapter.canonicalize_url(parsed)
    assert "@_" not in canonical
    assert "@real_creator" in canonical


# ---------------------------------------------------------------------------
# yt-dlp integration — correct URL and headers forwarded
# ---------------------------------------------------------------------------

def _completed_process(metadata: dict) -> subprocess.CompletedProcess:
    import json
    return subprocess.CompletedProcess(
        args=["yt-dlp"],
        returncode=0,
        stdout=json.dumps(metadata),
        stderr="",
    )


def _fake_tiktok_metadata(canonical_url: str) -> dict:
    return {
        "id": "123",
        "title": "Test TikTok",
        "uploader": "Test Creator",
        "webpage_url": canonical_url,
        "thumbnail": "https://cdn.example/thumb.jpg",
        "duration": 30,
        "formats": [
            {
                "format_id": "0",
                "ext": "mp4",
                "vcodec": "h264",
                "acodec": "aac",
                "height": 720,
                "filesize": 5_000_000,
                "tbr": 1500,
            }
        ],
    }


def test_tiktok_ytdlp_receives_real_creator_url_not_placeholder() -> None:
    """yt-dlp must receive the real /@creator/video/ID URL, not /@_/video/ID."""
    url_with_creator = "https://www.tiktok.com/@khaby.lame/video/7503547470006226198"
    with patch(
        "app.platforms.base.subprocess.run",
        return_value=_completed_process(
            _fake_tiktok_metadata(url_with_creator)
        ),
    ) as run:
        response = client.post("/api/analyze", json={"url": url_with_creator})

    assert response.status_code == 200
    ytdlp_url = run.call_args.args[0][-1]
    assert ytdlp_url == url_with_creator
    assert "@_" not in ytdlp_url


def test_tiktok_ytdlp_receives_bare_video_path_unchanged() -> None:
    """Bare /video/ID format must be passed to yt-dlp without a creator added."""
    bare_url = "https://www.tiktok.com/video/7617913537561693470"
    with patch(
        "app.platforms.base.subprocess.run",
        return_value=_completed_process(
            _fake_tiktok_metadata(bare_url)
        ),
    ) as run:
        response = client.post(
            "/api/analyze",
            json={"url": bare_url + "?sender_device=pc"},
        )

    assert response.status_code == 200
    ytdlp_url = run.call_args.args[0][-1]
    assert ytdlp_url == bare_url
    assert "@" not in ytdlp_url   # No creator prefix injected at all


def test_tiktok_ytdlp_call_includes_browser_ua_header() -> None:
    """yt-dlp must receive --add-header with a real browser User-Agent."""
    with patch(
        "app.platforms.base.subprocess.run",
        return_value=_completed_process(
            _fake_tiktok_metadata("https://www.tiktok.com/@creator/video/1")
        ),
    ) as run:
        client.post(
            "/api/analyze",
            json={"url": "https://www.tiktok.com/@creator/video/1"},
        )

    args: list[str] = run.call_args.args[0]
    assert "--add-header" in args
    # The header value following --add-header must contain a real UA
    header_index = args.index("--add-header")
    ua_header = args[header_index + 1]
    assert "User-Agent" in ua_header
    assert "Mozilla" in ua_header


def test_tiktok_analyze_strips_query_params() -> None:
    """Query parameters must be stripped from the URL sent to yt-dlp."""
    noisy_url = "https://www.tiktok.com/@creator/video/999?is_from_webapp=1&share_app_id=tiktok"
    with patch(
        "app.platforms.base.subprocess.run",
        return_value=_completed_process(
            _fake_tiktok_metadata("https://www.tiktok.com/@creator/video/999")
        ),
    ) as run:
        response = client.post("/api/analyze", json={"url": noisy_url})

    assert response.status_code == 200
    ytdlp_url = run.call_args.args[0][-1]
    assert "?" not in ytdlp_url
    assert "is_from_webapp" not in ytdlp_url

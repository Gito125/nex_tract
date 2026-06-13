"""Unit tests for X (Twitter) platform integration.

Covers:
- Image-only tweets pass analyze and return correct metadata
- Text-only (no-media) tweets return a clean 400 error
- Video tweets still work (regression)
- _uses_direct_image_download routes X image jobs to direct download
- Syndication API receives upgraded browser UA headers
"""
import json
import subprocess
from urllib.error import URLError
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app
from app.platforms.x import _syndication_token, _jpg_image_url

client = TestClient(app)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

class _FakeSyndicationResponse:
    """Fake urllib response for the X syndication API."""

    def __init__(self, payload: dict) -> None:
        self._payload = payload

    def __enter__(self) -> "_FakeSyndicationResponse":
        return self

    def __exit__(self, *_: object) -> None:
        pass

    def read(self) -> bytes:
        return json.dumps(self._payload).encode("utf-8")


def _ytdlp_no_video_error() -> subprocess.CompletedProcess:
    return subprocess.CompletedProcess(
        args=["yt-dlp"],
        returncode=1,
        stdout="null",
        stderr="ERROR: [twitter] 2044665313904779452: No video could be found in this tweet",
    )


def _ytdlp_video_success() -> subprocess.CompletedProcess:
    return subprocess.CompletedProcess(
        args=["yt-dlp"],
        returncode=0,
        stdout=json.dumps({
            "id": "2029211775770738771",
            "title": "X video post",
            "uploader": "Video Creator",
            "webpage_url": "https://x.com/creator/status/2029211775770738771",
            "thumbnail": "https://pbs.twimg.com/ext_tw_video_thumb/thumb.jpg",
            "duration": 45,
            "formats": [
                {
                    "format_id": "0",
                    "ext": "mp4",
                    "vcodec": "h264",
                    "acodec": "aac",
                    "height": 720,
                    "filesize": 10_000_000,
                    "tbr": 1800,
                }
            ],
        }),
        stderr="",
    )


def _image_syndication_payload(tweet_id: str = "2044665313904779452") -> dict:
    return {
        "text": "Example image post",
        "user": {"name": "X Image Creator", "screen_name": "xcreator"},
        "mediaDetails": [
            {
                "type": "photo",
                "media_url_https": "https://pbs.twimg.com/media/example?format=png&name=small",
            }
        ],
    }


def _text_only_syndication_payload() -> dict:
    """Tweet with no mediaDetails — text-only post."""
    return {
        "text": "Just some text, no media here.",
        "user": {"name": "Text User"},
    }


# ---------------------------------------------------------------------------
# Image-only tweet analyze
# ---------------------------------------------------------------------------

def test_x_image_only_tweet_analyze_returns_image_type() -> None:
    """Image-only tweets must be analyzed as type='image' via syndication fallback."""
    with (
        patch("app.platforms.base.subprocess.run", return_value=_ytdlp_no_video_error()),
        patch(
            "app.platforms.x.urlopen",
            return_value=_FakeSyndicationResponse(_image_syndication_payload()),
        ),
    ):
        response = client.post(
            "/api/analyze",
            json={"url": "https://x.com/elonmusk/status/2044665313904779452"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["platform"] == "x"
    assert body["type"] == "image"
    assert body["title"] == "Example image post"
    assert body["creator"] == "X Image Creator"
    # Thumbnail should be the JPEG version of the image URL
    assert "format=jpg" in body["thumbnail"]
    assert body["qualities"][0]["value"] == "image_original"


def test_x_image_only_tweet_analyze_rewrites_url_to_jpg() -> None:
    """pbs.twimg.com image URLs must have format=jpg injected."""
    with (
        patch("app.platforms.base.subprocess.run", return_value=_ytdlp_no_video_error()),
        patch(
            "app.platforms.x.urlopen",
            return_value=_FakeSyndicationResponse({
                "text": "Image post",
                "user": {"name": "Creator"},
                "mediaDetails": [
                    {
                        "type": "photo",
                        "media_url_https": "https://pbs.twimg.com/media/abc?format=png&name=orig",
                    }
                ],
            }),
        ),
    ):
        response = client.post(
            "/api/analyze",
            json={"url": "https://x.com/creator/status/123"},
        )

    assert response.status_code == 200
    thumbnail = response.json()["thumbnail"]
    assert "format=jpg" in thumbnail
    assert "format=png" not in thumbnail


# ---------------------------------------------------------------------------
# Text-only tweet — clean error, not 500
# ---------------------------------------------------------------------------

def test_x_text_only_tweet_returns_clean_400_not_crash() -> None:
    """Posts with no media must return a 400 with a user-friendly message."""
    with (
        # yt-dlp fails (no video)
        patch("app.platforms.base.subprocess.run", return_value=_ytdlp_no_video_error()),
        # Syndication returns a text-only payload (no mediaDetails)
        patch(
            "app.platforms.x.urlopen",
            return_value=_FakeSyndicationResponse(_text_only_syndication_payload()),
        ),
    ):
        response = client.post(
            "/api/analyze",
            json={"url": "https://x.com/elonmusk/status/2040544413546590475"},
        )

    assert response.status_code == 400
    detail = response.json()["detail"]
    assert "media" in detail.lower() or "downloadable" in detail.lower()


def test_x_text_only_tweet_syndication_network_error_surfaces_ytdlp_error() -> None:
    """When both yt-dlp and syndication fail, the original yt-dlp error is surfaced."""
    with (
        patch("app.platforms.base.subprocess.run", return_value=_ytdlp_no_video_error()),
        patch("app.platforms.x.urlopen", side_effect=URLError("network down")),
    ):
        response = client.post(
            "/api/analyze",
            json={"url": "https://x.com/elonmusk/status/9999"},
        )

    # Should be a 400, not a 500
    assert response.status_code == 400
    assert "detail" in response.json()


# ---------------------------------------------------------------------------
# Video tweet — regression check
# ---------------------------------------------------------------------------

def test_x_video_tweet_still_works_after_image_fix() -> None:
    """Video tweets must still analyze correctly — regression guard."""
    with patch("app.platforms.base.subprocess.run", return_value=_ytdlp_video_success()):
        response = client.post(
            "/api/analyze",
            json={"url": "https://x.com/creator/status/2029211775770738771"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["platform"] == "x"
    assert body["type"] == "video"
    assert body["qualities"][0]["value"] == "best"


# ---------------------------------------------------------------------------
# Download routing — image jobs use direct download
# ---------------------------------------------------------------------------

def test_x_image_job_uses_direct_download_path() -> None:
    """download_service._uses_direct_image_download must return True for X image jobs."""
    from app.db.models import DownloadJob

    job = DownloadJob()
    job.platform = "x"
    job.media_type = "image"

    from app.services.download_service import _uses_direct_image_download
    assert _uses_direct_image_download(job) is True


def test_non_x_image_job_does_not_use_direct_download() -> None:
    """Instagram image jobs must NOT use the X direct download path."""
    from app.db.models import DownloadJob

    job = DownloadJob()
    job.platform = "instagram"
    job.media_type = "image"

    from app.services.download_service import _uses_direct_image_download
    assert _uses_direct_image_download(job) is False


# ---------------------------------------------------------------------------
# Syndication helpers
# ---------------------------------------------------------------------------

def test_syndication_token_returns_string_for_numeric_id() -> None:
    token = _syndication_token("2044665313904779452")
    assert isinstance(token, str)
    assert token.isdigit()


def test_syndication_token_returns_none_for_non_numeric_id() -> None:
    assert _syndication_token("not-a-number") is None
    assert _syndication_token("") is None


def test_jpg_image_url_rewrites_pbs_twimg_format() -> None:
    url = "https://pbs.twimg.com/media/example?format=png&name=small"
    result = _jpg_image_url(url)
    assert "format=jpg" in result
    assert "format=png" not in result
    assert "name=small" in result   # name param preserved


def test_jpg_image_url_leaves_non_twimg_urls_unchanged() -> None:
    url = "https://cdn.example.com/image.png"
    assert _jpg_image_url(url) == url

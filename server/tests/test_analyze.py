import json
import subprocess
from urllib.error import URLError
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_analyze_youtube_video_returns_normalized_metadata() -> None:
    with patch(
        "app.platforms.youtube.subprocess.run",
        return_value=_completed_process(_video_metadata()),
    ) as run:
        response = client.post(
            "/api/analyze",
            json={"url": "https://www.youtube.com/watch?v=abc123"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["platform"] == "youtube"
    assert body["type"] == "video"
    assert body["title"] == "Example Video"
    assert body["thumbnail"] == "https://img.youtube.com/example.jpg"
    assert body["duration"] == 615
    assert body["creator"] == "Example Channel"
    assert body["webpageUrl"] == "https://www.youtube.com/watch?v=abc123"
    assert [item["value"] for item in body["qualities"]] == [
        "best",
        "1080p",
        "720p",
        "audio_m4a",
        "audio_mp3",
        "audio_opus",
    ]
    assert body["rawFormats"][0] == {
        "formatId": "137",
        "ext": "mp4",
        "height": 1080,
        "width": 1920,
        "fps": 30.0,
        "vcodec": "avc1",
        "acodec": "none",
        "filesize": 1234,
        "tbr": 2500.0,
    }
    assert "url" not in body["rawFormats"][0]
    assert "--no-playlist" in run.call_args.args[0]
    assert run.call_args.kwargs["timeout"] == 45


def test_analyze_rejects_invalid_url() -> None:
    response = client.post("/api/analyze", json={"url": "not a url"})

    assert response.status_code == 400
    assert response.json() == {"detail": "Only http and https links are supported."}


def test_analyze_rejects_unsupported_platform() -> None:
    response = client.post("/api/analyze", json={"url": "https://vimeo.com/123"})

    assert response.status_code == 400
    assert response.json() == {
        "detail": "This platform is not supported yet. Try YouTube, TikTok, Instagram, or X."
    }


def test_analyze_tiktok_video_returns_normalized_metadata() -> None:
    noisy_url = (
        "https://www.tiktok.com/@creator/video/123?is_from_webapp=1&sender_device=pc"
    )
    with patch(
        "app.platforms.base.subprocess.run",
        return_value=_completed_process(
            _social_video_metadata(
                "Example TikTok",
                "TikTok Creator",
                "https://www.tiktok.com/@_/video/123",
            )
        ),
    ) as run:
        response = client.post(
            "/api/analyze",
            json={"url": noisy_url},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["platform"] == "tiktok"
    assert body["type"] == "video"
    assert body["title"] == "Example TikTok"
    assert body["creator"] == "TikTok Creator"
    assert body["webpageUrl"] == "https://www.tiktok.com/@_/video/123"
    assert [item["value"] for item in body["qualities"]] == [
        "best",
        "720p",
        "audio_mp3",
    ]
    assert body["rawFormats"][0]["filesize"] == 7_875_000
    assert "--no-playlist" in run.call_args.args[0]
    assert "--add-header" in run.call_args.args[0]
    assert run.call_args.args[0][-1] == "https://www.tiktok.com/@_/video/123"


def test_analyze_clean_and_noisy_tiktok_urls_match() -> None:
    with patch(
        "app.platforms.base.subprocess.run",
        return_value=_completed_process(
            _social_video_metadata(
                "Example TikTok",
                "TikTok Creator",
                "https://www.tiktok.com/@_/video/123",
            )
        ),
    ):
        clean_response = client.post(
            "/api/analyze",
            json={"url": "https://www.tiktok.com/@creator/video/123"},
        )
        noisy_response = client.post(
            "/api/analyze",
            json={
                "url": (
                    "https://www.tiktok.com/@creator/video/123"
                    "?is_from_webapp=1&sender_device=pc"
                )
            },
        )

    assert clean_response.status_code == 200
    assert noisy_response.status_code == 200
    assert clean_response.json()["webpageUrl"] == noisy_response.json()["webpageUrl"]


def test_analyze_tiktok_short_video_path_reaches_ytdlp() -> None:
    with patch(
        "app.platforms.base.subprocess.run",
        return_value=_completed_process(
            _social_video_metadata(
                "Example TikTok",
                "TikTok Creator",
                "https://www.tiktok.com/video/123",
            )
        ),
    ) as run:
        response = client.post(
            "/api/analyze",
        json={"url": "https://www.tiktok.com/video/123?sender_device=pc"},
    )

    assert response.status_code == 200
    assert response.json()["webpageUrl"] == "https://www.tiktok.com/@_/video/123"
    assert "--add-header" in run.call_args.args[0]
    assert run.call_args.args[0][-1] == "https://www.tiktok.com/@_/video/123"


def test_analyze_instagram_video_returns_normalized_metadata() -> None:
    with patch(
        "app.platforms.base.subprocess.run",
        return_value=_completed_process(
            _social_video_metadata(
                "Example Reel",
                "Instagram Creator",
                "https://www.instagram.com/reel/ABC123/",
            )
        ),
    ):
        response = client.post(
            "/api/analyze",
            json={"url": "https://www.instagram.com/reel/ABC123/"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["platform"] == "instagram"
    assert body["type"] == "video"
    assert body["title"] == "Example Reel"
    assert body["rawFormats"][0]["filesize"] == 7_875_000


@pytest.mark.parametrize(
    "url",
    [
        "https://www.instagram.com/reel/DWyymafjsI6/",
        "https://www.instagram.com/reel/DW52L0-kh2M/",
        "https://www.instagram.com/reel/DW0r9ENE_Mi/",
    ],
)
def test_analyze_instagram_cdn_thumbnail_points_to_proxy_path(url: str) -> None:
    with patch(
        "app.platforms.base.subprocess.run",
        return_value=_completed_process(
            {
                **_social_video_metadata(
                    "Example Reel",
                    "Instagram Creator",
                    "https://www.instagram.com/reel/ABC123/",
                ),
                "thumbnail": "https://scontent-lax3-1.cdninstagram.com/v/t51/thumb.jpg?stp=dst-jpg",
            }
        ),
    ):
        response = client.post(
            "/api/analyze",
            json={"url": url},
        )

    assert response.status_code == 200
    thumbnail = response.json()["thumbnail"]
    assert thumbnail.startswith("/api/proxy/thumbnail?url=")
    assert "scontent-lax3-1.cdninstagram.com" in thumbnail


def test_proxy_thumbnail_returns_image_bytes_and_content_type() -> None:
    with patch(
        "app.services.thumbnail_proxy_service.urlopen",
        return_value=FakeThumbnailResponse(b"image-bytes", "image/jpeg"),
    ):
        response = client.get(
            "/api/proxy/thumbnail",
            params={"url": "https://scontent-lax3-1.cdninstagram.com/v/t51/thumb.jpg"},
        )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("image/jpeg")
    assert response.content == b"image-bytes"


def test_proxy_thumbnail_returns_friendly_error_when_cdn_unreachable() -> None:
    with patch(
        "app.services.thumbnail_proxy_service.urlopen",
        side_effect=URLError("network down"),
    ):
        response = client.get(
            "/api/proxy/thumbnail",
            params={"url": "https://scontent-lax3-1.cdninstagram.com/v/t51/thumb.jpg"},
        )

    assert response.status_code == 502
    assert response.json() == {"detail": "Could not reach Instagram's thumbnail CDN."}


def test_analyze_x_video_returns_normalized_metadata() -> None:
    with patch(
        "app.platforms.base.subprocess.run",
        return_value=_completed_process(
            _social_video_metadata(
                "Example X Post",
                "X Creator",
                "https://x.com/creator/status/123",
            )
        ),
    ):
        response = client.post(
            "/api/analyze",
            json={"url": "https://x.com/creator/status/123"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["platform"] == "x"
    assert body["type"] == "video"
    assert body["title"] == "Example X Post"
    assert body["rawFormats"][0]["filesize"] == 7_875_000


def test_analyze_x_image_only_post_uses_syndication_fallback() -> None:
    with (
        patch(
            "app.platforms.base.subprocess.run",
            return_value=subprocess.CompletedProcess(
                args=["yt-dlp"],
                returncode=1,
                stdout="null",
                stderr="ERROR: [twitter] 2044665313904779452: No video could be found in this tweet",
            ),
        ),
        patch(
            "app.platforms.x.urlopen",
            return_value=FakeJsonResponse(
                {
                    "text": "Example image post",
                    "user": {"name": "X Creator"},
                    "mediaDetails": [
                        {
                            "type": "photo",
                            "media_url_https": "https://pbs.twimg.com/media/example?format=png&name=small",
                        }
                    ],
                }
            ),
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
    assert body["thumbnail"] == "https://pbs.twimg.com/media/example?format=jpg&name=small"
    assert body["qualities"][0]["value"] == "image_original"


def test_analyze_prefers_https_thumbnail_candidates() -> None:
    with patch(
        "app.platforms.base.subprocess.run",
        return_value=_completed_process(
            {
                **_social_video_metadata(
                    "Example Reel",
                    "Instagram Creator",
                    "https://www.instagram.com/reel/ABC123/",
                ),
                "thumbnail": "http://bad.example/thumb.jpg",
                "thumbnails": [
                    {"url": "http://bad.example/low.jpg"},
                    {"url": "https://cdn.example/good.jpg"},
                ],
            }
        ),
    ):
        response = client.post(
            "/api/analyze",
            json={"url": "https://www.instagram.com/reel/ABC123/"},
        )

    assert response.status_code == 200
    assert response.json()["thumbnail"] == "https://cdn.example/good.jpg"


def test_analyze_image_only_metadata_returns_image_option() -> None:
    with patch(
        "app.platforms.base.subprocess.run",
        return_value=_completed_process(_image_metadata()),
    ):
        response = client.post(
            "/api/analyze",
            json={"url": "https://www.instagram.com/p/IMG123/"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["type"] == "image"
    assert body["imageCount"] is None
    assert body["qualities"] == [
        {
            "label": "Original image",
            "value": "image_original",
            "available": True,
            "kind": "image",
        }
    ]


def test_analyze_multi_image_metadata_returns_gallery_option() -> None:
    with patch(
        "app.platforms.base.subprocess.run",
        return_value=_completed_process(_gallery_metadata()),
    ):
        response = client.post(
            "/api/analyze",
            json={"url": "https://x.com/creator/status/123"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["type"] == "gallery"
    assert body["imageCount"] == 2
    assert body["qualities"][0]["value"] == "image_original"


def test_analyze_x_post_with_no_media_returns_friendly_error() -> None:
    with patch(
        "app.platforms.base.subprocess.run",
        return_value=_completed_process(
            {
                "title": "Text only post",
                "webpage_url": "https://x.com/creator/status/123",
            }
        ),
    ):
        response = client.post(
            "/api/analyze",
            json={"url": "https://x.com/creator/status/123"},
        )

    assert response.status_code == 400
    assert response.json() == {
        "detail": "This X post does not contain downloadable video or image media."
    }


def test_analyze_social_private_error_is_friendly() -> None:
    with patch(
        "app.platforms.base.subprocess.run",
        return_value=subprocess.CompletedProcess(
            args=["yt-dlp"],
            returncode=1,
            stdout="",
            stderr="ERROR: login required. Use cookies from browser.",
        ),
    ):
        response = client.post(
            "/api/analyze",
            json={"url": "https://www.instagram.com/reel/private/"},
        )

    assert response.status_code == 400
    assert response.json() == {
        "detail": "This media appears to be private or restricted."
    }


def test_analyze_returns_friendly_ytdlp_error() -> None:
    with patch(
        "app.platforms.youtube.subprocess.run",
        return_value=subprocess.CompletedProcess(
            args=["yt-dlp"],
            returncode=1,
            stdout="",
            stderr="ERROR: Private video. Sign in if you have been granted access.",
        ),
    ):
        response = client.post(
            "/api/analyze",
            json={"url": "https://www.youtube.com/watch?v=private"},
        )

    assert response.status_code == 400
    assert response.json() == {
        "detail": "This media appears to be private or restricted."
    }


def test_analyze_returns_friendly_network_error() -> None:
    with patch(
        "app.platforms.youtube.subprocess.run",
        return_value=subprocess.CompletedProcess(
            args=["yt-dlp"],
            returncode=1,
            stdout="null",
            stderr=(
                "ERROR: [youtube:tab] PL123: Unable to download API page: "
                "HTTPSConnection(host='www.youtube.com', port=443): "
                "Failed to resolve 'www.youtube.com' ([Errno -2] Name or service not known)"
            ),
        ),
    ):
        response = client.post(
            "/api/analyze",
            json={"url": "https://www.youtube.com/playlist?list=PL123"},
        )

    assert response.status_code == 400
    assert response.json() == {
        "detail": "Could not reach YouTube. Check your internet connection and try again."
    }


def test_analyze_classifies_stdout_ytdlp_errors() -> None:
    with patch(
        "app.platforms.youtube.subprocess.run",
        return_value=subprocess.CompletedProcess(
            args=["yt-dlp"],
            returncode=1,
            stdout="ERROR: [youtube:tab] PL123: The playlist does not exist.",
            stderr="",
        ),
    ):
        response = client.post(
            "/api/analyze",
            json={"url": "https://www.youtube.com/playlist?list=PL123"},
        )

    assert response.status_code == 400
    assert response.json() == {
        "detail": "This playlist is unavailable or no longer exists."
    }


def test_analyze_rejects_null_playlist_payload() -> None:
    with patch(
        "app.platforms.youtube.subprocess.run",
        return_value=subprocess.CompletedProcess(
            args=["yt-dlp"],
            returncode=0,
            stdout="null",
            stderr="",
        ),
    ):
        response = client.post(
            "/api/analyze",
            json={"url": "https://www.youtube.com/playlist?list=PL123"},
        )

    assert response.status_code == 400
    assert response.json() == {
        "detail": "This playlist is unavailable or no longer exists."
    }


def test_analyze_watch_playlist_falls_back_to_current_video() -> None:
    with patch(
        "app.platforms.youtube.subprocess.run",
        return_value=_completed_process(_video_metadata()),
    ):
        response = client.post(
            "/api/analyze",
            json={"url": "https://www.youtube.com/watch?v=abc123&list=PLMissing"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["type"] == "video"
    assert body["title"] == "Example Video"
    assert body["playlist"] is None
    assert body["notice"] == (
        "This list is not available as a public playlist, so Nextract loaded the current video instead."
    )


def test_analyze_strict_playlist_rejects_empty_entries() -> None:
    with patch(
        "app.platforms.youtube.subprocess.run",
        return_value=_completed_process(
            {
                "id": "PL123",
                "title": "Empty Playlist",
                "webpage_url": "https://www.youtube.com/playlist?list=PL123",
                "entries": [],
            }
        ),
    ):
        response = client.post(
            "/api/analyze",
            json={"url": "https://www.youtube.com/playlist?list=PL123"},
        )

    assert response.status_code == 400
    assert response.json() == {
        "detail": "This playlist is unavailable or has no public videos."
    }


def test_analyze_playlist_returns_basic_summary() -> None:
    with patch(
        "app.platforms.youtube.subprocess.run",
        return_value=_completed_process(_playlist_metadata()),
    ) as run:
        response = client.post(
            "/api/analyze",
            json={"url": "https://www.youtube.com/playlist?list=PL123"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["type"] == "playlist"
    assert body["notice"] is None
    assert body["title"] == "Example Playlist"
    assert [item["value"] for item in body["qualities"]] == [
        "best",
        "1080p",
        "720p",
        "480p",
        "360p",
        "audio_m4a",
        "audio_mp3",
        "audio_opus",
    ]
    assert body["rawFormats"] == []
    assert body["playlist"] == {
        "id": "PL123",
        "title": "Example Playlist",
        "itemCount": 2,
        "items": [
            {
                "index": 1,
                "title": "One",
                "url": "https://www.youtube.com/watch?v=one",
                "thumbnail": None,
                "duration": 101,
                "available": True,
                "errorMessage": None,
            },
            {
                "index": 2,
                "title": "Two",
                "url": "https://www.youtube.com/watch?v=two",
                "thumbnail": None,
                "duration": None,
                "available": True,
                "errorMessage": None,
            },
        ],
    }
    assert "--flat-playlist" in run.call_args.args[0]
    assert "--yes-playlist" in run.call_args.args[0]
    assert "--ignore-errors" in run.call_args.args[0]


def _completed_process(payload: dict) -> subprocess.CompletedProcess[str]:
    return subprocess.CompletedProcess(
        args=["yt-dlp"],
        returncode=0,
        stdout=json.dumps(payload),
        stderr="",
    )


def _video_metadata() -> dict:
    return {
        "title": "Example Video",
        "thumbnail": "https://img.youtube.com/example.jpg",
        "duration": 615,
        "uploader": "Example Channel",
        "webpage_url": "https://www.youtube.com/watch?v=abc123",
        "formats": [
            {
                "format_id": "137",
                "ext": "mp4",
                "height": 1080,
                "width": 1920,
                "fps": 30,
                "vcodec": "avc1",
                "acodec": "none",
                "filesize": 1234,
                "tbr": 2500,
                "url": "https://sensitive.example/video",
            },
            {
                "format_id": "136",
                "ext": "mp4",
                "height": 720,
                "width": 1280,
                "fps": 30,
                "vcodec": "avc1",
                "acodec": "none",
            },
            {
                "format_id": "140",
                "ext": "m4a",
                "vcodec": "none",
                "acodec": "mp4a",
            },
            {
                "format_id": "251",
                "ext": "opus",
                "vcodec": "none",
                "acodec": "opus",
            },
        ],
    }


def _social_video_metadata(title: str, creator: str, webpage_url: str) -> dict:
    return {
        "title": title,
        "thumbnail": "https://cdn.example/thumb.jpg",
        "duration": 42,
        "uploader": creator,
        "webpage_url": webpage_url,
        "formats": [
            {
                "format_id": "h264",
                "ext": "mp4",
                "height": 720,
                "width": 1280,
                "fps": 30,
                "vcodec": "avc1",
                "acodec": "aac",
                "tbr": 1500,
            }
        ],
    }


def _image_metadata() -> dict:
    return {
        "title": "Example Image",
        "thumbnail": "https://cdn.example/image-preview.jpg",
        "webpage_url": "https://www.instagram.com/p/IMG123/",
        "ext": "jpg",
        "formats": [
            {
                "format_id": "original",
                "ext": "jpg",
                "url": "https://cdn.example/image.jpg",
                "filesize": 2048,
                "vcodec": "none",
                "acodec": "none",
            }
        ],
    }


def _gallery_metadata() -> dict:
    return {
        "title": "Example Gallery",
        "thumbnail": "https://cdn.example/gallery-preview.jpg",
        "webpage_url": "https://x.com/creator/status/123",
        "entries": [
            {
                "id": "one",
                "title": "Image One",
                "thumbnail": "https://cdn.example/one.jpg",
            },
            {
                "id": "two",
                "title": "Image Two",
                "thumbnail": "https://cdn.example/two.jpg",
            },
        ],
    }


def _playlist_metadata() -> dict:
    return {
        "id": "PL123",
        "title": "Example Playlist",
        "thumbnail": "https://img.youtube.com/playlist.jpg",
        "webpage_url": "https://www.youtube.com/playlist?list=PL123",
        "entries": [
            {"id": "one", "title": "One", "duration": 101},
            {"id": "two", "title": "Two"},
        ],
    }


class FakeThumbnailResponse:
    def __init__(self, content: bytes, content_type: str) -> None:
        self.content = content
        self.headers = {"content-type": content_type}

    def __enter__(self) -> "FakeThumbnailResponse":
        return self

    def __exit__(self, *_args: object) -> None:
        return None

    def read(self, _size: int) -> bytes:
        return self.content


class FakeJsonResponse:
    def __init__(self, payload: dict) -> None:
        self.payload = payload

    def __enter__(self) -> "FakeJsonResponse":
        return self

    def __exit__(self, *_args: object) -> None:
        return None

    def read(self) -> bytes:
        return json.dumps(self.payload).encode("utf-8")

import json
import subprocess
from unittest.mock import patch

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
        "detail": "Only YouTube links are supported in this version."
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

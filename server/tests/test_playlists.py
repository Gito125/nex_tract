import json
import subprocess
import threading
import time
from pathlib import Path
from typing import Any, cast
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.db.database import engine
from app.db.models import DownloadHistoryItem, DownloadStatus
from app.main import app

client = TestClient(app)


def test_create_playlist_download_completes_all_items(tmp_path: Path) -> None:
    original = client.get("/api/settings").json()
    output_one = tmp_path / "Example Playlist" / "001 - One.mp4"
    output_two = tmp_path / "Example Playlist" / "002 - Two.mp4"

    try:
        assert client.patch("/api/settings", json={"downloadFolder": str(tmp_path)}).status_code == 200

        with (
            patch(
                "app.platforms.youtube.subprocess.run",
                return_value=_completed_process(_playlist_metadata()),
            ),
            patch(
                "app.services.playlist_service.subprocess.Popen",
                side_effect=[
                    _fake_process(stdout=f"{output_one}\n"),
                    _fake_process(stdout=f"{output_two}\n"),
                ],
            ) as popen,
        ):
            response = client.post(
                "/api/playlists",
                json={
                    "url": "https://www.youtube.com/playlist?list=PL123",
                    "quality": "720p",
                    "downloadType": "video",
                    "audioFormat": None,
                },
            )

            assert response.status_code == 200
            playlist_id = cast(str, response.json()["id"])
            playlist = _wait_for_playlist_status(playlist_id, "completed")

        assert playlist["totalItems"] == 2
        assert playlist["completedItems"] == 2
        assert playlist["progress"] == 100
        assert [item["status"] for item in playlist["items"]] == ["completed", "completed"]
        assert playlist["items"][0]["outputPath"] == str(output_one)
        assert popen.call_args is not None
        assert "shell" not in popen.call_args.kwargs
        first_args = popen.call_args_list[0].args[0]
        assert "--no-playlist" in first_args
        assert any("Example Playlist" in arg for arg in first_args)
        assert any("001 - One.%(ext)s" in arg for arg in first_args)
    finally:
        client.patch("/api/settings", json=original)


def test_create_playlist_download_supports_selected_range() -> None:
    with (
        patch(
            "app.platforms.youtube.subprocess.run",
            return_value=_completed_process(_playlist_metadata(item_count=3)),
        ),
        patch("app.services.playlist_service._executor.submit") as submit,
    ):
        response = client.post(
            "/api/playlists",
            json={
                "url": "https://www.youtube.com/playlist?list=PL123",
                "quality": "best",
                "downloadType": "video",
                "audioFormat": None,
                "rangeStart": 2,
                "rangeEnd": 3,
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["totalItems"] == 2
    assert [item["itemIndex"] for item in body["items"]] == [2, 3]
    submit.assert_called_once()


def test_create_playlist_download_rejects_invalid_range() -> None:
    with patch(
        "app.platforms.youtube.subprocess.run",
        return_value=_completed_process(_playlist_metadata()),
    ):
        response = client.post(
            "/api/playlists",
            json={
                "url": "https://www.youtube.com/playlist?list=PL123",
                "quality": "best",
                "downloadType": "video",
                "audioFormat": None,
                "rangeStart": 2,
                "rangeEnd": 1,
            },
        )

    assert response.status_code == 400
    assert response.json() == {"detail": "Enter a valid playlist range."}


def test_playlist_skip_existing_marks_item_skipped(tmp_path: Path) -> None:
    existing_path = tmp_path / "existing.mp4"
    existing_path.write_text("video", encoding="utf-8")
    original = client.get("/api/settings").json()

    with Session(engine) as session:
        item = DownloadHistoryItem(
            job_id="existing-playlist-item",
            url="https://www.youtube.com/watch?v=one",
            title="One",
            selected_quality="best",
            status=DownloadStatus.COMPLETED.value,
            output_path=str(existing_path),
            download_folder=str(tmp_path),
        )
        session.add(item)
        session.commit()

    try:
        assert client.patch("/api/settings", json={"downloadFolder": str(tmp_path)}).status_code == 200

        with (
            patch(
                "app.platforms.youtube.subprocess.run",
                return_value=_completed_process(_playlist_metadata(item_count=1)),
            ),
            patch("app.services.playlist_service.subprocess.Popen") as popen,
        ):
            response = client.post(
                "/api/playlists",
                json={
                    "url": "https://www.youtube.com/playlist?list=PL123",
                    "quality": "best",
                    "downloadType": "video",
                    "audioFormat": None,
                    "skipExisting": True,
                },
            )

            assert response.status_code == 200
            playlist_id = cast(str, response.json()["id"])
            playlist = _wait_for_playlist_status(playlist_id, "completed")

        assert playlist["skippedItems"] == 1
        assert playlist["items"][0]["status"] == "skipped"
        popen.assert_not_called()
    finally:
        client.patch("/api/settings", json=original)


def test_playlist_failure_continues_to_remaining_items(tmp_path: Path) -> None:
    original = client.get("/api/settings").json()
    output_two = tmp_path / "Example Playlist" / "002 - Two.mp4"

    try:
        assert client.patch("/api/settings", json={"downloadFolder": str(tmp_path)}).status_code == 200

        with (
            patch(
                "app.platforms.youtube.subprocess.run",
                return_value=_completed_process(_playlist_metadata()),
            ),
            patch(
                "app.services.playlist_service.subprocess.Popen",
                side_effect=[
                    _fake_process(returncode=1, stderr="ERROR: requested format is not available"),
                    _fake_process(stdout=f"{output_two}\n"),
                ],
            ),
        ):
            response = client.post(
                "/api/playlists",
                json={
                    "url": "https://www.youtube.com/playlist?list=PL123",
                    "quality": "1080p",
                    "downloadType": "video",
                    "audioFormat": None,
                },
            )

            assert response.status_code == 200
            playlist_id = cast(str, response.json()["id"])
            playlist = _wait_for_playlist_status(playlist_id, "failed")

        assert playlist["failedItems"] == 1
        assert playlist["completedItems"] == 1
        assert [item["status"] for item in playlist["items"]] == ["failed", "completed"]
        assert playlist["items"][0]["errorMessage"] == "Selected quality is not available for this media."
    finally:
        client.patch("/api/settings", json=original)


def test_cancel_playlist_marks_remaining_items_cancelled() -> None:
    release = threading.Event()
    fake_process = _blocking_process(release)

    with (
        patch(
            "app.platforms.youtube.subprocess.run",
            return_value=_completed_process(_playlist_metadata()),
        ),
        patch(
            "app.services.playlist_service.subprocess.Popen",
            return_value=fake_process,
        ),
    ):
        response = client.post(
            "/api/playlists",
            json={
                "url": "https://www.youtube.com/playlist?list=PL123",
                "quality": "best",
                "downloadType": "video",
                "audioFormat": None,
            },
        )
        assert response.status_code == 200
        playlist_id = cast(str, response.json()["id"])
        _wait_for_playlist_status(playlist_id, "downloading")

        cancel_response = client.post(f"/api/playlists/{playlist_id}/cancel")

    assert cancel_response.status_code == 200
    body = cancel_response.json()
    assert body["status"] == "cancelled"
    _wait_for_process_terminated(fake_process)
    assert all(item["status"] == "cancelled" for item in body["items"])
    release.set()


def test_playlist_size_estimate_sums_selected_video_formats() -> None:
    with patch(
        "app.platforms.youtube.subprocess.run",
        side_effect=[
            _completed_process(_video_metadata(video_size=2_000, audio_size=200)),
            _completed_process(_video_metadata(video_size=3_000, audio_size=300)),
        ],
    ):
        response = client.post(
            "/api/playlists/size-estimate",
            json={
                "items": [
                    {"index": 1, "url": "https://www.youtube.com/watch?v=one"},
                    {"index": 2, "url": "https://www.youtube.com/watch?v=two"},
                ],
                "qualities": ["best", "720p", "audio_m4a"],
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["requestedItems"] == 2
    assert body["analyzedItems"] == 2
    assert body["failedItems"] == 0
    assert body["estimates"] == [
        {
            "quality": "best",
            "totalBytes": 5_500,
            "estimatedItems": 2,
            "unavailableItems": 0,
            "estimateKind": "exact",
        },
        {
            "quality": "720p",
            "totalBytes": 5_500,
            "estimatedItems": 2,
            "unavailableItems": 0,
            "estimateKind": "exact",
        },
        {
            "quality": "audio_m4a",
            "totalBytes": 500,
            "estimatedItems": 2,
            "unavailableItems": 0,
            "estimateKind": "exact",
        },
    ]


def test_playlist_size_estimate_falls_back_to_bitrate_duration() -> None:
    with patch(
        "app.platforms.youtube.subprocess.run",
        return_value=_completed_process(_video_metadata_with_bitrate()),
    ):
        response = client.post(
            "/api/playlists/size-estimate",
            json={
                "items": [
                    {"index": 1, "url": "https://www.youtube.com/watch?v=one"},
                ],
                "qualities": ["720p", "audio_m4a"],
            },
        )

    assert response.status_code == 200
    assert response.json()["estimates"] == [
        {
            "quality": "720p",
            "totalBytes": 1_500_000,
            "estimatedItems": 1,
            "unavailableItems": 0,
            "estimateKind": "approximate",
        },
        {
            "quality": "audio_m4a",
            "totalBytes": 250_000,
            "estimatedItems": 1,
            "unavailableItems": 0,
            "estimateKind": "approximate",
        },
    ]


def test_playlist_size_estimate_returns_unknown_for_missing_sizes() -> None:
    with patch(
        "app.platforms.youtube.subprocess.run",
        return_value=_completed_process(_video_metadata_without_sizes()),
    ):
        response = client.post(
            "/api/playlists/size-estimate",
            json={
                "items": [
                    {"index": 1, "url": "https://www.youtube.com/watch?v=one"},
                ],
                "qualities": ["720p"],
            },
        )

    assert response.status_code == 200
    assert response.json()["estimates"] == [
        {
            "quality": "720p",
            "totalBytes": None,
            "estimatedItems": 0,
            "unavailableItems": 1,
            "estimateKind": "unknown",
        }
    ]


def _wait_for_playlist_status(
    playlist_id: str,
    status: str,
    timeout: float = 3.0,
) -> dict[str, Any]:
    deadline = time.monotonic() + timeout
    last_body: dict[str, Any] | None = None

    while time.monotonic() < deadline:
        response = client.get(f"/api/playlists/{playlist_id}")
        assert response.status_code == 200
        last_body = cast(dict[str, Any], response.json())
        if last_body["status"] == status:
            return last_body
        time.sleep(0.02)

    raise AssertionError(f"Playlist did not reach {status}. Last body: {last_body}")


def _wait_for_process_terminated(
    process: "FakeProcess",
    timeout: float = 2.0,
) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if process.terminated:
            return
        time.sleep(0.02)
    raise AssertionError("Process was not terminated.")


def _completed_process(payload: dict[str, Any]) -> subprocess.CompletedProcess[str]:
    return subprocess.CompletedProcess(
        args=["yt-dlp"],
        returncode=0,
        stdout=json.dumps(payload),
        stderr="",
    )


def _playlist_metadata(item_count: int = 2) -> dict[str, Any]:
    entries = [
        {
            "id": "one",
            "title": "One",
            "duration": 101,
            "webpage_url": "https://www.youtube.com/watch?v=one",
        },
        {
            "id": "two",
            "title": "Two",
            "duration": 202,
            "webpage_url": "https://www.youtube.com/watch?v=two",
        },
        {
            "id": "three",
            "title": "Three",
            "duration": 303,
            "webpage_url": "https://www.youtube.com/watch?v=three",
        },
    ]
    return {
        "id": "PL123",
        "title": "Example Playlist",
        "thumbnail": "https://img.youtube.com/playlist.jpg",
        "webpage_url": "https://www.youtube.com/playlist?list=PL123",
        "entries": entries[:item_count],
    }


def _video_metadata(video_size: int, audio_size: int) -> dict[str, Any]:
    return {
        "title": "Example Video",
        "webpage_url": "https://www.youtube.com/watch?v=abc123",
        "formats": [
            {
                "format_id": "136",
                "ext": "mp4",
                "height": 720,
                "vcodec": "avc1",
                "acodec": "none",
                "filesize": video_size,
            },
            {
                "format_id": "140",
                "ext": "m4a",
                "vcodec": "none",
                "acodec": "mp4a",
                "filesize": audio_size,
            },
        ],
    }


def _video_metadata_with_bitrate() -> dict[str, Any]:
    return {
        "title": "Example Video",
        "duration": 10,
        "webpage_url": "https://www.youtube.com/watch?v=abc123",
        "formats": [
            {
                "format_id": "136",
                "ext": "mp4",
                "height": 720,
                "vcodec": "avc1",
                "acodec": "none",
                "tbr": 1_000,
            },
            {
                "format_id": "140",
                "ext": "m4a",
                "vcodec": "none",
                "acodec": "mp4a",
                "tbr": 200,
            },
        ],
    }


def _video_metadata_without_sizes() -> dict[str, Any]:
    return {
        "title": "Example Video",
        "webpage_url": "https://www.youtube.com/watch?v=abc123",
        "formats": [
            {
                "format_id": "136",
                "ext": "mp4",
                "height": 720,
                "vcodec": "avc1",
                "acodec": "none",
            }
        ],
    }


class FakeProcess:
    def __init__(
        self,
        stdout: str = "",
        stderr: str = "",
        returncode: int | None = 0,
        release: threading.Event | None = None,
    ) -> None:
        self.stdout = stdout
        self.stderr = stderr
        self.returncode = returncode
        self.release = release
        self.terminated = False

    def communicate(self) -> tuple[str, str]:
        if self.release:
            self.release.wait(timeout=1)
        return self.stdout, self.stderr

    def poll(self) -> int | None:
        return self.returncode

    def terminate(self) -> None:
        self.terminated = True
        self.returncode = -15
        if self.release:
            self.release.set()


def _fake_process(
    stdout: str = "",
    stderr: str = "",
    returncode: int = 0,
) -> FakeProcess:
    return FakeProcess(stdout=stdout, stderr=stderr, returncode=returncode)


def _blocking_process(release: threading.Event) -> FakeProcess:
    return FakeProcess(returncode=None, release=release)

import json
import subprocess
import threading
import time
from pathlib import Path
from typing import Any, cast
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.db.database import engine
from app.db.models import DownloadHistoryItem, DownloadJob, DownloadStatus
from app.main import app
from app.services.download_service import build_ytdlp_args
from app.services.settings_service import get_app_settings

client = TestClient(app)


def test_create_download_job_completes_successfully() -> None:
    output_path = _download_folder() / "YouTube" / "Example Video-abc123.mp4"

    with (
        patch(
            "app.platforms.youtube.subprocess.run",
            return_value=_completed_process(_video_metadata()),
        ),
        patch(
            "app.services.download_service.subprocess.Popen",
            return_value=_fake_process(stdout=f"{output_path}\n"),
        ) as popen,
    ):
        response = client.post(
            "/api/downloads",
            json={
                "url": "https://www.youtube.com/watch?v=abc123",
                "quality": "720p",
                "downloadType": "video",
                "audioFormat": None,
            },
        )

        assert response.status_code == 200
        job_id = cast(str, response.json()["id"])
        job = _wait_for_status(job_id, "completed")

    assert job["selectedQuality"] == "720p"
    assert job["progress"] == 100
    assert job["progressStatus"] == "completed"
    assert job["outputPath"] == str(output_path)
    history_response = client.get(
        "/api/history",
        params={"query": "Example Video", "status": "completed", "limit": 10},
    )
    assert history_response.status_code == 200
    history_items = history_response.json()["items"]
    assert any(item["jobId"] == job_id for item in history_items)
    assert popen.call_args is not None
    assert "shell" not in popen.call_args.kwargs


def test_create_download_rejects_unsupported_platform() -> None:
    with patch("app.services.analyze_service.get_app_settings") as mock_get_settings:
        mock_get_settings.return_value.generic_fallback_enabled = False
        response = client.post(
            "/api/downloads",
            json={
                "url": "https://example.com/123",
                "quality": "best",
                "downloadType": "video",
                "audioFormat": None,
            },
        )

    assert response.status_code == 400
    assert response.json() == {
        "detail": "This platform is not natively supported."
    }


def test_create_download_job_stores_social_platform() -> None:
    with (
        patch(
            "app.platforms.base.subprocess.run",
            return_value=_completed_process(
                _video_metadata(
                    webpage_url="https://www.tiktok.com/@creator/video/123",
                )
            ),
        ),
        patch("app.services.download_service._executor.submit"),
    ):
        response = client.post(
            "/api/downloads",
            json={
                "url": "https://www.tiktok.com/@creator/video/123",
                "quality": "720p",
                "downloadType": "video",
                "audioFormat": None,
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["platform"] == "tiktok"


def test_create_download_job_stores_image_media_type() -> None:
    with (
        patch(
            "app.platforms.base.subprocess.run",
            return_value=_completed_process(_image_metadata()),
        ),
        patch("app.services.download_service._executor.submit"),
    ):
        response = client.post(
            "/api/downloads",
            json={
                "url": "https://www.instagram.com/p/IMG123/",
                "quality": "image_original",
                "downloadType": "image",
                "audioFormat": None,
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["mediaType"] == "image"
    assert body["selectedQuality"] == "image_original"


def test_create_download_job_stores_gallery_media_type() -> None:
    with (
        patch(
            "app.platforms.base.subprocess.run",
            return_value=_completed_process(_gallery_metadata()),
        ),
        patch("app.services.download_service._executor.submit"),
    ):
        response = client.post(
            "/api/downloads",
            json={
                "url": "https://x.com/creator/status/123",
                "quality": "image_original",
                "downloadType": "image",
                "audioFormat": None,
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["mediaType"] == "gallery"


@pytest.mark.parametrize(
    ("url", "platform", "webpage_url"),
    [
        (
            "https://www.tiktok.com/video/123",
            "tiktok",
            "https://www.tiktok.com/video/123",
        ),
        (
            "https://www.instagram.com/reel/ABC123/",
            "instagram",
            "https://www.instagram.com/reel/ABC123/",
        ),
    ],
)
def test_full_analyze_to_download_flow_for_social_video_platforms(
    tmp_path: Path,
    url: str,
    platform: str,
    webpage_url: str,
) -> None:
    display_name = "TikTok" if platform == "tiktok" else "Instagram"
    output_path = tmp_path / display_name / f"{platform}-video.mp4"
    original = client.get("/api/settings").json()

    try:
        settings_response = client.patch(
            "/api/settings",
            json={"downloadFolder": str(tmp_path)},
        )
        assert settings_response.status_code == 200

        with (
            patch(
                "app.platforms.base.subprocess.run",
                return_value=_completed_process(_video_metadata(webpage_url=webpage_url)),
            ),
            patch(
                "app.services.download_service.subprocess.Popen",
                return_value=_fake_process(stdout=f"{output_path}\n"),
            ),
        ):
            analyze_response = client.post("/api/analyze", json={"url": url})
            assert analyze_response.status_code == 200
            assert analyze_response.json()["platform"] == platform

            download_response = client.post(
                "/api/downloads",
                json={
                    "url": url,
                    "quality": "720p",
                    "downloadType": "video",
                    "audioFormat": None,
                },
            )

            assert download_response.status_code == 200
            job_id = cast(str, download_response.json()["id"])
            job = _wait_for_status(job_id, "completed")

        assert job["platform"] == platform
        assert job["mediaType"] == "video"
        assert job["outputPath"] == str(output_path)
    finally:
        client.patch("/api/settings", json=original)


def test_x_image_download_completes_to_images_folder(tmp_path: Path) -> None:
    output_path = tmp_path / "X" / "images" / "Example Image-123-image_original.jpg"
    original = client.get("/api/settings").json()

    try:
        settings_response = client.patch(
            "/api/settings",
            json={"downloadFolder": str(tmp_path)},
        )
        assert settings_response.status_code == 200

        with (
            patch(
                "app.platforms.base.subprocess.run",
                return_value=_completed_process(
                    _image_metadata(webpage_url="https://x.com/creator/status/123")
                ),
            ),
            patch(
                "app.services.download_service.urlopen",
                return_value=FakeImageResponse(b"jpg-bytes"),
            ),
        ):
            analyze_response = client.post(
                "/api/analyze",
                json={"url": "https://x.com/creator/status/123"},
            )
            assert analyze_response.status_code == 200
            assert analyze_response.json()["type"] == "image"

            response = client.post(
                "/api/downloads",
                json={
                    "url": "https://x.com/creator/status/123",
                    "quality": "image_original",
                    "downloadType": "image",
                    "audioFormat": None,
                },
            )

            assert response.status_code == 200
            job_id = cast(str, response.json()["id"])
            job = _wait_for_status(job_id, "completed")

        assert job["mediaType"] == "image"
        assert job["outputPath"] == str(output_path)
        assert Path(job["outputPath"]).parent == tmp_path / "X" / "images"
        assert output_path.read_bytes() == b"jpg-bytes"
    finally:
        client.patch("/api/settings", json=original)


def test_x_video_download_keeps_video_root(tmp_path: Path) -> None:
    output_path = tmp_path / "X" / "Example Video-x123-720p.mp4"
    original = client.get("/api/settings").json()

    try:
        settings_response = client.patch(
            "/api/settings",
            json={"downloadFolder": str(tmp_path)},
        )
        assert settings_response.status_code == 200

        with (
            patch(
                "app.platforms.base.subprocess.run",
                return_value=_completed_process(
                    _video_metadata(webpage_url="https://x.com/creator/status/123")
                ),
            ),
            patch(
                "app.services.download_service.subprocess.Popen",
                return_value=_fake_process(stdout=f"{output_path}\n"),
            ),
        ):
            response = client.post(
                "/api/downloads",
                json={
                    "url": "https://x.com/creator/status/123",
                    "quality": "720p",
                    "downloadType": "video",
                    "audioFormat": None,
                },
            )

            assert response.status_code == 200
            job_id = cast(str, response.json()["id"])
            job = _wait_for_status(job_id, "completed")

        assert job["mediaType"] == "video"
        assert job["outputPath"] == str(output_path)
        assert Path(job["outputPath"]).parent == tmp_path / "X"
    finally:
        client.patch("/api/settings", json=original)


def test_create_download_rejects_playlist() -> None:
    response = client.post(
        "/api/downloads",
        json={
            "url": "https://www.youtube.com/playlist?list=PL123",
            "quality": "best",
            "downloadType": "video",
            "audioFormat": None,
        },
    )

    assert response.status_code == 400
    assert response.json() == {
        "detail": "Playlist downloads are currently only available for YouTube."
    }


def test_build_ytdlp_args_uses_argument_array() -> None:
    original = client.get("/api/settings").json()
    try:
        response = client.patch(
            "/api/settings",
            json={"filenameTemplate": "{title}-{id}-{quality}"},
        )
        assert response.status_code == 200

        job = DownloadJob(
            url="https://www.youtube.com/watch?v=abc123",
            title="Bad/File:Name?",
            selected_quality="audio_mp3",
            audio_format="mp3",
        )

        args = build_ytdlp_args(job)

        assert isinstance(args, list)
        assert args[0] == "yt-dlp"
        assert "--add-header" in args
        assert "--extract-audio" in args
        assert "--audio-format" in args
        assert "--no-simulate" in args
        assert "--progress" in args
        assert "--newline" in args
        assert any("Bad File Name-%(id)s-audio_mp3.%(ext)s" in item for item in args)
    finally:
        client.patch("/api/settings", json=original)


def test_build_ytdlp_args_uses_active_settings(tmp_path: Path) -> None:
    original = client.get("/api/settings").json()
    try:
        response = client.patch(
            "/api/settings",
            json={
                "downloadFolder": str(tmp_path),
                "filenameTemplate": "{title}-{platform}-{quality}-{id}",
            },
        )
        assert response.status_code == 200

        job = DownloadJob(
            url="https://www.youtube.com/watch?v=abc123",
            title="Example/Video",
            selected_quality="720p",
        )
        args = build_ytdlp_args(job)

        assert any(str(tmp_path) in arg for arg in args)
        assert any("Example Video-youtube-720p-%(id)s.%(ext)s" in item for item in args)
        assert "--no-overwrites" in args
    finally:
        client.patch("/api/settings", json=original)


def test_build_ytdlp_args_for_image_download_omits_video_formatting() -> None:
    job = DownloadJob(
        url="https://www.instagram.com/p/IMG123/",
        platform="instagram",
        media_type="image",
        title="Example Image",
        selected_quality="image_original",
    )

    args = build_ytdlp_args(job)

    assert "--format" not in args
    assert "--merge-output-format" not in args
    assert "--extract-audio" not in args
    assert "--no-playlist" in args


def test_build_ytdlp_args_for_x_image_download_writes_jpg_thumbnail() -> None:
    job = DownloadJob(
        url="https://x.com/creator/status/123",
        platform="x",
        media_type="image",
        title="Example Image",
        selected_quality="image_original",
    )

    args = build_ytdlp_args(job)

    assert "--write-thumbnail" in args
    assert "--skip-download" in args
    assert "--convert-thumbnails" in args
    assert "jpg" in args
    assert "--format" not in args
    assert "--merge-output-format" not in args
    assert "--no-playlist" in args
    assert any("/images/" in item for item in args)


def test_build_ytdlp_args_for_x_video_download_uses_video_formatting() -> None:
    job = DownloadJob(
        url="https://x.com/creator/status/123",
        platform="x",
        media_type="video",
        title="Example Video",
        selected_quality="720p",
    )

    args = build_ytdlp_args(job)

    assert "--format" in args
    assert "--merge-output-format" in args
    assert "--write-thumbnail" not in args
    assert not any("/images/" in item for item in args)


def test_build_ytdlp_args_for_gallery_download_uses_folder() -> None:
    job = DownloadJob(
        url="https://x.com/creator/status/123",
        platform="x",
        media_type="gallery",
        title="Example Gallery",
        selected_quality="image_original",
    )

    args = build_ytdlp_args(job)

    assert "--yes-playlist" in args
    assert "--no-playlist" not in args
    assert any("images/Example Gallery" in item for item in args)


def test_download_progress_output_updates_metrics() -> None:
    release = threading.Event()
    fake_process = FakeProcess(
        stdout="[download]  52.4% of 20.00MiB at 1.20MiB/s ETA 00:08\n",
        returncode=None,
        release=release,
    )

    with (
        patch(
            "app.platforms.youtube.subprocess.run",
            return_value=_completed_process(_video_metadata()),
        ),
        patch(
            "app.services.download_service.subprocess.Popen",
            return_value=fake_process,
        ),
    ):
        response = client.post(
            "/api/downloads",
            json={
                "url": "https://www.youtube.com/watch?v=abc123",
                "quality": "best",
                "downloadType": "video",
                "audioFormat": None,
            },
        )
        assert response.status_code == 200
        job_id = cast(str, response.json()["id"])
        job = _wait_for_progress(job_id, 52)

        cancel_response = client.post(f"/api/downloads/{job_id}/cancel")

    assert job["status"] == "downloading"
    assert job["progress"] == 52
    assert job["speed"] == "1.20MiB/s"
    assert job["eta"] == "00:08"
    assert job["progressStatus"] == "downloading"
    assert cancel_response.status_code == 200
    release.set()


def test_failed_download_updates_status_with_friendly_error() -> None:
    with (
        patch(
            "app.platforms.youtube.subprocess.run",
            return_value=_completed_process(_video_metadata()),
        ),
        patch(
            "app.services.download_service.subprocess.Popen",
            return_value=_fake_process(
                returncode=1,
                stderr="ERROR: requested format is not available",
            ),
        ),
    ):
        response = client.post(
            "/api/downloads",
            json={
                "url": "https://www.youtube.com/watch?v=abc123",
                "quality": "1080p",
                "downloadType": "video",
                "audioFormat": None,
            },
        )

        assert response.status_code == 200
        job_id = cast(str, response.json()["id"])
        job = _wait_for_status(job_id, "failed")

    assert job["errorMessage"] == "Selected quality is not available for this media."
    history_response = client.get(
        "/api/history",
        params={"query": "Example Video", "status": "failed", "limit": 10},
    )
    assert history_response.status_code == 200
    history_items = history_response.json()["items"]
    assert any(
        item["jobId"] == job_id
        and item["errorMessage"] == "Selected quality is not available for this media."
        for item in history_items
    )


def test_skip_existing_rejects_completed_duplicate(tmp_path: Path) -> None:
    existing_path = tmp_path / "existing.mp4"
    existing_path.write_text("video", encoding="utf-8")
    original = client.get("/api/settings").json()

    with Session(engine) as session:
        item = DownloadHistoryItem(
            job_id="existing-job",
            url="https://www.youtube.com/watch?v=abc123",
            title="Example Video",
            selected_quality="best",
            status=DownloadStatus.COMPLETED.value,
            output_path=str(existing_path),
            download_folder=str(tmp_path),
        )
        session.add(item)
        session.commit()

    try:
        settings_response = client.patch(
            "/api/settings",
            json={"downloadFolder": str(tmp_path), "skipExisting": True},
        )
        assert settings_response.status_code == 200

        with patch(
            "app.platforms.youtube.subprocess.run",
            return_value=_completed_process(_video_metadata()),
        ):
            response = client.post(
                "/api/downloads",
                json={
                    "url": "https://www.youtube.com/watch?v=abc123",
                    "quality": "best",
                    "downloadType": "video",
                    "audioFormat": None,
                },
            )

        assert response.status_code == 400
        assert response.json()["detail"].startswith("This download already exists")
    finally:
        client.patch("/api/settings", json=original)


def test_cancel_active_download_marks_job_cancelled() -> None:
    release = threading.Event()
    fake_process = _blocking_process(release)

    with (
        patch(
            "app.platforms.youtube.subprocess.run",
            return_value=_completed_process(_video_metadata()),
        ),
        patch(
            "app.services.download_service.subprocess.Popen",
            return_value=fake_process,
        ),
    ):
        response = client.post(
            "/api/downloads",
            json={
                "url": "https://www.youtube.com/watch?v=abc123",
                "quality": "best",
                "downloadType": "video",
                "audioFormat": None,
            },
        )
        assert response.status_code == 200
        job_id = cast(str, response.json()["id"])
        _wait_for_status(job_id, "downloading")

        cancel_response = client.post(f"/api/downloads/{job_id}/cancel")

    assert cancel_response.status_code == 200
    assert cancel_response.json()["status"] == "cancelled"
    assert fake_process.terminated is True
    release.set()


def test_retry_failed_download_returns_job_to_pending() -> None:
    with patch("app.services.download_service._executor.submit"):
        job_id = _create_failed_job()
        response = client.post(f"/api/downloads/{job_id}/retry")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "pending"
    assert body["errorMessage"] is None
    assert body["completedAt"] is None


def _wait_for_status(job_id: str, status: str, timeout: float = 2.0) -> dict[str, Any]:
    deadline = time.monotonic() + timeout
    last_body: dict[str, Any] | None = None

    while time.monotonic() < deadline:
        response = client.get(f"/api/downloads/{job_id}")
        assert response.status_code == 200
        last_body = cast(dict[str, Any], response.json())
        if last_body["status"] == status:
            return last_body
        time.sleep(0.02)

    raise AssertionError(f"Job did not reach {status}. Last body: {last_body}")


def _wait_for_progress(
    job_id: str, progress: int, timeout: float = 2.0
) -> dict[str, Any]:
    deadline = time.monotonic() + timeout
    last_body: dict[str, Any] | None = None

    while time.monotonic() < deadline:
        response = client.get(f"/api/downloads/{job_id}")
        assert response.status_code == 200
        last_body = cast(dict[str, Any], response.json())
        if last_body["progress"] >= progress:
            return last_body
        time.sleep(0.02)

    raise AssertionError(f"Job did not reach {progress}%. Last body: {last_body}")


def _create_failed_job() -> str:
    with Session(engine) as session:
        job = DownloadJob(
            url="https://www.youtube.com/watch?v=failed",
            title="Failed Video",
            selected_quality="best",
            status=DownloadStatus.FAILED.value,
            error_message="Download failed.",
        )
        session.add(job)
        session.commit()
        session.refresh(job)
        return job.id


def _download_folder() -> Path:
    with Session(engine) as session:
        return Path(get_app_settings(session).download_folder)


def _completed_process(payload: dict[str, Any]) -> subprocess.CompletedProcess[str]:
    return subprocess.CompletedProcess(
        args=["yt-dlp"],
        returncode=0,
        stdout=json.dumps(payload),
        stderr="",
    )


def _video_metadata(
    webpage_url: str = "https://www.youtube.com/watch?v=abc123",
) -> dict[str, Any]:
    return {
        "title": "Example Video",
        "thumbnail": "https://img.youtube.com/example.jpg",
        "duration": 615,
        "uploader": "Example Channel",
        "webpage_url": webpage_url,
        "formats": [
            {
                "format_id": "137",
                "ext": "mp4",
                "height": 1080,
                "vcodec": "avc1",
                "acodec": "none",
            },
            {
                "format_id": "136",
                "ext": "mp4",
                "height": 720,
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


def _image_metadata(
    webpage_url: str = "https://www.instagram.com/p/IMG123/",
) -> dict[str, Any]:
    return {
        "title": "Example Image",
        "thumbnail": "https://cdn.example/image-preview.jpg",
        "webpage_url": webpage_url,
        "id": "img123",
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


def _gallery_metadata() -> dict[str, Any]:
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


class FakeImageResponse:
    def __init__(self, content: bytes) -> None:
        self.content = content

    def __enter__(self) -> "FakeImageResponse":
        return self

    def __exit__(self, *_args: object) -> None:
        return None

    def read(self, _size: int) -> bytes:
        return self.content

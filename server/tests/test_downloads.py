import json
import subprocess
import threading
import time
from typing import Any, cast
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.db.models import DownloadJob, DownloadStatus
from app.main import app
from app.services.download_service import build_ytdlp_args

client = TestClient(app)


def test_create_download_job_completes_successfully() -> None:
    output_path = get_settings().download_root / "Example Video-abc123.mp4"

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
    assert popen.call_args is not None
    assert "shell" not in popen.call_args.kwargs


def test_create_download_rejects_unsupported_platform() -> None:
    response = client.post(
        "/api/downloads",
        json={
            "url": "https://vimeo.com/123",
            "quality": "best",
            "downloadType": "video",
            "audioFormat": None,
        },
    )

    assert response.status_code == 400
    assert response.json() == {
        "detail": "Only YouTube links are supported in this version."
    }


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
    assert response.json() == {"detail": "Playlist downloads are not available in Phase 3."}


def test_build_ytdlp_args_uses_argument_array() -> None:
    job = DownloadJob(
        url="https://www.youtube.com/watch?v=abc123",
        title='Bad/File:Name?',
        selected_quality="audio_mp3",
        audio_format="mp3",
    )

    args = build_ytdlp_args(job)

    assert isinstance(args, list)
    assert args[0] == "yt-dlp"
    assert "--extract-audio" in args
    assert "--audio-format" in args
    assert "--no-simulate" in args
    assert "--progress" in args
    assert "--newline" in args
    assert any("Bad File Name-%(id)s.%(ext)s" in item for item in args)


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


def _wait_for_status(
    job_id: str, status: str, timeout: float = 2.0
) -> dict[str, Any]:
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
    from sqlmodel import Session

    from app.db.database import engine

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


def _completed_process(payload: dict[str, Any]) -> subprocess.CompletedProcess[str]:
    return subprocess.CompletedProcess(
        args=["yt-dlp"],
        returncode=0,
        stdout=json.dumps(payload),
        stderr="",
    )


def _video_metadata() -> dict[str, Any]:
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

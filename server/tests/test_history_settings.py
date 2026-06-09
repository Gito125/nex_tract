from pathlib import Path
from uuid import uuid4
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.db.database import engine
from app.db.models import DownloadHistoryItem, DownloadStatus
from app.main import app

client = TestClient(app)


def test_settings_get_returns_persisted_preferences() -> None:
    response = client.get("/api/settings")

    assert response.status_code == 200
    body = response.json()
    assert body["downloadFolder"]
    assert body["defaultQuality"] in {"best", "1080p", "720p", "480p", "360p", "audio"}
    assert body["defaultAudioFormat"] in {"m4a", "mp3", "opus"}
    assert body["theme"] in {"system", "light", "dark"}
    assert body["filenameTemplate"]
    assert isinstance(body["skipExisting"], bool)


def test_settings_patch_validates_and_persists(tmp_path: Path) -> None:
    original = client.get("/api/settings").json()
    try:
        response = client.patch(
            "/api/settings",
            json={
                "downloadFolder": str(tmp_path),
                "defaultQuality": "audio",
                "defaultAudioFormat": "mp3",
                "theme": "light",
                "filenameTemplate": "{title}-{quality}-{id}",
                "skipExisting": True,
            },
        )

        assert response.status_code == 200
        body = response.json()
        assert body["downloadFolder"] == str(tmp_path)
        assert body["defaultQuality"] == "audio"
        assert body["defaultAudioFormat"] == "mp3"
        assert body["theme"] == "light"
        assert body["filenameTemplate"] == "{title}-{quality}-{id}"
        assert body["skipExisting"] is True

        followup = client.get("/api/settings")
        assert followup.status_code == 200
        assert followup.json()["downloadFolder"] == str(tmp_path)
    finally:
        client.patch("/api/settings", json=original)


def test_history_search_status_and_pagination() -> None:
    marker = f"Unique History Marker {uuid4()}"
    with Session(engine) as session:
        session.add(
            DownloadHistoryItem(
                job_id="history-search-1",
                url="https://www.youtube.com/watch?v=history1",
                title=f"{marker} completed",
                selected_quality="best",
                status=DownloadStatus.COMPLETED.value,
            )
        )
        session.add(
            DownloadHistoryItem(
                job_id="history-search-2",
                url="https://www.youtube.com/watch?v=history2",
                title=f"{marker} failed",
                selected_quality="720p",
                status=DownloadStatus.FAILED.value,
                error_message="Download failed.",
            )
        )
        session.commit()

    response = client.get(
        "/api/history",
        params={"query": marker, "status": "failed", "limit": 1, "offset": 0},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["limit"] == 1
    assert body["offset"] == 0
    assert body["items"][0]["status"] == "failed"
    assert marker in body["items"][0]["title"]


def test_redownload_history_item_creates_download_job() -> None:
    with Session(engine) as session:
        item = DownloadHistoryItem(
            job_id="redownload-source",
            url="https://www.youtube.com/watch?v=abc123",
            title="Redownload Source",
            selected_quality="best",
            status=DownloadStatus.COMPLETED.value,
        )
        session.add(item)
        session.commit()
        session.refresh(item)
        history_id = item.id

    with (
        patch("app.services.download_service._executor.submit"),
        patch(
            "app.platforms.youtube.subprocess.run",
            return_value=_completed_process(),
        ),
    ):
        response = client.post(f"/api/history/{history_id}/redownload")

    assert response.status_code == 200
    body = response.json()
    assert body["url"] == "https://www.youtube.com/watch?v=abc123"
    assert body["selectedQuality"] == "best"
    assert body["status"] == "pending"


def test_open_history_file_rejects_missing_file(tmp_path: Path) -> None:
    with Session(engine) as session:
        item = DownloadHistoryItem(
            job_id="missing-file",
            url="https://www.youtube.com/watch?v=missing",
            title="Missing File",
            selected_quality="best",
            status=DownloadStatus.COMPLETED.value,
            output_path=str(tmp_path / "missing.mp4"),
            download_folder=str(tmp_path),
        )
        session.add(item)
        session.commit()
        session.refresh(item)
        history_id = item.id

    response = client.post(f"/api/history/{history_id}/open-file")

    assert response.status_code == 404
    assert response.json()["detail"] == "Saved file was not found on disk."


def test_open_history_file_rejects_path_outside_download_folder(tmp_path: Path) -> None:
    download_folder = tmp_path / "downloads"
    download_folder.mkdir()
    outside_file = tmp_path / "outside.mp4"
    outside_file.write_text("video", encoding="utf-8")

    with Session(engine) as session:
        item = DownloadHistoryItem(
            job_id="outside-file",
            url="https://www.youtube.com/watch?v=outside",
            title="Outside File",
            selected_quality="best",
            status=DownloadStatus.COMPLETED.value,
            output_path=str(outside_file),
            download_folder=str(download_folder),
        )
        session.add(item)
        session.commit()
        session.refresh(item)
        history_id = item.id

    response = client.post(f"/api/history/{history_id}/open-file")

    assert response.status_code == 400
    assert response.json()["detail"] == "Saved file path is outside the download folder."


def _completed_process():
    import json
    import subprocess

    payload = {
        "title": "Example Video",
        "thumbnail": "https://img.youtube.com/example.jpg",
        "duration": 615,
        "uploader": "Example Channel",
        "webpage_url": "https://www.youtube.com/watch?v=abc123",
        "formats": [
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
        ],
    }
    return subprocess.CompletedProcess(
        args=["yt-dlp"],
        returncode=0,
        stdout=json.dumps(payload),
        stderr="",
    )

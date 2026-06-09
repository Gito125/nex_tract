import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import cast

from sqlalchemy import func, or_
from sqlmodel import Session, col, select

from app.db.models import (
    DownloadHistoryItem,
    DownloadJob,
    DownloadStatus,
    Playlist,
    PlaylistItem,
    PlaylistItemStatus,
)
from app.schemas.download import (
    AudioFormat,
    DownloadCreateRequest,
    DownloadJobResponse,
    QualityValue,
)
from app.schemas.history import (
    HistoryActionResponse,
    HistoryItemResponse,
    HistoryListResponse,
    HistoryStatusValue,
)
from app.services.exceptions import HistoryError
from app.services.settings_service import default_download_folder, get_app_settings

HISTORY_STATUSES = {
    DownloadStatus.COMPLETED.value,
    DownloadStatus.FAILED.value,
}


def record_download_history(job: DownloadJob, session: Session) -> None:
    if job.status not in HISTORY_STATUSES:
        return

    app_settings = get_app_settings(session)
    completed_at = job.completed_at or job.updated_at

    item = DownloadHistoryItem(
        job_id=job.id,
        url=job.url,
        platform=job.platform,
        media_type=job.media_type,
        title=job.title,
        thumbnail=job.thumbnail,
        duration=job.duration,
        selected_quality=job.selected_quality,
        audio_format=job.audio_format,
        status=job.status,
        output_path=job.output_path,
        download_folder=app_settings.download_folder,
        file_size=job.file_size,
        error_message=job.error_message,
        created_at=job.created_at,
        updated_at=job.updated_at,
        completed_at=completed_at,
    )
    session.add(item)


def record_playlist_item_history(
    playlist: Playlist,
    item: PlaylistItem,
    session: Session,
) -> None:
    if item.status not in {
        PlaylistItemStatus.COMPLETED.value,
        PlaylistItemStatus.FAILED.value,
    }:
        return

    item_history = DownloadHistoryItem(
        job_id=item.id,
        url=item.url,
        platform=playlist.platform,
        media_type="video",
        title=item.title,
        thumbnail=item.thumbnail,
        duration=item.duration,
        selected_quality=playlist.selected_quality,
        audio_format=playlist.audio_format,
        status=(
            DownloadStatus.COMPLETED.value
            if item.status == PlaylistItemStatus.COMPLETED.value
            else DownloadStatus.FAILED.value
        ),
        output_path=item.output_path,
        download_folder=playlist.output_path,
        file_size=item.file_size,
        error_message=item.error_message,
        created_at=item.created_at,
        updated_at=item.updated_at,
        completed_at=item.completed_at or item.updated_at,
    )
    session.add(item_history)


def list_history_items(
    *,
    query: str | None,
    status: HistoryStatusValue | None,
    from_date: datetime | None,
    to_date: datetime | None,
    limit: int,
    offset: int,
    session: Session,
) -> HistoryListResponse:
    filters = []

    if query:
        pattern = f"%{query.strip()}%"
        filters.append(
            or_(
                col(DownloadHistoryItem.title).ilike(pattern),
                col(DownloadHistoryItem.url).ilike(pattern),
            )
        )
    if status:
        filters.append(DownloadHistoryItem.status == status)
    if from_date:
        filters.append(DownloadHistoryItem.completed_at >= from_date)
    if to_date:
        filters.append(DownloadHistoryItem.completed_at <= to_date)

    statement = select(DownloadHistoryItem)
    count_statement = select(func.count()).select_from(DownloadHistoryItem)
    for item_filter in filters:
        statement = statement.where(item_filter)
        count_statement = count_statement.where(item_filter)

    statement = statement.order_by(col(DownloadHistoryItem.completed_at).desc())
    statement = statement.offset(offset).limit(limit)

    total = session.exec(count_statement).one()
    items = session.exec(statement).all()

    return HistoryListResponse(
        items=[history_to_response(item) for item in items],
        total=total,
        limit=limit,
        offset=offset,
    )


def redownload_history_item(
    history_id: str,
    session: Session,
) -> DownloadJobResponse:
    item = _get_history_item_or_raise(history_id, session)
    request = DownloadCreateRequest(
        url=item.url,
        quality=cast(QualityValue, item.selected_quality),
        downloadType="audio" if item.selected_quality.startswith("audio_") else "video",
        audioFormat=cast(AudioFormat | None, item.audio_format),
    )

    from app.services.download_service import create_download_job

    return create_download_job(request, session)


def open_history_file(
    history_id: str,
    session: Session,
) -> HistoryActionResponse:
    item = _get_history_item_or_raise(history_id, session)
    target = _validated_output_path(item)
    _open_path(target)
    return HistoryActionResponse(message="Opened file.")


def open_history_folder(
    history_id: str,
    session: Session,
) -> HistoryActionResponse:
    item = _get_history_item_or_raise(history_id, session)
    target = _validated_output_path(item).parent
    _open_path(target)
    return HistoryActionResponse(message="Opened folder.")


def history_to_response(item: DownloadHistoryItem) -> HistoryItemResponse:
    return HistoryItemResponse(
        id=item.id,
        jobId=item.job_id,
        url=item.url,
        platform="youtube",
        mediaType="video",
        title=item.title,
        thumbnail=item.thumbnail,
        duration=item.duration,
        selectedQuality=cast(QualityValue, item.selected_quality),
        audioFormat=cast(AudioFormat | None, item.audio_format),
        status=cast(HistoryStatusValue, item.status),
        outputPath=item.output_path,
        downloadFolder=item.download_folder,
        fileSize=item.file_size,
        errorMessage=item.error_message,
        createdAt=item.created_at,
        updatedAt=item.updated_at,
        completedAt=item.completed_at,
    )


def completed_history_exists(
    *,
    url: str,
    selected_quality: str,
    audio_format: str | None,
    session: Session,
) -> bool:
    statement = (
        select(DownloadHistoryItem)
        .where(DownloadHistoryItem.url == url)
        .where(DownloadHistoryItem.selected_quality == selected_quality)
        .where(DownloadHistoryItem.audio_format == audio_format)
        .where(DownloadHistoryItem.status == DownloadStatus.COMPLETED.value)
        .order_by(col(DownloadHistoryItem.completed_at).desc())
    )

    for item in session.exec(statement).all():
        if item.output_path and Path(item.output_path).exists():
            return True

    return False


def _get_history_item_or_raise(
    history_id: str,
    session: Session,
) -> DownloadHistoryItem:
    item = session.get(DownloadHistoryItem, history_id)
    if not item:
        raise HistoryError("History item was not found.", status_code=404)
    return item


def _validated_output_path(item: DownloadHistoryItem) -> Path:
    if not item.output_path:
        raise HistoryError("No saved file path is available for this history item.")

    base_folder = Path(item.download_folder or default_download_folder()).resolve()
    output_path = Path(item.output_path).resolve()

    try:
        output_path.relative_to(base_folder)
    except ValueError as exc:
        raise HistoryError("Saved file path is outside the download folder.") from exc

    if not output_path.exists():
        raise HistoryError("Saved file was not found on disk.", status_code=404)

    return output_path


def _open_path(path: Path) -> None:
    try:
        if sys.platform == "darwin":
            subprocess.Popen(["open", str(path)])
        elif sys.platform.startswith("linux"):
            subprocess.Popen(["xdg-open", str(path)])
        elif sys.platform.startswith("win"):
            os.startfile(path)  # type: ignore[attr-defined]
        else:
            raise HistoryError("Opening files is not supported on this platform.")
    except HistoryError:
        raise
    except OSError as exc:
        raise HistoryError("Could not open that path on this machine.") from exc

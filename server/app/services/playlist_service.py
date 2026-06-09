import asyncio
import json
import logging
import subprocess
import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, AsyncIterator, Iterator, cast

from sqlmodel import Session, col, select

from app.db.database import engine
from app.db.models import Playlist, PlaylistItem, PlaylistItemStatus, PlaylistStatus
from app.schemas.analyze import PlaylistAnalyzeItem
from app.schemas.download import AudioFormat, DownloadType, QualityValue
from app.schemas.playlist import (
    PlaylistCreateRequest,
    PlaylistItemResponse,
    PlaylistItemStatusValue,
    PlaylistResponse,
    PlaylistStatusValue,
)
from app.services.analyze_service import analyze_url
from app.services.download_service import AUDIO_QUALITY_FORMATS, QUALITY_FORMATS
from app.services.exceptions import AnalyzeError, PlaylistError
from app.services.history_service import (
    completed_history_exists,
    record_playlist_item_history,
)
from app.services.settings_service import get_app_settings
from app.utils.filename import sanitize_filename
from app.utils.platform_detector import PlatformValidationError, detect_platform
from app.utils.progress_parser import ProgressUpdate, parse_ytdlp_progress_line

logger = logging.getLogger(__name__)

TERMINAL_PLAYLIST_STATUSES = {
    PlaylistStatus.COMPLETED.value,
    PlaylistStatus.FAILED.value,
    PlaylistStatus.CANCELLED.value,
}
TERMINAL_ITEM_STATUSES = {
    PlaylistItemStatus.COMPLETED.value,
    PlaylistItemStatus.FAILED.value,
    PlaylistItemStatus.SKIPPED.value,
    PlaylistItemStatus.CANCELLED.value,
}

_executor = ThreadPoolExecutor(max_workers=1)
_process_lock = threading.Lock()
_active_processes: dict[str, subprocess.Popen[str]] = {}


def create_playlist_download(
    request: PlaylistCreateRequest,
    session: Session,
) -> PlaylistResponse:
    _validate_download_shape(request.quality, request.download_type, request.audio_format)

    try:
        platform = detect_platform(request.url)
    except PlatformValidationError as exc:
        raise PlaylistError(exc.message, status_code=400) from exc

    if platform.platform != "youtube":
        raise PlaylistError("Only YouTube links are supported in this version.")
    if platform.media_type != "playlist":
        raise PlaylistError("Paste a YouTube playlist link to start a playlist download.")

    try:
        analysis = analyze_url(platform.url)
    except AnalyzeError as exc:
        raise PlaylistError(exc.message, status_code=exc.status_code) from exc

    if analysis.type != "playlist" or analysis.playlist is None:
        raise PlaylistError("This link did not return playlist details.")

    source_items = analysis.playlist.items
    selected_items = _selected_items(source_items, request)
    app_settings = get_app_settings(session)
    skip_existing = (
        request.skip_existing
        if request.skip_existing is not None
        else app_settings.skip_existing
    )
    playlist_folder = Path(app_settings.download_folder).resolve() / sanitize_filename(
        analysis.title,
        fallback="YouTube Playlist",
    )
    playlist_folder.mkdir(parents=True, exist_ok=True)

    playlist = Playlist(
        url=analysis.webpage_url,
        platform="youtube",
        title=analysis.title,
        thumbnail=analysis.thumbnail,
        total_items=len(selected_items),
        selected_quality=request.quality,
        audio_format=request.audio_format,
        skip_existing=skip_existing,
        output_path=str(playlist_folder),
    )
    session.add(playlist)
    session.commit()
    session.refresh(playlist)

    now = _utc_now()
    for source_item in selected_items:
        is_available = source_item.available and bool(source_item.url)
        item = PlaylistItem(
            playlist_id=playlist.id,
            url=source_item.url,
            title=source_item.title,
            thumbnail=source_item.thumbnail,
            duration=source_item.duration,
            item_index=source_item.index,
            status=(
                PlaylistItemStatus.QUEUED.value
                if is_available
                else PlaylistItemStatus.FAILED.value
            ),
            error_message=None if is_available else source_item.error_message,
            completed_at=None if is_available else now,
            updated_at=now,
        )
        session.add(item)

    session.commit()
    _sync_playlist_counts(playlist.id, session)
    playlist = _get_playlist_or_raise(playlist.id, session)

    logger.info("Created playlist download %s", playlist.id)
    _executor.submit(_run_playlist_download, playlist.id)
    return playlist_to_response(playlist, session)


def get_playlist(playlist_id: str, session: Session) -> PlaylistResponse:
    return playlist_to_response(_get_playlist_or_raise(playlist_id, session), session)


async def stream_playlist_events(playlist_id: str) -> AsyncIterator[str]:
    last_payload: dict[str, Any] | None = None

    while True:
        with Session(engine) as session:
            playlist = session.get(Playlist, playlist_id)
            if not playlist:
                break

            response = playlist_to_response(playlist, session)
            payload = response.model_dump(mode="json", by_alias=True)
            is_terminal = playlist.status in TERMINAL_PLAYLIST_STATUSES

        if payload != last_payload:
            yield f"data: {json.dumps(payload)}\n\n"
            last_payload = payload

        if is_terminal:
            break

        await asyncio.sleep(0.5)


def cancel_playlist_download(
    playlist_id: str,
    session: Session,
) -> PlaylistResponse:
    playlist = _get_playlist_or_raise(playlist_id, session)

    if playlist.status in TERMINAL_PLAYLIST_STATUSES:
        return playlist_to_response(playlist, session)

    now = _utc_now()
    playlist.status = PlaylistStatus.CANCELLED.value
    playlist.progress = _playlist_progress(playlist)
    playlist.speed = None
    playlist.eta = None
    playlist.error_message = "Playlist download cancelled."
    playlist.updated_at = now
    playlist.completed_at = now
    session.add(playlist)

    for item in _playlist_items(playlist.id, session):
        if item.status not in TERMINAL_ITEM_STATUSES:
            item.status = PlaylistItemStatus.CANCELLED.value
            item.progress_status = "cancelled"
            item.speed = None
            item.eta = None
            item.error_message = "Playlist download cancelled."
            item.updated_at = now
            item.completed_at = now
            session.add(item)

    session.commit()
    _sync_playlist_counts(playlist.id, session)

    with _process_lock:
        process = _active_processes.get(playlist_id)

    if process and process.poll() is None:
        process.terminate()

    logger.info("Cancelled playlist download %s", playlist_id)
    return playlist_to_response(_get_playlist_or_raise(playlist_id, session), session)


def build_playlist_item_ytdlp_args(
    playlist: Playlist,
    item: PlaylistItem,
) -> list[str]:
    output_folder = Path(playlist.output_path or "").resolve()
    q = cast(QualityValue, playlist.selected_quality)
    prefix = f"{item.item_index:03d} - {sanitize_filename(item.title)}"
    output_template = output_folder / f"{prefix}.%(ext)s"

    args = [
        "yt-dlp",
        "--no-playlist",
        "--no-warnings",
        "--no-simulate",
        "--no-overwrites",
        "--progress",
        "--newline",
        "--paths",
        str(output_folder),
        "--output",
        str(output_template),
        "--format",
        QUALITY_FORMATS[q],
        "--print",
        "after_move:filepath",
    ]

    if q in AUDIO_QUALITY_FORMATS:
        args.extend(["--extract-audio", "--audio-format", playlist.audio_format or "m4a"])
    else:
        args.extend(["--merge-output-format", "mp4"])

    args.append(item.url)
    return args


def playlist_to_response(playlist: Playlist, session: Session) -> PlaylistResponse:
    return PlaylistResponse(
        id=playlist.id,
        url=playlist.url,
        platform="youtube",
        title=playlist.title,
        thumbnail=playlist.thumbnail,
        totalItems=playlist.total_items,
        completedItems=playlist.completed_items,
        failedItems=playlist.failed_items,
        skippedItems=playlist.skipped_items,
        cancelledItems=playlist.cancelled_items,
        selectedQuality=cast(QualityValue, playlist.selected_quality),
        audioFormat=cast(AudioFormat | None, playlist.audio_format),
        skipExisting=playlist.skip_existing,
        status=cast(PlaylistStatusValue, playlist.status),
        progress=playlist.progress,
        currentItemIndex=playlist.current_item_index,
        currentItemTitle=playlist.current_item_title,
        currentItemProgress=playlist.current_item_progress,
        speed=playlist.speed,
        eta=playlist.eta,
        outputPath=playlist.output_path,
        errorMessage=playlist.error_message,
        items=[playlist_item_to_response(item) for item in _playlist_items(playlist.id, session)],
        createdAt=playlist.created_at,
        updatedAt=playlist.updated_at,
        completedAt=playlist.completed_at,
    )


def playlist_item_to_response(item: PlaylistItem) -> PlaylistItemResponse:
    return PlaylistItemResponse(
        id=item.id,
        playlistId=item.playlist_id,
        url=item.url,
        title=item.title,
        thumbnail=item.thumbnail,
        duration=item.duration,
        itemIndex=item.item_index,
        status=cast(PlaylistItemStatusValue, item.status),
        progress=item.progress,
        speed=item.speed,
        eta=item.eta,
        progressStatus=item.progress_status,
        outputPath=item.output_path,
        fileSize=item.file_size,
        errorMessage=item.error_message,
        createdAt=item.created_at,
        updatedAt=item.updated_at,
        completedAt=item.completed_at,
    )


def _run_playlist_download(playlist_id: str) -> None:
    with Session(engine) as session:
        playlist = session.get(Playlist, playlist_id)
        if not playlist or playlist.status != PlaylistStatus.PENDING.value:
            return

        playlist.status = PlaylistStatus.DOWNLOADING.value
        playlist.updated_at = _utc_now()
        session.add(playlist)
        session.commit()

    for item_id in _queued_item_ids(playlist_id):
        with Session(engine) as session:
            playlist = session.get(Playlist, playlist_id)
            item = session.get(PlaylistItem, item_id)
            if (
                not playlist
                or not item
                or playlist.status == PlaylistStatus.CANCELLED.value
            ):
                break

            if playlist.skip_existing and completed_history_exists(
                url=item.url,
                selected_quality=playlist.selected_quality,
                audio_format=playlist.audio_format,
                session=session,
            ):
                _mark_item_skipped(playlist, item, session)
                continue

            item.status = PlaylistItemStatus.DOWNLOADING.value
            item.progress_status = "downloading"
            item.updated_at = _utc_now()
            playlist.current_item_index = item.item_index
            playlist.current_item_title = item.title
            playlist.current_item_progress = 0
            playlist.speed = None
            playlist.eta = None
            playlist.updated_at = _utc_now()
            session.add(item)
            session.add(playlist)
            session.commit()
            args = build_playlist_item_ytdlp_args(playlist, item)

        _run_playlist_item_process(playlist_id, item_id, args)

    _finish_playlist(playlist_id)


def _run_playlist_item_process(
    playlist_id: str,
    item_id: str,
    args: list[str],
) -> None:
    try:
        process = subprocess.Popen(
            args,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
        )
    except FileNotFoundError:
        _mark_item_failed(playlist_id, item_id, "yt-dlp is not installed or is not available.")
        return
    except OSError:
        _mark_item_failed(playlist_id, item_id, "Could not start the download.")
        return

    with _process_lock:
        _active_processes[playlist_id] = process

    output = _collect_process_output(process, playlist_id, item_id)

    with _process_lock:
        _active_processes.pop(playlist_id, None)

    with Session(engine) as session:
        playlist = session.get(Playlist, playlist_id)
        item = session.get(PlaylistItem, item_id)
        if not playlist or not item:
            return

        if playlist.status == PlaylistStatus.CANCELLED.value:
            item.status = PlaylistItemStatus.CANCELLED.value
            item.progress_status = "cancelled"
            item.completed_at = _utc_now()
            item.updated_at = _utc_now()
            session.add(item)
            session.commit()
            return

        if process.returncode == 0:
            output_path = _safe_output_path(output, playlist)
            item.status = PlaylistItemStatus.COMPLETED.value
            item.progress = 100
            item.speed = None
            item.eta = None
            item.progress_status = "completed"
            item.output_path = output_path
            item.file_size = _file_size(output_path)
            item.error_message = None
            item.completed_at = _utc_now()
            logger.info("Completed playlist item %s", item_id)
        else:
            item.status = PlaylistItemStatus.FAILED.value
            item.progress_status = "failed"
            item.error_message = _friendly_ytdlp_error(output)
            item.completed_at = _utc_now()
            logger.warning("Failed playlist item %s", item_id)

        item.updated_at = _utc_now()
        session.add(item)
        record_playlist_item_history(playlist, item, session)
        session.commit()
        _sync_playlist_counts(playlist_id, session)


def _finish_playlist(playlist_id: str) -> None:
    with Session(engine) as session:
        playlist = session.get(Playlist, playlist_id)
        if not playlist or playlist.status == PlaylistStatus.CANCELLED.value:
            return

        _sync_playlist_counts(playlist_id, session)
        session.refresh(playlist)

        now = _utc_now()
        if playlist.failed_items > 0:
            playlist.status = PlaylistStatus.FAILED.value
            playlist.error_message = "One or more playlist items could not be downloaded."
        else:
            playlist.status = PlaylistStatus.COMPLETED.value
            playlist.error_message = None

        playlist.current_item_progress = None
        playlist.speed = None
        playlist.eta = None
        playlist.progress = 100
        playlist.updated_at = now
        playlist.completed_at = now
        session.add(playlist)
        session.commit()


def _selected_items(
    items: list[PlaylistAnalyzeItem],
    request: PlaylistCreateRequest,
) -> list[PlaylistAnalyzeItem]:
    if not items:
        raise PlaylistError("This playlist does not include any items.")

    if request.selected_indexes is not None and (
        request.range_start is not None or request.range_end is not None
    ):
        raise PlaylistError("Choose selected items or a range, not both.")

    item_by_index = {item.index: item for item in items}

    if request.selected_indexes is not None:
        indexes = sorted(set(request.selected_indexes))
        if not indexes:
            raise PlaylistError("Select at least one playlist item.")
    elif request.range_start is not None or request.range_end is not None:
        if request.range_start is None or request.range_end is None:
            raise PlaylistError("Enter both range start and range end.")
        if request.range_start < 1 or request.range_end < request.range_start:
            raise PlaylistError("Enter a valid playlist range.")
        indexes = list(range(request.range_start, request.range_end + 1))
    else:
        indexes = [item.index for item in items]

    missing = [index for index in indexes if index not in item_by_index]
    if missing:
        raise PlaylistError("Selected playlist items are outside the available range.")

    return [item_by_index[index] for index in indexes]


def _validate_download_shape(
    quality: QualityValue,
    download_type: DownloadType,
    audio_format: AudioFormat | None,
) -> None:
    expected_audio_format = AUDIO_QUALITY_FORMATS.get(quality)

    if expected_audio_format:
        if download_type != "audio":
            raise PlaylistError("Audio downloads must use downloadType audio.")
        if audio_format != expected_audio_format:
            raise PlaylistError("Audio format does not match the selected quality.")
        return

    if download_type != "video":
        raise PlaylistError("Video downloads must use downloadType video.")
    if audio_format is not None:
        raise PlaylistError("Video downloads cannot include an audio format.")


def _queued_item_ids(playlist_id: str) -> list[str]:
    with Session(engine) as session:
        statement = (
            select(PlaylistItem.id)
            .where(PlaylistItem.playlist_id == playlist_id)
            .where(PlaylistItem.status == PlaylistItemStatus.QUEUED.value)
            .order_by(col(PlaylistItem.item_index))
        )
        return list(session.exec(statement).all())


def _playlist_items(playlist_id: str, session: Session) -> list[PlaylistItem]:
    statement = (
        select(PlaylistItem)
        .where(PlaylistItem.playlist_id == playlist_id)
        .order_by(col(PlaylistItem.item_index))
    )
    return list(session.exec(statement).all())


def _get_playlist_or_raise(playlist_id: str, session: Session) -> Playlist:
    playlist = session.get(Playlist, playlist_id)
    if not playlist:
        raise PlaylistError("Playlist download was not found.", status_code=404)
    return playlist


def _mark_item_skipped(
    playlist: Playlist,
    item: PlaylistItem,
    session: Session,
) -> None:
    item.status = PlaylistItemStatus.SKIPPED.value
    item.progress_status = "completed"
    item.progress = 100
    item.error_message = None
    item.updated_at = _utc_now()
    item.completed_at = _utc_now()
    session.add(item)
    session.commit()
    _sync_playlist_counts(playlist.id, session)


def _mark_item_failed(playlist_id: str, item_id: str, message: str) -> None:
    with Session(engine) as session:
        playlist = session.get(Playlist, playlist_id)
        item = session.get(PlaylistItem, item_id)
        if not playlist or not item or playlist.status == PlaylistStatus.CANCELLED.value:
            return

        item.status = PlaylistItemStatus.FAILED.value
        item.progress_status = "failed"
        item.speed = None
        item.eta = None
        item.error_message = message
        item.completed_at = _utc_now()
        item.updated_at = _utc_now()
        session.add(item)
        record_playlist_item_history(playlist, item, session)
        session.commit()
        _sync_playlist_counts(playlist_id, session)


def _sync_playlist_counts(playlist_id: str, session: Session) -> None:
    playlist = session.get(Playlist, playlist_id)
    if not playlist:
        return

    items = _playlist_items(playlist_id, session)
    playlist.completed_items = sum(
        item.status == PlaylistItemStatus.COMPLETED.value for item in items
    )
    playlist.failed_items = sum(
        item.status == PlaylistItemStatus.FAILED.value for item in items
    )
    playlist.skipped_items = sum(
        item.status == PlaylistItemStatus.SKIPPED.value for item in items
    )
    playlist.cancelled_items = sum(
        item.status == PlaylistItemStatus.CANCELLED.value for item in items
    )
    playlist.progress = _playlist_progress(playlist)
    playlist.updated_at = _utc_now()
    session.add(playlist)
    session.commit()
    session.refresh(playlist)


def _playlist_progress(playlist: Playlist) -> int:
    if playlist.total_items <= 0:
        return 0
    finished = (
        playlist.completed_items
        + playlist.failed_items
        + playlist.skipped_items
        + playlist.cancelled_items
    )
    return min(100, int(finished / playlist.total_items * 100))


def _collect_process_output(
    process: subprocess.Popen[str],
    playlist_id: str,
    item_id: str,
) -> str:
    lines: list[str] = []

    for line in _iter_process_lines(process):
        lines.append(line)
        update = parse_ytdlp_progress_line(line)
        if update:
            _apply_progress_update(playlist_id, item_id, update)

    extra_output = _wait_for_process(process)
    if extra_output:
        lines.extend(extra_output.splitlines())

    return "\n".join(lines)


def _iter_process_lines(process: subprocess.Popen[str]) -> Iterator[str]:
    stream = process.stdout
    if not stream:
        return

    if isinstance(stream, str):
        for chunk in _split_progress_chunks(stream):
            yield chunk.strip()
        return

    buffer = ""
    while True:
        char = stream.read(1)
        if not char:
            break

        if char in {"\n", "\r"}:
            if buffer.strip():
                yield buffer.strip()
            buffer = ""
            continue

        buffer += char

    if buffer.strip():
        yield buffer.strip()


def _split_progress_chunks(output: str) -> list[str]:
    return [
        chunk
        for line in output.splitlines()
        for chunk in line.split("\r")
        if chunk.strip()
    ]


def _wait_for_process(process: subprocess.Popen[str]) -> str:
    wait = getattr(process, "wait", None)
    if callable(wait):
        wait()
        return ""

    communicate = getattr(process, "communicate", None)
    if callable(communicate):
        stdout, stderr = cast(tuple[str, str], communicate())
        return "\n".join(part for part in [stdout, stderr] if part)

    return ""


def _apply_progress_update(
    playlist_id: str,
    item_id: str,
    update: ProgressUpdate,
) -> None:
    with Session(engine) as session:
        playlist = session.get(Playlist, playlist_id)
        item = session.get(PlaylistItem, item_id)
        if (
            not playlist
            or not item
            or playlist.status in TERMINAL_PLAYLIST_STATUSES
            or item.status in TERMINAL_ITEM_STATUSES
        ):
            return

        if update.progress is not None:
            item.progress = max(item.progress, update.progress)
            playlist.current_item_progress = item.progress
        if update.speed is not None:
            item.speed = update.speed
            playlist.speed = update.speed
        if update.eta is not None:
            item.eta = update.eta
            playlist.eta = update.eta
        if update.status is not None:
            item.progress_status = update.status

        item.updated_at = _utc_now()
        playlist.updated_at = _utc_now()
        session.add(item)
        session.add(playlist)
        session.commit()


def _safe_output_path(stdout: str, playlist: Playlist) -> str | None:
    output_folder = Path(playlist.output_path or "").resolve()

    for line in reversed(stdout.splitlines()):
        candidate = line.strip()
        if not candidate:
            continue
        try:
            path = Path(candidate).resolve()
            path.relative_to(output_folder)
        except ValueError:
            continue
        return str(path)

    return None


def _file_size(output_path: str | None) -> int | None:
    if not output_path:
        return None

    try:
        return Path(output_path).stat().st_size
    except OSError:
        return None


def _friendly_ytdlp_error(stderr: str) -> str:
    message = stderr.lower()

    if "private" in message or "sign in" in message:
        return "This media appears to be private or restricted."
    if "unavailable" in message:
        return "This media is unavailable."
    if "requested format is not available" in message:
        return "Selected quality is not available for this media."

    return "Download failed. Please try again."


def _utc_now() -> datetime:
    return datetime.now(UTC)

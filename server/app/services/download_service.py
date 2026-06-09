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

from app.core.config import get_settings
from app.db.database import engine
from app.db.models import DownloadJob, DownloadStatus
from app.schemas.download import (
    AudioFormat,
    DownloadCreateRequest,
    DownloadJobResponse,
    DownloadStatusValue,
    ProgressStatusValue,
    QualityValue,
)
from app.services.analyze_service import analyze_url
from app.services.exceptions import AnalyzeError, DownloadError
from app.utils.filename import sanitize_filename
from app.utils.platform_detector import PlatformValidationError, detect_platform
from app.utils.progress_parser import ProgressUpdate, parse_ytdlp_progress_line

logger = logging.getLogger(__name__)

TERMINAL_STATUSES = {
    DownloadStatus.COMPLETED.value,
    DownloadStatus.FAILED.value,
    DownloadStatus.CANCELLED.value,
}

QUALITY_FORMATS: dict[QualityValue, str] = {
    "best": "bv*+ba/b",
    "1080p": "bv*[height<=1080]+ba/b[height<=1080]/best[height<=1080]",
    "720p": "bv*[height<=720]+ba/b[height<=720]/best[height<=720]",
    "480p": "bv*[height<=480]+ba/b[height<=480]/best[height<=480]",
    "360p": "bv*[height<=360]+ba/b[height<=360]/best[height<=360]",
    "audio_m4a": "ba[ext=m4a]/ba",
    "audio_mp3": "ba",
    "audio_opus": "ba[ext=opus]/ba",
}

AUDIO_QUALITY_FORMATS: dict[QualityValue, AudioFormat] = {
    "audio_m4a": "m4a",
    "audio_mp3": "mp3",
    "audio_opus": "opus",
}

_executor = ThreadPoolExecutor(max_workers=1)
_process_lock = threading.Lock()
_active_processes: dict[str, subprocess.Popen[str]] = {}


def create_download_job(
    request: DownloadCreateRequest, session: Session
) -> DownloadJobResponse:
    _validate_download_shape(request)

    try:
        platform = detect_platform(request.url)
    except PlatformValidationError as exc:
        raise DownloadError(exc.message, status_code=400) from exc

    if platform.platform != "youtube":
        raise DownloadError("Only YouTube links are supported in this version.")
    if platform.media_type == "playlist":
        raise DownloadError("Playlist downloads are not available in Phase 3.")

    try:
        analysis = analyze_url(platform.url)
    except AnalyzeError as exc:
        raise DownloadError(exc.message, status_code=exc.status_code) from exc

    available_qualities = {option.value for option in analysis.qualities}
    if request.quality not in available_qualities:
        raise DownloadError("Selected quality is not available for this media.")

    job = DownloadJob(
        url=analysis.webpage_url,
        platform="youtube",
        media_type="video",
        title=analysis.title,
        thumbnail=analysis.thumbnail,
        duration=analysis.duration,
        selected_quality=request.quality,
        audio_format=request.audio_format,
    )
    session.add(job)
    session.commit()
    session.refresh(job)

    logger.info("Created download job %s", job.id)
    _executor.submit(_run_download_job, job.id)
    return job_to_response(job)


def list_download_jobs(session: Session) -> list[DownloadJobResponse]:
    statement = select(DownloadJob).order_by(col(DownloadJob.created_at).desc())
    return [job_to_response(job) for job in session.exec(statement).all()]


def get_download_job(job_id: str, session: Session) -> DownloadJobResponse:
    return job_to_response(_get_job_or_raise(job_id, session))


async def stream_download_job_events(job_id: str) -> AsyncIterator[str]:
    last_payload: dict[str, Any] | None = None

    while True:
        with Session(engine) as session:
            job = session.get(DownloadJob, job_id)
            if not job:
                break

            response = job_to_response(job)
            payload = response.model_dump(mode="json", by_alias=True)
            is_terminal = job.status in TERMINAL_STATUSES

        if payload != last_payload:
            yield f"data: {json.dumps(payload)}\n\n"
            last_payload = payload

        if is_terminal:
            break

        await asyncio.sleep(0.5)


def cancel_download_job(job_id: str, session: Session) -> DownloadJobResponse:
    job = _get_job_or_raise(job_id, session)

    if job.status in TERMINAL_STATUSES:
        return job_to_response(job)

    now = _utc_now()
    job.status = DownloadStatus.CANCELLED.value
    job.progress_status = "cancelled"
    job.speed = None
    job.eta = None
    job.updated_at = now
    job.completed_at = now
    session.add(job)
    session.commit()
    session.refresh(job)

    with _process_lock:
        process = _active_processes.get(job_id)

    if process and process.poll() is None:
        process.terminate()

    logger.info("Cancelled download job %s", job.id)
    return job_to_response(job)


def retry_download_job(job_id: str, session: Session) -> DownloadJobResponse:
    job = _get_job_or_raise(job_id, session)

    if job.status not in {
        DownloadStatus.FAILED.value,
        DownloadStatus.CANCELLED.value,
    }:
        raise DownloadError("Only failed or cancelled jobs can be retried.")

    job.status = DownloadStatus.PENDING.value
    job.progress = 0
    job.speed = None
    job.eta = None
    job.progress_status = "queued"
    job.error_message = None
    job.output_path = None
    job.file_size = None
    job.completed_at = None
    job.updated_at = _utc_now()
    session.add(job)
    session.commit()
    session.refresh(job)

    logger.info("Retrying download job %s", job.id)
    _executor.submit(_run_download_job, job.id)
    return job_to_response(job)


def build_ytdlp_args(job: DownloadJob) -> list[str]:
    settings = get_settings()
    download_root = settings.download_root.resolve()
    safe_title = sanitize_filename(job.title)

    q = cast(QualityValue, job.selected_quality)
    output_template = download_root / f"{safe_title}-%(id)s-{q}.%(ext)s"

    args = [
        "yt-dlp",
        "--no-playlist",
        "--no-warnings",
        "--no-simulate",
        "--progress",
        "--newline",
        "--paths",
        str(download_root),
        "--output",
        str(output_template),
        "--format",
        QUALITY_FORMATS[q],
        "--print",
        "after_move:filepath",
    ]

    if q in AUDIO_QUALITY_FORMATS:
        args.extend(["--extract-audio", "--audio-format", job.audio_format or "m4a"])
    else:
        args.extend(["--merge-output-format", "mp4"])

    args.append(job.url)
    return args


def job_to_response(job: DownloadJob) -> DownloadJobResponse:
    audio_format = cast(AudioFormat | None, job.audio_format)
    selected_quality = cast(QualityValue, job.selected_quality)
    status = cast(DownloadStatusValue, job.status)
    progress_status = cast(ProgressStatusValue, job.progress_status)

    return DownloadJobResponse(
        id=job.id,
        url=job.url,
        platform="youtube",
        mediaType="video",
        title=job.title,
        thumbnail=job.thumbnail,
        duration=job.duration,
        selectedQuality=selected_quality,
        audioFormat=audio_format,
        status=status,
        progress=job.progress,
        speed=job.speed,
        eta=job.eta,
        progressStatus=progress_status,
        outputPath=job.output_path,
        fileSize=job.file_size,
        errorMessage=job.error_message,
        createdAt=job.created_at,
        updatedAt=job.updated_at,
        completedAt=job.completed_at,
    )


def _run_download_job(job_id: str) -> None:
    with Session(engine) as session:
        job = session.get(DownloadJob, job_id)
        if not job or job.status != DownloadStatus.PENDING.value:
            return

        settings = get_settings()
        settings.download_root.mkdir(parents=True, exist_ok=True)
        args = build_ytdlp_args(job)

    try:
        process = subprocess.Popen(
            args,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
        )
    except FileNotFoundError:
        _mark_failed(job_id, "yt-dlp is not installed or is not available.")
        return
    except OSError:
        _mark_failed(job_id, "Could not start the download.")
        return

    with _process_lock:
        _active_processes[job_id] = process

    with Session(engine) as session:
        job = session.get(DownloadJob, job_id)
        if not job or job.status == DownloadStatus.CANCELLED.value:
            process.terminate()
            with _process_lock:
                _active_processes.pop(job_id, None)
            return

        job.status = DownloadStatus.DOWNLOADING.value
        job.progress_status = "downloading"
        job.updated_at = _utc_now()
        session.add(job)
        session.commit()

    logger.info("Started download job %s", job_id)
    output = _collect_process_output(process, job_id)

    with _process_lock:
        _active_processes.pop(job_id, None)

    with Session(engine) as session:
        job = session.get(DownloadJob, job_id)
        if not job:
            return

        if job.status == DownloadStatus.CANCELLED.value:
            return

        if process.returncode == 0:
            output_path = _safe_output_path(output)
            job.status = DownloadStatus.COMPLETED.value
            job.progress = 100
            job.speed = None
            job.eta = None
            job.progress_status = "completed"
            job.output_path = output_path
            job.file_size = _file_size(output_path)
            job.error_message = None
            job.completed_at = _utc_now()
            logger.info("Completed download job %s", job_id)
        else:
            job.status = DownloadStatus.FAILED.value
            job.progress_status = "failed"
            job.error_message = _friendly_ytdlp_error(output)
            job.completed_at = _utc_now()
            logger.warning("Failed download job %s", job_id)

        job.updated_at = _utc_now()
        session.add(job)
        session.commit()


def _collect_process_output(process: subprocess.Popen[str], job_id: str) -> str:
    lines: list[str] = []

    for line in _iter_process_lines(process):
        lines.append(line)
        update = parse_ytdlp_progress_line(line)
        if update:
            _apply_progress_update(job_id, update)

    extra_output = _wait_for_process(process)
    if extra_output:
        lines.extend(extra_output.splitlines())

    return "\n".join(lines)


def _iter_process_lines(process: subprocess.Popen[str]) -> Iterator[str]:
    stream = process.stdout
    if not stream:
        return

    if isinstance(stream, str):
        for line in _split_progress_chunks(stream):
            yield line.strip()
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


def _apply_progress_update(job_id: str, update: ProgressUpdate) -> None:
    with Session(engine) as session:
        job = session.get(DownloadJob, job_id)
        if not job or job.status in TERMINAL_STATUSES:
            return

        if update.progress is not None:
            job.progress = max(job.progress, update.progress)
        if update.speed is not None:
            job.speed = update.speed
        if update.eta is not None:
            job.eta = update.eta
        if update.status is not None:
            job.progress_status = update.status

        job.updated_at = _utc_now()
        session.add(job)
        session.commit()


def _validate_download_shape(request: DownloadCreateRequest) -> None:
    expected_audio_format = AUDIO_QUALITY_FORMATS.get(request.quality)

    if expected_audio_format:
        if request.download_type != "audio":
            raise DownloadError("Audio downloads must use downloadType audio.")
        if request.audio_format != expected_audio_format:
            raise DownloadError("Audio format does not match the selected quality.")
        return

    if request.download_type != "video":
        raise DownloadError("Video downloads must use downloadType video.")
    if request.audio_format is not None:
        raise DownloadError("Video downloads cannot include an audio format.")


def _get_job_or_raise(job_id: str, session: Session) -> DownloadJob:
    job = session.get(DownloadJob, job_id)
    if not job:
        raise DownloadError("Download job was not found.", status_code=404)
    return job


def _mark_failed(job_id: str, message: str) -> None:
    with Session(engine) as session:
        job = session.get(DownloadJob, job_id)
        if not job or job.status == DownloadStatus.CANCELLED.value:
            return
        job.status = DownloadStatus.FAILED.value
        job.progress_status = "failed"
        job.speed = None
        job.eta = None
        job.error_message = message
        job.completed_at = _utc_now()
        job.updated_at = _utc_now()
        session.add(job)
        session.commit()


def _friendly_ytdlp_error(stderr: str) -> str:
    message = stderr.lower()

    if "private" in message or "sign in" in message:
        return "This media appears to be private or restricted."
    if "unavailable" in message:
        return "This media is unavailable."
    if "requested format is not available" in message:
        return "Selected quality is not available for this media."

    return "Download failed. Please try again."


def _safe_output_path(stdout: str) -> str | None:
    settings = get_settings()
    download_root = settings.download_root.resolve()

    for line in reversed(stdout.splitlines()):
        candidate = line.strip()
        if not candidate:
            continue
        try:
            path = Path(candidate).resolve()
            path.relative_to(download_root)
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


def _utc_now() -> datetime:
    return datetime.now(UTC)

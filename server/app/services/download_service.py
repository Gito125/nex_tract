import asyncio
import json
import logging
import subprocess
import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, AsyncIterator, Iterator, cast
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from sqlmodel import Session, col, select

from app.db.database import engine
from app.db.models import AppSettings, DownloadJob, DownloadStatus
from app.platforms.base import PlatformValue
from app.platforms.registry import get_adapter
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
from app.services.history_service import (
    completed_history_exists,
    record_download_history,
)
from app.services.settings_service import get_app_settings
from app.utils.filename import sanitize_filename
from app.utils.platform_detector import PlatformValidationError, detect_platform
from app.utils.progress_parser import ProgressUpdate, parse_ytdlp_progress_line

logger = logging.getLogger(__name__)

TERMINAL_STATUSES = {
    DownloadStatus.COMPLETED.value,
    DownloadStatus.FAILED.value,
    DownloadStatus.CANCELLED.value,
}
MAX_IMAGE_BYTES = 20 * 1024 * 1024

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
IMAGE_QUALITY: QualityValue = "image_original"

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

    if platform.media_type == "playlist":
        raise DownloadError(
            "Playlist downloads are currently only available for YouTube."
        )

    try:
        analysis = analyze_url(platform.url)
    except AnalyzeError as exc:
        raise DownloadError(exc.message, status_code=exc.status_code) from exc

    app_settings = get_app_settings(session)
    available_qualities = {option.value for option in analysis.qualities}
    if request.quality not in available_qualities:
        raise DownloadError("Selected quality is not available for this media.")
    if app_settings.skip_existing and completed_history_exists(
        url=analysis.webpage_url,
        selected_quality=request.quality,
        audio_format=request.audio_format,
        session=session,
    ):
        raise DownloadError(
            "This download already exists in history. Turn off Skip existing to download it again."
        )

    job = DownloadJob(
        url=analysis.webpage_url,
        platform=analysis.platform,
        media_type=analysis.type,
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
    app_settings = _current_app_settings()
    download_root = Path(app_settings.download_folder).resolve()

    q = cast(QualityValue, job.selected_quality)
    media_type = cast(Any, job.media_type)
    output_root = _output_root_for_job(job, download_root)
    output_template = _output_template_for_job(job, q, output_root)

    adapter = get_adapter(cast(PlatformValue, job.platform))
    return adapter.build_download_args(
        url=job.url,
        output_root=str(output_root),
        output_template=str(output_template),
        quality_format=QUALITY_FORMATS.get(q),
        audio_format=(job.audio_format or "m4a")
        if q in AUDIO_QUALITY_FORMATS
        else None,
        media_type=media_type,
    )


def job_to_response(job: DownloadJob) -> DownloadJobResponse:
    audio_format = cast(AudioFormat | None, job.audio_format)
    selected_quality = cast(QualityValue, job.selected_quality)
    status = cast(DownloadStatusValue, job.status)
    progress_status = cast(ProgressStatusValue, job.progress_status)

    return DownloadJobResponse(
        id=job.id,
        url=job.url,
        platform=cast(PlatformValue, job.platform),
        mediaType=cast(Any, job.media_type),
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

        app_settings = get_app_settings(session)
        download_root = Path(app_settings.download_folder).resolve()
        _output_root_for_job(job, download_root).mkdir(parents=True, exist_ok=True)
        if _uses_direct_image_download(job):
            _run_direct_image_download(job_id)
            return
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
            output_path = _safe_output_path(output, job)
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
        record_download_history(job, session)
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
    if request.quality == IMAGE_QUALITY:
        if request.download_type != "image":
            raise DownloadError("Image downloads must use downloadType image.")
        if request.audio_format is not None:
            raise DownloadError("Image downloads cannot include an audio format.")
        return

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
        record_download_history(job, session)
        session.commit()


def _friendly_ytdlp_error(stderr: str) -> str:
    message = stderr.lower()

    if (
        "private" in message
        or "sign in" in message
        or "login" in message
        or "cookies" in message
        or "restricted" in message
    ):
        return "This media appears to be private or restricted."
    if "unavailable" in message:
        return "This media is unavailable."
    if "requested format is not available" in message:
        return "Selected quality is not available for this media."

    return "Download failed. Please try again."


def _uses_direct_image_download(job: DownloadJob) -> bool:
    return job.platform == "x" and job.media_type == "image"


def _run_direct_image_download(job_id: str) -> None:
    with Session(engine) as session:
        job = session.get(DownloadJob, job_id)
        if not job or job.status == DownloadStatus.CANCELLED.value:
            return

        job.status = DownloadStatus.DOWNLOADING.value
        job.progress_status = "downloading"
        job.updated_at = _utc_now()
        session.add(job)
        session.commit()
        session.refresh(job)

        try:
            output_path = _download_direct_image(job)
        except DownloadError as exc:
            job.status = DownloadStatus.FAILED.value
            job.progress_status = "failed"
            job.speed = None
            job.eta = None
            job.error_message = exc.message
            job.completed_at = _utc_now()
            job.updated_at = _utc_now()
            session.add(job)
            record_download_history(job, session)
            session.commit()
            return

        if not job or job.status == DownloadStatus.CANCELLED.value:
            return

        job.status = DownloadStatus.COMPLETED.value
        job.progress = 100
        job.speed = None
        job.eta = None
        job.progress_status = "completed"
        job.output_path = output_path
        job.file_size = _file_size(output_path)
        job.error_message = None
        job.completed_at = _utc_now()
        job.updated_at = _utc_now()
        session.add(job)
        record_download_history(job, session)
        session.commit()


def _download_direct_image(job: DownloadJob) -> str:
    image_url = job.thumbnail
    if not image_url or urlparse(image_url).scheme != "https":
        raise DownloadError("This X post does not include a downloadable image.")

    request = Request(
        image_url,
        headers={
            "User-Agent": "Mozilla/5.0",
            "Accept": "image/jpeg,image/*;q=0.8",
        },
    )

    try:
        with urlopen(request, timeout=30) as response:
            content = response.read(MAX_IMAGE_BYTES + 1)
    except (HTTPError, URLError, OSError) as exc:
        raise DownloadError("Could not download this X image.") from exc

    if len(content) > MAX_IMAGE_BYTES:
        raise DownloadError("This X image is too large to download.")

    app_settings = _current_app_settings()
    output_root = _output_root_for_job(job, Path(app_settings.download_folder).resolve())
    output_root.mkdir(parents=True, exist_ok=True)
    output_path = _direct_image_output_path(job, output_root)
    output_path.write_bytes(content)
    return str(output_path.resolve())


def _direct_image_output_path(job: DownloadJob, output_root: Path) -> Path:
    q = cast(QualityValue, job.selected_quality)
    tweet_id = _x_status_id(job.url) or "image"
    stem = _render_filename_template(job, q).replace("%(id)s", tweet_id)
    return output_root / f"{stem}.jpg"


def _x_status_id(url: str) -> str | None:
    path_parts = [part for part in urlparse(url).path.split("/") if part]
    if len(path_parts) >= 3 and path_parts[1] == "status":
        return path_parts[2]
    return None


def _safe_output_path(stdout: str, job: DownloadJob) -> str | None:
    app_settings = _current_app_settings()
    download_root = Path(app_settings.download_folder).resolve()

    if job.media_type == "gallery":
        return str(_output_root_for_job(job, download_root))

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

    if job.media_type == "image":
        return _latest_image_path(_output_root_for_job(job, download_root))

    return None


def _file_size(output_path: str | None) -> int | None:
    if not output_path:
        return None

    try:
        path = Path(output_path)
        if path.is_dir():
            return sum(
                item.stat().st_size for item in path.rglob("*") if item.is_file()
            )
        return path.stat().st_size
    except OSError:
        return None


def _utc_now() -> datetime:
    return datetime.now(UTC)


def _current_app_settings() -> AppSettings:
    with Session(engine) as session:
        return get_app_settings(session)


def _render_filename_template(job: DownloadJob, quality: QualityValue) -> str:
    app_settings = _current_app_settings()
    template = app_settings.filename_template or "{title}-{id}-{quality}"
    values = {
        "{title}": sanitize_filename(job.title),
        "{id}": "%(id)s",
        "{quality}": sanitize_filename(quality),
        "{platform}": sanitize_filename(job.platform),
    }

    rendered = template
    for placeholder, value in values.items():
        rendered = rendered.replace(placeholder, value)

    return sanitize_filename(rendered, fallback="download")


def _output_root_for_job(job: DownloadJob, download_root: Path) -> Path:
    if job.media_type == "gallery":
        return (
            download_root / "images" / sanitize_filename(job.title, fallback="gallery")
        )
    if job.media_type == "image":
        return download_root / "images"
    return download_root


def _output_template_for_job(
    job: DownloadJob,
    quality: QualityValue,
    output_root: Path,
) -> Path:
    if job.media_type == "gallery":
        return output_root / "%(autonumber)03d - %(title).200B [%(id)s].%(ext)s"
    return output_root / f"{_render_filename_template(job, quality)}.%(ext)s"


def _latest_image_path(output_root: Path) -> str | None:
    try:
        candidates = [item for item in output_root.glob("*.jpg") if item.is_file()]
    except OSError:
        return None

    if not candidates:
        return None

    return str(max(candidates, key=lambda item: item.stat().st_mtime).resolve())

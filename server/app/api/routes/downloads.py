from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse, FileResponse
from sqlmodel import Session

from app.db.database import get_session
from app.schemas.download import (
    DownloadCreateRequest,
    DownloadJobResponse,
    DownloadQueueResponse,
)
from app.services.download_service import (
    cancel_download_job,
    create_download_job,
    get_download_job,
    list_download_jobs,
    retry_download_job,
    stream_download_job_events,
)
from app.services.exceptions import DownloadError

router = APIRouter(tags=["downloads"])


@router.post("/downloads", response_model=DownloadJobResponse)
async def create_download(
    request: DownloadCreateRequest,
    session: Session = Depends(get_session),
) -> DownloadJobResponse:
    try:
        return create_download_job(request, session)
    except DownloadError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.get("/downloads", response_model=DownloadQueueResponse)
async def get_downloads(
    session: Session = Depends(get_session),
) -> DownloadQueueResponse:
    return DownloadQueueResponse(jobs=list_download_jobs(session))


@router.get("/downloads/{job_id}", response_model=DownloadJobResponse)
async def get_download(
    job_id: str,
    session: Session = Depends(get_session),
) -> DownloadJobResponse:
    try:
        return get_download_job(job_id, session)
    except DownloadError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.get("/downloads/{job_id}/events")
async def stream_download_events(
    job_id: str,
    session: Session = Depends(get_session),
) -> StreamingResponse:
    try:
        get_download_job(job_id, session)
    except DownloadError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    return StreamingResponse(
        stream_download_job_events(job_id),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache"},
    )


@router.post("/downloads/{job_id}/cancel", response_model=DownloadJobResponse)
async def cancel_download(
    job_id: str,
    session: Session = Depends(get_session),
) -> DownloadJobResponse:
    try:
        return cancel_download_job(job_id, session)
    except DownloadError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.post("/downloads/{job_id}/retry", response_model=DownloadJobResponse)
async def retry_download(
    job_id: str,
    session: Session = Depends(get_session),
) -> DownloadJobResponse:
    try:
        return retry_download_job(job_id, session)
    except DownloadError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.get("/downloads/{job_id}/stream")
async def stream_download_file(
    job_id: str,
    session: Session = Depends(get_session),
) -> FileResponse:
    try:
        job = get_download_job(job_id, session)
    except DownloadError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    if job.status != "completed" or not job.output_path:
        raise HTTPException(status_code=400, detail="Download not completed yet")

    file_path = Path(job.output_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on server")

    return FileResponse(
        path=file_path,
        filename=file_path.name,
        media_type="application/octet-stream",
    )


@router.delete("/downloads/{job_id}/file")
async def delete_download_file(
    job_id: str,
    session: Session = Depends(get_session),
) -> dict[str, str]:
    try:
        job = get_download_job(job_id, session)
    except DownloadError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    if job.status != "completed" or not job.output_path:
        raise HTTPException(status_code=400, detail="Download not completed yet")

    file_path = Path(job.output_path)
    if file_path.exists():
        try:
            file_path.unlink()
        except Exception as exc:
            raise HTTPException(status_code=500, detail="Could not delete file") from exc

    return {"detail": "File deleted successfully"}

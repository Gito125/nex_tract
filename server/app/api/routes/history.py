from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session

from app.db.database import get_session
from app.schemas.download import DownloadJobResponse
from app.schemas.history import (
    HistoryActionResponse,
    HistoryListResponse,
    HistoryStatusValue,
)
from app.services.exceptions import DownloadError, HistoryError
from app.services.history_service import (
    list_history_items,
    open_history_file,
    open_history_folder,
    redownload_history_item,
)

router = APIRouter(tags=["history"])


@router.get("/history", response_model=HistoryListResponse)
async def get_history(
    query: str | None = Query(default=None, max_length=200),
    status: HistoryStatusValue | None = None,
    from_date: datetime | None = Query(default=None, alias="from"),
    to_date: datetime | None = Query(default=None, alias="to"),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    session: Session = Depends(get_session),
) -> HistoryListResponse:
    return list_history_items(
        query=query,
        status=status,
        from_date=from_date,
        to_date=to_date,
        limit=limit,
        offset=offset,
        session=session,
    )


@router.post("/history/{history_id}/redownload", response_model=DownloadJobResponse)
async def redownload_history(
    history_id: str,
    session: Session = Depends(get_session),
) -> DownloadJobResponse:
    try:
        return redownload_history_item(history_id, session)
    except (DownloadError, HistoryError) as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.post("/history/{history_id}/open-file", response_model=HistoryActionResponse)
async def open_file_from_history(
    history_id: str,
    session: Session = Depends(get_session),
) -> HistoryActionResponse:
    try:
        return open_history_file(history_id, session)
    except HistoryError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.post("/history/{history_id}/open-folder", response_model=HistoryActionResponse)
async def open_folder_from_history(
    history_id: str,
    session: Session = Depends(get_session),
) -> HistoryActionResponse:
    try:
        return open_history_folder(history_id, session)
    except HistoryError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

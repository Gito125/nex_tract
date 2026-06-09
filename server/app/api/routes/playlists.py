from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlmodel import Session

from app.db.database import get_session
from app.schemas.playlist import (
    PlaylistCreateRequest,
    PlaylistResponse,
    PlaylistSizeEstimateRequest,
    PlaylistSizeEstimateResponse,
)
from app.services.exceptions import PlaylistError
from app.services.playlist_service import (
    cancel_playlist_download,
    create_playlist_download,
    estimate_playlist_sizes,
    get_playlist,
    stream_playlist_events,
)

router = APIRouter(tags=["playlists"])


@router.post("/playlists", response_model=PlaylistResponse)
async def create_playlist(
    request: PlaylistCreateRequest,
    session: Session = Depends(get_session),
) -> PlaylistResponse:
    try:
        return create_playlist_download(request, session)
    except PlaylistError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.post("/playlists/size-estimate", response_model=PlaylistSizeEstimateResponse)
def estimate_playlist_size(
    request: PlaylistSizeEstimateRequest,
) -> PlaylistSizeEstimateResponse:
    return estimate_playlist_sizes(request)


@router.get("/playlists/{playlist_id}", response_model=PlaylistResponse)
async def get_playlist_download(
    playlist_id: str,
    session: Session = Depends(get_session),
) -> PlaylistResponse:
    try:
        return get_playlist(playlist_id, session)
    except PlaylistError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.get("/playlists/{playlist_id}/events")
async def stream_playlist_download_events(
    playlist_id: str,
    session: Session = Depends(get_session),
) -> StreamingResponse:
    try:
        get_playlist(playlist_id, session)
    except PlaylistError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    return StreamingResponse(
        stream_playlist_events(playlist_id),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache"},
    )


@router.post("/playlists/{playlist_id}/cancel", response_model=PlaylistResponse)
async def cancel_playlist(
    playlist_id: str,
    session: Session = Depends(get_session),
) -> PlaylistResponse:
    try:
        return cancel_playlist_download(playlist_id, session)
    except PlaylistError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

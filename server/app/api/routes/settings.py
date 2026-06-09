from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.db.database import get_session
from app.schemas.settings import SettingsResponse, SettingsUpdateRequest
from app.services.exceptions import SettingsError
from app.services.settings_service import get_settings_response, update_app_settings

router = APIRouter(tags=["settings"])


@router.get("/settings", response_model=SettingsResponse)
async def get_settings(
    session: Session = Depends(get_session),
) -> SettingsResponse:
    return get_settings_response(session)


@router.patch("/settings", response_model=SettingsResponse)
async def update_settings(
    request: SettingsUpdateRequest,
    session: Session = Depends(get_session),
) -> SettingsResponse:
    try:
        return update_app_settings(request, session)
    except SettingsError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

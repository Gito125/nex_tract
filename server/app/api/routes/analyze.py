from fastapi import APIRouter, HTTPException

from app.schemas.analyze import AnalyzeRequest, AnalyzeResponse
from app.services.analyze_service import analyze_url
from app.services.exceptions import AnalyzeError
from app.services.generic_service import run_generic_pipeline
from app.db.database import engine
from sqlmodel import Session
from app.services.settings_service import get_app_settings

router = APIRouter(tags=["analyze"])


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze_media(request: AnalyzeRequest) -> AnalyzeResponse:
    try:
        return analyze_url(str(request.url))
    except AnalyzeError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.post("/analyze/generic", response_model=AnalyzeResponse)
def analyze_generic(request: AnalyzeRequest) -> AnalyzeResponse:
    with Session(engine) as session:
        app_settings = get_app_settings(session)
        if not app_settings.generic_fallback_enabled:
            raise HTTPException(
                status_code=422,
                detail="Generic fallback is disabled. Enable it in Settings > Downloads.",
            )
    return run_generic_pipeline(str(request.url))

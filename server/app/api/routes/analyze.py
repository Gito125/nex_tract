from fastapi import APIRouter, HTTPException

from app.schemas.analyze import AnalyzeRequest, AnalyzeResponse
from app.services.analyze_service import analyze_url
from app.services.exceptions import AnalyzeError

router = APIRouter(tags=["analyze"])


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze_media(request: AnalyzeRequest) -> AnalyzeResponse:
    try:
        return analyze_url(str(request.url))
    except AnalyzeError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

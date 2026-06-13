from unittest.mock import patch, MagicMock
import pytest
from fastapi import HTTPException

from app.services.generic_service import run_generic_pipeline

@patch("app.services.generic_service._run_ytdlp")
def test_generic_pipeline_ytdlp_success(mock_run_ytdlp) -> None:
    # yt-dlp succeeds in stage 1
    mock_run_ytdlp.return_value = {"title": "Generic Test", "duration": 120}
    
    response = run_generic_pipeline("https://example.com/video")
    
    assert response.is_generic is True
    assert response.extraction_method == "ytdlp_generic"
    assert response.title == "Generic Test"


@patch("app.services.generic_service._run_ytdlp")
@patch("app.services.generic_service._scrape_video_src")
def test_generic_pipeline_html_scrape(mock_scrape, mock_run_ytdlp) -> None:
    # yt-dlp fails both stages
    mock_run_ytdlp.side_effect = [None, None]
    
    # scrape succeeds
    mock_scrape.return_value = {"title": "Scraped Video", "direct_urls": ["http://example.com/vid.mp4"]}
    
    response = run_generic_pipeline("https://example.com/video")
    
    assert response.is_generic is True
    assert response.extraction_method == "html_scrape"
    assert response.title == "Scraped Video"
    assert len(response.qualities) == 1
    assert response.qualities[0].value == "best"


@patch("app.services.generic_service._run_ytdlp")
@patch("app.services.generic_service._scrape_video_src")
def test_generic_pipeline_all_fail(mock_scrape, mock_run_ytdlp) -> None:
    mock_run_ytdlp.side_effect = [None, None]
    mock_scrape.return_value = None
    
    with pytest.raises(HTTPException) as exc:
        run_generic_pipeline("https://example.com/video")
        
    assert exc.value.status_code == 422
    assert exc.value.detail["error"] == "extraction_failed"

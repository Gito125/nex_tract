import json
import subprocess
from typing import Any
import httpx
from bs4 import BeautifulSoup
from fastapi import HTTPException

from app.schemas.analyze import AnalyzeResponse, QualityOption
from app.platforms.base import YTDLP_BROWSER_HEADERS, _combined_output


def run_generic_pipeline(url: str) -> AnalyzeResponse:
    # Stage 1: yt-dlp generic:impersonate
    try:
        stage1_payload = _run_ytdlp(url, ["--extractor-args", "generic:impersonate"])
        if stage1_payload and stage1_payload.get("title"):
            return _build_generic_response(url, stage1_payload, "ytdlp_generic")
    except Exception:
        pass

    # Stage 2: yt-dlp relaxed flags
    try:
        stage2_payload = _run_ytdlp(url, ["--no-check-certificate", *YTDLP_BROWSER_HEADERS])
        if stage2_payload and stage2_payload.get("title"):
            return _build_generic_response(url, stage2_payload, "ytdlp_relaxed")
    except Exception:
        pass

    # Stage 3: BeautifulSoup scrape
    try:
        stage3_payload = _scrape_video_src(url)
        if stage3_payload and stage3_payload.get("title"):
            return _build_generic_response(url, stage3_payload, "html_scrape")
    except Exception:
        pass

    # All stages failed
    raise HTTPException(
        status_code=422,
        detail={
            "error": "extraction_failed",
            "platform": "unknown",
            "url": url,
            "message": "Nextract couldn't extract media from this URL. The site may not be supported, or the content may be private or restricted.",
            "stages_attempted": ["ytdlp_generic", "ytdlp_relaxed", "html_scrape"],
            "suggestion": "Try copying the direct media URL if one is visible in your browser, or check if the content is publicly accessible.",
        },
    )


def _run_ytdlp(url: str, extra_args: list[str]) -> dict[str, Any] | None:
    args = ["yt-dlp", "--dump-single-json", "--no-warnings", "--no-playlist", *extra_args, url]
    
    result = subprocess.run(
        args,
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )
    
    if result.returncode != 0:
        return None
        
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError:
        return None


def _scrape_video_src(url: str) -> dict[str, Any] | None:
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }
    
    with httpx.Client(follow_redirects=True, timeout=10.0) as client:
        try:
            response = client.get(url, headers=headers)
            response.raise_for_status()
        except httpx.RequestError:
            return None
            
    soup = BeautifulSoup(response.text, "html.parser")
    
    # Look for <video> tags with src attribute
    sources = []
    for tag in soup.find_all("video"):
        src = tag.get("src")
        if src and isinstance(src, str) and src.startswith("http"):
            sources.append(src)
        for source in tag.find_all("source"):
            src = source.get("src")
            if src and isinstance(src, str) and src.startswith("http"):
                sources.append(src)
                
    if not sources:
        return None
        
    # Attempt page title and OG metadata for display
    title = "Unknown Media"
    og_title = soup.find("meta", property="og:title")
    if og_title and og_title.get("content"):
        title = og_title.get("content")
    else:
        title_tag = soup.find("title")
        if title_tag and title_tag.text:
            title = title_tag.text.strip()
            
    thumbnail = None
    og_image = soup.find("meta", property="og:image")
    if og_image and og_image.get("content"):
        thumbnail = og_image.get("content")
        
    return {
        "title": title,
        "thumbnail": thumbnail,
        "direct_urls": sources,
    }


def _build_generic_response(url: str, payload: dict[str, Any], method: str) -> AnalyzeResponse:
    from app.services.format_service import normalize_quality_options, sanitize_raw_formats
    
    formats = []
    qualities = []
    raw_formats = []
    
    if method == "html_scrape":
        # Simplified options since we can't inspect formats
        qualities = [
            QualityOption(label="Best Quality", value="best", available=True, kind="video"),
        ]
    else:
        formats = payload.get("formats", [])
        if isinstance(formats, list):
            valid_formats = [f for f in formats if isinstance(f, dict)]
            qualities = normalize_quality_options(valid_formats)
            raw_formats = sanitize_raw_formats(valid_formats, payload)
        
        # Ensure at least "Best Quality" is present if yt-dlp returned formats but none normalized well
        if not qualities:
            qualities = [
                QualityOption(label="Best Quality", value="best", available=True, kind="video"),
            ]
            
    # For extraction_method
    extraction_method_typed = method
            
    return AnalyzeResponse(
        platform="generic",
        type="video",  # Assume video for generic fallback
        title=payload.get("title", "Unknown Media") or "Unknown Media",
        thumbnail=payload.get("thumbnail"),
        duration=payload.get("duration") if isinstance(payload.get("duration"), (int, float)) else None,
        creator=payload.get("uploader") or payload.get("channel") or payload.get("creator"),
        webpageUrl=url,
        qualities=qualities,
        rawFormats=raw_formats,
        isGeneric=True,
        extractionMethod=extraction_method_typed,
    )

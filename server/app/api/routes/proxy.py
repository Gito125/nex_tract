from collections.abc import Iterator

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse

from app.services.thumbnail_proxy_service import (
    ThumbnailProxyError,
    fetch_proxied_thumbnail,
)

router = APIRouter(tags=["proxy"])


@router.get("/proxy/thumbnail")
def proxy_thumbnail(
    url: str = Query(min_length=1, max_length=4096),
) -> StreamingResponse:
    try:
        thumbnail = fetch_proxied_thumbnail(url)
    except ThumbnailProxyError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    return StreamingResponse(
        _single_chunk(thumbnail.content),
        media_type=thumbnail.content_type,
        headers={"Cache-Control": "public, max-age=3600"},
    )


def _single_chunk(content: bytes) -> Iterator[bytes]:
    yield content

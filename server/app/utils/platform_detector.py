from urllib.parse import urlparse

from app.platforms.base import PlatformInfo, PlatformValidationError
from app.platforms.registry import ADAPTERS


def detect_platform(url: str) -> PlatformInfo:
    parsed = urlparse(url.strip())

    if parsed.scheme not in {"http", "https"}:
        raise PlatformValidationError("Only http and https links are supported.")

    for adapter in ADAPTERS:
        if not adapter.can_handle(parsed):
            continue

        adapter.validate_public_single_link(parsed)
        return PlatformInfo(
            platform=adapter.name,
            media_type=adapter.detect_media_type(parsed),
            url=adapter.canonicalize_url(parsed),
        )

    raise PlatformValidationError(
        "This platform is not natively supported."
    )

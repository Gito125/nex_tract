from typing import Any, Literal
from urllib.parse import ParseResult
from app.platforms.base import PlatformAdapter

MediaType = Literal["video", "audio"]

class GenericAdapter(PlatformAdapter):
    name = "generic"
    display_name = "Generic"
    hosts = set()  # Not used for generic

    def can_handle(self, parsed: ParseResult) -> bool:
        # Fallback adapter handles everything
        return True

    def extract_metadata(self, url: str, media_type: str) -> dict[str, Any]:
        # Handled by generic_service directly
        raise NotImplementedError("Use generic_service for generic extractions")

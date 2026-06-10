from urllib.parse import ParseResult

from app.platforms.base import PlatformAdapter, PlatformValidationError


class InstagramAdapter(PlatformAdapter):
    name = "instagram"
    display_name = "Instagram"
    hosts = {"instagram.com", "www.instagram.com"}

    def validate_public_single_link(self, parsed: ParseResult) -> None:
        path_parts = [part for part in parsed.path.split("/") if part]
        if len(path_parts) >= 2 and path_parts[0] in {"reel", "p", "tv"}:
            return

        raise PlatformValidationError("Paste a public Instagram reel, post, or video link.")

    def canonicalize_url(self, parsed: ParseResult) -> str:
        return parsed._replace(
            scheme="https",
            netloc="www.instagram.com",
            query="",
            fragment="",
        ).geturl()

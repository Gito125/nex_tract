from urllib.parse import ParseResult

from app.platforms.base import PlatformAdapter, PlatformValidationError


class XAdapter(PlatformAdapter):
    name = "x"
    display_name = "X"
    hosts = {"x.com", "www.x.com", "twitter.com", "www.twitter.com", "mobile.twitter.com"}

    def validate_public_single_link(self, parsed: ParseResult) -> None:
        path_parts = [part for part in parsed.path.split("/") if part]
        if len(path_parts) >= 3 and path_parts[1] == "status":
            return

        raise PlatformValidationError("Paste a public X post link.")

    def canonicalize_url(self, parsed: ParseResult) -> str:
        return parsed._replace(
            scheme="https",
            netloc="x.com",
            query="",
            fragment="",
        ).geturl()

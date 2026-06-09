from urllib.parse import ParseResult

from app.platforms.base import PlatformAdapter, PlatformValidationError


class TikTokAdapter(PlatformAdapter):
    name = "tiktok"
    display_name = "TikTok"
    hosts = {"tiktok.com", "www.tiktok.com", "m.tiktok.com", "vm.tiktok.com"}

    def validate_public_single_link(self, parsed: ParseResult) -> None:
        path_parts = [part for part in parsed.path.split("/") if part]

        if parsed.hostname == "vm.tiktok.com":
            if path_parts:
                return
            raise PlatformValidationError("Paste a TikTok video link, not a profile link.")

        if len(path_parts) >= 3 and path_parts[0].startswith("@") and path_parts[1] == "video":
            return

        raise PlatformValidationError("Paste a public TikTok video link.")

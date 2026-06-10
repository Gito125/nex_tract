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
            raise PlatformValidationError(
                "Paste a TikTok video link, not a profile link."
            )

        if (
            len(path_parts) >= 3
            and path_parts[0].startswith("@")
            and path_parts[1] == "video"
        ):
            return

        if len(path_parts) >= 2 and path_parts[0] == "video":
            return

        raise PlatformValidationError("Paste a public TikTok video link.")

    def canonicalize_url(self, parsed: ParseResult) -> str:
        if parsed.hostname == "vm.tiktok.com":
            return parsed._replace(query="", fragment="").geturl()

        video_id = _video_id_from_path(parsed.path)
        if video_id:
            return parsed._replace(
                scheme="https",
                netloc="www.tiktok.com",
                path=f"/@_/video/{video_id}",
                query="",
                fragment="",
            ).geturl()

        return parsed._replace(
            scheme="https",
            netloc="www.tiktok.com",
            query="",
            fragment="",
        ).geturl()


def _video_id_from_path(path: str) -> str | None:
    path_parts = [part for part in path.split("/") if part]
    if len(path_parts) >= 3 and path_parts[0].startswith("@") and path_parts[1] == "video":
        return path_parts[2]
    if len(path_parts) >= 2 and path_parts[0] == "video":
        return path_parts[1]
    return None

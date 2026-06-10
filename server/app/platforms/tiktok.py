from urllib.parse import ParseResult

from app.platforms.base import PlatformAdapter, PlatformValidationError


class TikTokAdapter(PlatformAdapter):
    name = "tiktok"
    display_name = "TikTok"
    hosts = {"tiktok.com", "www.tiktok.com", "m.tiktok.com", "vm.tiktok.com"}

    def validate_public_single_link(self, parsed: ParseResult) -> None:
        path_parts = [part for part in parsed.path.split("/") if part]

        # Short-link format: vm.tiktok.com/ZMabc123/ — just needs a path segment
        if parsed.hostname == "vm.tiktok.com":
            if path_parts:
                return
            raise PlatformValidationError(
                "Paste a TikTok video link, not a profile link."
            )

        # Standard format: /@creator/video/<id>
        if (
            len(path_parts) >= 3
            and path_parts[0].startswith("@")
            and path_parts[1] == "video"
        ):
            return

        # Bare format: /video/<id>  (no creator prefix)
        if len(path_parts) >= 2 and path_parts[0] == "video":
            return

        raise PlatformValidationError("Paste a public TikTok video link.")

    def canonicalize_url(self, parsed: ParseResult) -> str:
        """Return a clean, query-free canonical URL for yt-dlp.

        The creator username is preserved exactly as provided — TikTok's
        servers require a real username and will reject synthetic placeholders
        like @_.  For bare /video/<id> paths (no creator) the URL is kept
        in that form because yt-dlp's TikTok extractor handles it natively.
        """
        if parsed.hostname == "vm.tiktok.com":
            # Short-links: strip query/fragment only; yt-dlp will follow the redirect.
            return parsed._replace(query="", fragment="").geturl()

        path_parts = [part for part in parsed.path.split("/") if part]

        # /@creator/video/<id> — preserve creator, strip query/fragment
        if (
            len(path_parts) >= 3
            and path_parts[0].startswith("@")
            and path_parts[1] == "video"
        ):
            creator = path_parts[0]
            video_id = path_parts[2]
            return parsed._replace(
                scheme="https",
                netloc="www.tiktok.com",
                path=f"/{creator}/video/{video_id}",
                query="",
                fragment="",
            ).geturl()

        # /video/<id> — bare path, no creator prefix
        if len(path_parts) >= 2 and path_parts[0] == "video":
            video_id = path_parts[1]
            return parsed._replace(
                scheme="https",
                netloc="www.tiktok.com",
                path=f"/video/{video_id}",
                query="",
                fragment="",
            ).geturl()

        # Fallback: strip query/fragment from whatever path remains
        return parsed._replace(
            scheme="https",
            netloc="www.tiktok.com",
            query="",
            fragment="",
        ).geturl()

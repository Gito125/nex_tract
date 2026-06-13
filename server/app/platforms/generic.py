from typing import Any
from urllib.parse import ParseResult

from app.platforms.base import PlatformAdapter, YTDLP_BROWSER_HEADERS


class GenericAdapter(PlatformAdapter):
    """
    Fallback adapter for any site not covered by a native adapter.

    It is NOT included in the platform-detection loop (can_handle returns False
    so the detector raises PlatformValidationError and analyze_url routes the URL
    to run_generic_pipeline instead).

    It IS registered in the adapter registry so that get_adapter("generic")
    works when download_service builds yt-dlp args for generic-platform jobs.
    """

    name = "generic"
    display_name = "Generic"
    hosts: set[str] = set()

    def can_handle(self, parsed: ParseResult) -> bool:
        # Never match during platform detection — generic URLs are handled by
        # run_generic_pipeline, not by the adapter loop.
        return False

    def extract_metadata(self, url: str, media_type: str) -> dict[str, Any]:
        raise NotImplementedError("Use generic_service.run_generic_pipeline instead")

    def build_download_args(
        self,
        *,
        url: str,
        output_root: str,
        output_template: str,
        quality_format: str | None,
        audio_format: str | None,
        media_type: str = "video",
    ) -> list[str]:
        """
        Build yt-dlp download args for a generic site.

        Uses browser UA headers so adult-content CDNs and other UA-gated
        sites accept the request. Delegates format/audio logic to the base
        implementation.
        """
        args = [
            "yt-dlp",
            "--no-warnings",
            "--no-simulate",
            "--no-overwrites",
            "--progress",
            "--newline",
            *YTDLP_BROWSER_HEADERS,
            "--paths",
            output_root,
            "--output",
            output_template,
            "--print",
            "after_move:filepath",
            "--no-playlist",
        ]

        if quality_format is not None:
            args.extend(["--format", quality_format])

        if audio_format:
            args.extend(["--extract-audio", "--audio-format", audio_format])
        elif media_type == "video":
            args.extend(["--merge-output-format", "mp4"])

        args.append(url)
        return args

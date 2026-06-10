from urllib.parse import ParseResult

from app.platforms.base import MediaType, PlatformAdapter, PlatformValidationError


class XAdapter(PlatformAdapter):
    name = "x"
    display_name = "X"
    hosts = {
        "x.com",
        "www.x.com",
        "twitter.com",
        "www.twitter.com",
        "mobile.twitter.com",
    }

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

    def build_download_args(
        self,
        *,
        url: str,
        output_root: str,
        output_template: str,
        quality_format: str | None,
        audio_format: str | None,
        media_type: MediaType = "video",
    ) -> list[str]:
        if media_type not in {"image", "gallery"}:
            return super().build_download_args(
                url=url,
                output_root=output_root,
                output_template=output_template,
                quality_format=quality_format,
                audio_format=audio_format,
                media_type=media_type,
            )

        args = [
            "yt-dlp",
            "--no-warnings",
            "--no-simulate",
            "--no-overwrites",
            "--progress",
            "--newline",
            "--paths",
            output_root,
            "--output",
            output_template,
            "--print",
            "after_move:filepath",
            "--write-thumbnail",
            "--skip-download",
            "--convert-thumbnails",
            "jpg",
        ]

        if media_type == "gallery":
            args.append("--yes-playlist")
        else:
            args.append("--no-playlist")

        args.append(url)
        return args

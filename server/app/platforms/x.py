import json
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import ParseResult, parse_qsl, urlencode, urlparse, urlunparse
from urllib.request import Request, urlopen

from app.platforms.base import MediaType, PlatformAdapter, PlatformValidationError
from app.services.exceptions import AnalyzeError

X_SYNDICATION_URL = "https://cdn.syndication.twimg.com/tweet-result"

# Full browser UA — the syndication API rejects minimal/bot-looking strings
# for newer tweets, and bare "Mozilla/5.0" is increasingly fingerprinted.
_BROWSER_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)


class XImageMetadataError(Exception):
    def __init__(self, message: str, no_media: bool = False) -> None:
        self.message = message
        self.no_media = no_media
        super().__init__(message)


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

    def extract_metadata(self, url: str, media_type: MediaType) -> dict[str, Any]:
        try:
            return super().extract_metadata(url, media_type)
        except AnalyzeError as exc:
            try:
                return _extract_image_metadata(url)
            except XImageMetadataError as fallback_exc:
                if fallback_exc.no_media:
                    # Post exists but has no media — return a clear user-facing error.
                    raise AnalyzeError(fallback_exc.message) from fallback_exc
                # Syndication fetch itself failed; surface the original yt-dlp error.
                raise exc from fallback_exc

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

        # Image/gallery X posts: use yt-dlp to write the thumbnail as a JPEG.
        # We skip the actual video download and let --write-thumbnail handle it.
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


def _extract_image_metadata(url: str) -> dict[str, Any]:
    tweet_id = _status_id(url)
    if not tweet_id:
        raise XImageMetadataError("Paste a public X post link.", no_media=True)

    payload = _fetch_syndication_payload(tweet_id)
    image_urls = _image_urls(payload)
    if not image_urls:
        raise XImageMetadataError(
            "This X post does not contain downloadable video or image media.",
            no_media=True,
        )

    title = _string_value(payload.get("text"), f"X post {tweet_id}")
    creator = _creator(payload)

    return {
        "id": tweet_id,
        "title": title,
        "uploader": creator,
        "webpage_url": url,
        "thumbnail": image_urls[0],
        "ext": "jpg",
        "images": [{"url": image_url, "ext": "jpg"} for image_url in image_urls],
        "formats": [
            {
                "format_id": f"image_{index}",
                "ext": "jpg",
                "url": image_url,
                "vcodec": "none",
                "acodec": "none",
            }
            for index, image_url in enumerate(image_urls, start=1)
        ],
    }


def _fetch_syndication_payload(tweet_id: str) -> dict[str, Any]:
    """Fetch tweet metadata from X's syndication API.

    The API accepts an optional `token` parameter.  While not always required
    for public tweets it significantly improves reliability for newer posts.
    The token formula is publicly documented: (tweet_id / 1e15 * pi).floor()
    expressed as a decimal string — approximated here with integer arithmetic.
    """
    token = _syndication_token(tweet_id)
    params: dict[str, str] = {"id": tweet_id, "lang": "en"}
    if token:
        params["token"] = token

    request_url = f"{X_SYNDICATION_URL}?{urlencode(params)}"
    request = Request(
        request_url,
        headers={
            "User-Agent": _BROWSER_UA,
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": "https://platform.twitter.com/",
            "Origin": "https://platform.twitter.com",
        },
    )

    try:
        with urlopen(request, timeout=15) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, OSError, json.JSONDecodeError) as exc:
        raise XImageMetadataError("Could not load this X post.") from exc

    if not isinstance(payload, dict):
        raise XImageMetadataError("Could not load this X post.")

    return payload


def _syndication_token(tweet_id: str) -> str | None:
    """Compute the token expected by the syndication API.

    The token is derived from the tweet ID using a simple formula:
    floor(int(tweet_id) / 1e15 * 3141592653589793) % (10**10)
    expressed as a zero-padded 10-digit decimal string.

    Returns None for non-numeric IDs to avoid crashing on unexpected input.
    """
    try:
        tid = int(tweet_id)
    except (ValueError, TypeError):
        return None
    # Integer-approximate: multiply by pi-scaled constant, take modulo
    token = (tid * 3141592653589793) // (10 ** 15) % (10 ** 10)
    return str(token)


def _status_id(url: str) -> str | None:
    path_parts = [part for part in urlparse(url).path.split("/") if part]
    if len(path_parts) >= 3 and path_parts[1] == "status":
        return path_parts[2]
    return None


def _image_urls(payload: dict[str, Any]) -> list[str]:
    media_items = payload.get("mediaDetails")
    if not isinstance(media_items, list):
        return []

    urls: list[str] = []
    for item in media_items:
        if not isinstance(item, dict) or item.get("type") != "photo":
            continue
        image_url = _string_value(
            item.get("media_url_https") or item.get("media_url"), ""
        )
        if image_url.startswith("https://"):
            urls.append(_jpg_image_url(image_url))

    return urls


def _jpg_image_url(url: str) -> str:
    parsed = urlparse(url)
    if parsed.hostname != "pbs.twimg.com":
        return url

    query = dict(parse_qsl(parsed.query, keep_blank_values=True))
    query["format"] = "jpg"
    query.setdefault("name", "large")
    return urlunparse(parsed._replace(query=urlencode(query)))


def _creator(payload: dict[str, Any]) -> str | None:
    user = payload.get("user")
    if not isinstance(user, dict):
        return None
    return _string_value(user.get("name") or user.get("screen_name"), "") or None


def _string_value(value: Any, fallback: str) -> str:
    if isinstance(value, str) and value.strip():
        return value
    return fallback

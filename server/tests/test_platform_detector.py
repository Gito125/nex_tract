import pytest

from app.utils.platform_detector import PlatformValidationError, detect_platform


@pytest.mark.parametrize(
    ("url", "platform", "canonical_url"),
    [
        (
            # Creator slug is preserved exactly as provided
            "https://www.tiktok.com/@creator/video/1234567890",
            "tiktok",
            "https://www.tiktok.com/@creator/video/1234567890",
        ),
        (
            # Query string stripped, real username kept
            "https://www.tiktok.com/@creator/video/1234567890?is_from_webapp=1&sender_device=pc",
            "tiktok",
            "https://www.tiktok.com/@creator/video/1234567890",
        ),
        (
            # Bare /video/ID path kept as-is (no creator to invent)
            "https://www.tiktok.com/video/1234567890?is_from_webapp=1&sender_device=pc",
            "tiktok",
            "https://www.tiktok.com/video/1234567890",
        ),
        (
            "https://vm.tiktok.com/ZMabc123/?share=1",
            "tiktok",
            "https://vm.tiktok.com/ZMabc123/",
        ),
        (
            "https://www.instagram.com/reel/ABC123/?utm_source=ig_web_copy_link",
            "instagram",
            "https://www.instagram.com/reel/ABC123/",
        ),
        (
            "https://instagram.com/p/ABC123/",
            "instagram",
            "https://www.instagram.com/p/ABC123/",
        ),
        (
            "https://x.com/user/status/1234567890?s=20",
            "x",
            "https://x.com/user/status/1234567890",
        ),
        (
            "https://twitter.com/user/status/1234567890",
            "x",
            "https://x.com/user/status/1234567890",
        ),
        (
            "https://vimeo.com/123456789",
            "vimeo",
            "https://vimeo.com/123456789",
        ),
        (
            "https://www.reddit.com/r/Nextract/comments/123456/test_video/",
            "reddit",
            "https://www.reddit.com/r/Nextract/comments/123456/test_video/",
        ),
        (
            "https://www.facebook.com/watch/?v=1234567890",
            "facebook",
            "https://www.facebook.com/watch/?v=1234567890",
        ),
        (
            "https://soundcloud.com/artist/track",
            "soundcloud",
            "https://soundcloud.com/artist/track",
        ),
    ],
)
def test_detect_platform_supported_single_links(
    url: str,
    platform: str,
    canonical_url: str,
) -> None:
    detected = detect_platform(url)

    assert detected.platform == platform
    assert detected.media_type == "video"
    assert detected.url == canonical_url


@pytest.mark.parametrize(
    "url",
    [
        "ftp://www.youtube.com/watch?v=abc123",
        "not a url",
    ],
)
def test_detect_platform_rejects_invalid_protocols(url: str) -> None:
    with pytest.raises(PlatformValidationError) as exc:
        detect_platform(url)

    assert exc.value.message == "Only http and https links are supported."


def test_detect_platform_rejects_unsupported_hosts() -> None:
    with pytest.raises(PlatformValidationError) as exc:
        detect_platform("https://example.com/123")

    assert exc.value.message == "This platform is not natively supported."


@pytest.mark.parametrize(
    ("url", "message"),
    [
        ("https://www.tiktok.com/@creator", "Paste a public TikTok video link."),
        ("https://www.tiktok.com/@creator/video", "Paste a public TikTok video link."),
        (
            "https://www.instagram.com/example.profile/",
            "Paste a public Instagram reel, post, or video link.",
        ),
        ("https://x.com/example", "Paste a public X post link."),
    ],
)
def test_detect_platform_rejects_profiles_and_collections(
    url: str,
    message: str,
) -> None:
    with pytest.raises(PlatformValidationError) as exc:
        detect_platform(url)

    assert exc.value.message == message

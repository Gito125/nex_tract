import pytest

from app.utils.platform_detector import PlatformValidationError, detect_platform


@pytest.mark.parametrize(
    ("url", "platform"),
    [
        ("https://www.tiktok.com/@creator/video/1234567890", "tiktok"),
        ("https://vm.tiktok.com/ZMabc123/", "tiktok"),
        ("https://www.instagram.com/reel/ABC123/", "instagram"),
        ("https://instagram.com/p/ABC123/", "instagram"),
        ("https://x.com/user/status/1234567890", "x"),
        ("https://twitter.com/user/status/1234567890", "x"),
    ],
)
def test_detect_platform_supported_single_links(url: str, platform: str) -> None:
    detected = detect_platform(url)

    assert detected.platform == platform
    assert detected.media_type == "video"
    assert detected.url == url


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
        detect_platform("https://vimeo.com/123")

    assert exc.value.message == (
        "This platform is not supported yet. Try YouTube, TikTok, Instagram, or X."
    )


@pytest.mark.parametrize(
    ("url", "message"),
    [
        ("https://www.tiktok.com/@creator", "Paste a public TikTok video link."),
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

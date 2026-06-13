from app.platforms.base import PlatformAdapter, PlatformValue
from app.platforms.instagram import InstagramAdapter
from app.platforms.tiktok import TikTokAdapter
from app.platforms.x import XAdapter
from app.platforms.youtube import YouTubeAdapter
from app.platforms.vimeo import VimeoAdapter
from app.platforms.reddit import RedditAdapter
from app.platforms.facebook import FacebookAdapter
from app.platforms.soundcloud import SoundCloudAdapter
from app.platforms.generic import GenericAdapter

ADAPTERS: tuple[PlatformAdapter, ...] = (
    YouTubeAdapter(),
    TikTokAdapter(),
    InstagramAdapter(),
    XAdapter(),
    VimeoAdapter(),
    RedditAdapter(),
    FacebookAdapter(),
    SoundCloudAdapter(),
    # GenericAdapter intentionally last — it matches every host,
    # but platform_detector uses it only via run_generic_pipeline,
    # not via the ADAPTERS loop. Registered here so get_adapter("generic")
    # works for download jobs.
    GenericAdapter(),
)


def get_adapter(platform: PlatformValue) -> PlatformAdapter:
    for adapter in ADAPTERS:
        if adapter.name == platform:
            return adapter
    raise ValueError(f"Unsupported platform: {platform}")

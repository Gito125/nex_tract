from app.platforms.base import PlatformAdapter, PlatformValue
from app.platforms.instagram import InstagramAdapter
from app.platforms.tiktok import TikTokAdapter
from app.platforms.x import XAdapter
from app.platforms.youtube import YouTubeAdapter
from app.platforms.vimeo import VimeoAdapter
from app.platforms.reddit import RedditAdapter
from app.platforms.facebook import FacebookAdapter
from app.platforms.soundcloud import SoundCloudAdapter

ADAPTERS: tuple[PlatformAdapter, ...] = (
    YouTubeAdapter(),
    TikTokAdapter(),
    InstagramAdapter(),
    XAdapter(),
    VimeoAdapter(),
    RedditAdapter(),
    FacebookAdapter(),
    SoundCloudAdapter(),
)


def get_adapter(platform: PlatformValue) -> PlatformAdapter:
    for adapter in ADAPTERS:
        if adapter.name == platform:
            return adapter
    raise ValueError(f"Unsupported platform: {platform}")

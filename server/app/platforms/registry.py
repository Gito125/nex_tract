from app.platforms.base import PlatformAdapter, PlatformValue
from app.platforms.instagram import InstagramAdapter
from app.platforms.tiktok import TikTokAdapter
from app.platforms.x import XAdapter
from app.platforms.youtube import YouTubeAdapter

ADAPTERS: tuple[PlatformAdapter, ...] = (
    YouTubeAdapter(),
    TikTokAdapter(),
    InstagramAdapter(),
    XAdapter(),
)


def get_adapter(platform: PlatformValue) -> PlatformAdapter:
    for adapter in ADAPTERS:
        if adapter.name == platform:
            return adapter
    raise ValueError(f"Unsupported platform: {platform}")

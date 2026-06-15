import yt_dlp
from yt_dlp.networking.impersonate import ImpersonateTarget

ydl_opts = {
    "quiet": False,
    "no_warnings": False,
    "extract_flat": False,
    "socket_timeout": 45,
    "source_address": "0.0.0.0",
    "legacyserverconnect": True,
    "extractor_args": {"youtube": {"player_client": ["android"]}},
    "impersonate": ImpersonateTarget.from_str("safari-18.0"),
    "retries": 1,
}

try:
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info("https://youtu.be/r7__5jmJ-tA", download=False)
        print("Success:", info.get("title"))
except Exception as e:
    import traceback
    traceback.print_exc()

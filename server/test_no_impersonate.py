import yt_dlp

ydl_opts = {
    "quiet": False,
    "no_warnings": False,
    "extract_flat": False,
    "socket_timeout": 45,
    "extractor_args": {"youtube": {"player_client": ["android"]}},
    "retries": 1,
}

try:
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info("https://www.youtube.com/watch?v=p_0duihxmW4", download=False)
        print("Success:", info.get("title"))
except Exception as e:
    print("Error:", e)

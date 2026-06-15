import yt_dlp

ydl_opts1 = {"extractor_args": {"youtube": ["player_client=android,ios"]}}
ydl_opts2 = {"extractor_args": {"youtube": {"player_client": ["android", "ios"]}}}

try:
    with yt_dlp.YoutubeDL(ydl_opts1) as ydl:
        pass
    print("ydl_opts1 OK")
except Exception as e:
    print("ydl_opts1 Error:", e)

try:
    with yt_dlp.YoutubeDL(ydl_opts2) as ydl:
        pass
    print("ydl_opts2 OK")
except Exception as e:
    print("ydl_opts2 Error:", e)

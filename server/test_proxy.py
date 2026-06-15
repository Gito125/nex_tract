import os
import yt_dlp

ydl_opts = {"proxy": "http://invalid-proxy.com:8080"}
try:
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        pass
    print("Valid config")
except Exception as e:
    print(e)

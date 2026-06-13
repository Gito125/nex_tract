import pytest
import yt_dlp
import subprocess
import json

class MockYoutubeDL:
    def __init__(self, ydl_opts=None):
        self.ydl_opts = ydl_opts or {}

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        pass

    def extract_info(self, url, download=False):
        # Reconstruct the yt-dlp arguments that were previously passed to subprocess
        args = ["yt-dlp", "--dump-single-json", "--no-warnings"]
        
        if self.ydl_opts.get("extract_flat"):
            args.extend(["--flat-playlist", "--yes-playlist", "--ignore-errors"])
        else:
            args.append("--no-playlist")
            
        if self.ydl_opts.get("user_agent"):
            args.extend(["--add-header", f"User-Agent: {self.ydl_opts['user_agent']}"])
            
        args.append(url)
        
        # Determine which module's subprocess.run to call
        if "youtube" in url or "youtu.be" in url:
            import app.platforms.youtube as yt_module
            run_func = getattr(yt_module.subprocess, "run", subprocess.run)
        else:
            import app.platforms.base as base_module
            run_func = getattr(base_module.subprocess, "run", subprocess.run)
            
        # Execute the process (which will be intercepted if patched)
        res = run_func(
            args,
            capture_output=True,
            text=True,
            timeout=self.ydl_opts.get("socket_timeout", 45),
            check=False
        )
        
        if res.returncode != 0:
            raise Exception(res.stderr or res.stdout or "Error running yt-dlp")
            
        return json.loads(res.stdout)

@pytest.fixture(autouse=True)
def mock_ytdlp_class(monkeypatch):
    monkeypatch.setattr(yt_dlp, "YoutubeDL", MockYoutubeDL)

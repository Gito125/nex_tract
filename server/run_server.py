import os
import uvicorn
from app.main import app

import sys

if __name__ == "__main__":
    if len(sys.argv) >= 3 and sys.argv[1] == "-m" and sys.argv[2] == "yt_dlp":
        import yt_dlp
        sys.argv = [sys.argv[0]] + sys.argv[3:]
        sys.exit(yt_dlp.main())

    port = int(os.environ.get("NEXTRACT_PORT", 57000))
    # Using the app object directly instead of a string to ensure
    # PyInstaller's static analysis picks up the 'app' package.
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=port,
        log_level="info",
    )

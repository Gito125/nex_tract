import os
import uvicorn
from app.main import app

if __name__ == "__main__":
    port = int(os.environ.get("NEXTRACT_PORT", 57000))
    # Using the app object directly instead of a string to ensure
    # PyInstaller's static analysis picks up the 'app' package.
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=port,
        log_level="info",
    )

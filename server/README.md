---
title: Nextract API
emoji: 📥
colorFrom: purple
colorTo: gray
sdk: docker
app_port: 7860
pinned: false
---

# Nextract Backend (FastAPI)

This directory contains the backend processing engine for Nextract, built with [Python FastAPI](https://fastapi.tiangolo.com/). It handles URL analysis, `yt-dlp` integration, database management, and asynchronous download queues.

## 🏗️ Architecture & Desktop Bundling

The Nextract backend functions both as a standard local development server and as a standalone compiled binary that runs silently inside the Tauri application as a **sidecar process**.

### Dependency Management with `uv`
We use [`uv`](https://github.com/astral-sh/uv) as our Python package and dependency manager. It is drastically faster than `pip` and handles virtual environments deterministically via `uv.lock`.

### PyInstaller Bundling
For the final Tauri desktop release, this entire Python application is compiled into a single executable binary using **PyInstaller**. 

- **Single Executable (`--onefile`)**: We build using PyInstaller's `EXE()` configuration to bundle all `.so` and `.dll` dependencies into a single artifact. This is required for seamless Tauri Sidecar integration.
- **`yt-dlp` and `FFmpeg` Integration**: PyInstaller uses a custom `.spec` file (`nextract-server.spec`) with `collect_all('yt_dlp')` to ensure yt-dlp's dynamic extractors are fully packaged. FFmpeg is provided externally by the Tauri shell via the `NEXTRACT_FFMPEG_PATH` environment variable.
- **Graceful Shutdown**: The backend constantly monitors for termination signals (sent by Tauri when the main window closes). Through an async lifespan context, it safely marks active downloads as `interrupted` in the SQLite database before terminating.

## 🚀 Development Commands

```bash
# Install dependencies using uv
uv sync

# Run the FastAPI server in development mode
# (This boots uvicorn on http://127.0.0.1:8000 by default)
uv run uvicorn app.main:app --reload

# Run tests
uv run pytest
```

### Building the Standalone Binary
To compile the FastAPI backend for desktop distribution:
```bash
./build-server.sh
```
This script ensures `uv` is available, builds the binary via PyInstaller, and places the resulting executable into the `../src-tauri/binaries/` directory for Tauri to ingest.
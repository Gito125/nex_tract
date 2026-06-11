# Phase 9: Desktop Packaging Implementation Guide

This document details the architecture, code changes, and strategic fixes applied during Phase 9 (Desktop Packaging) of Nextract.

## Overview

Nextract has transitioned from a purely local web application to a fully self-contained desktop application using **Tauri v2**. The goal of this phase was to ensure users can double-click an icon to run the app natively without managing terminals, Python dependencies, or Node.js instances, while keeping our robust FastAPI backend and Next.js frontend intact.

## Architecture

The desktop application uses the **Tauri Sidecar Pattern**:
1. **Frontend**: The Next.js application is compiled as a static HTML/JS/CSS export (`output: 'export'`) and bundled directly into the Tauri WebView.
2. **Backend**: The FastAPI Python application is compiled into a single executable binary using **PyInstaller** (`--onefile` mode) and shipped inside Tauri.
3. **Rust Shell (Tauri)**: When the user opens the Nextract desktop app, Tauri launches the Next.js UI in a hidden WebView, simultaneously spawns the Python binary as a subprocess (Sidecar), and constantly polls the Python `/api/health` endpoint. Once the backend is fully initialized, Tauri reveals the window to the user.
4. **Graceful Shutdown**: When the Tauri window is closed, it cleanly kills the Python sidecar process. In turn, the Python backend intercepts the shutdown signal and gracefully marks any ongoing downloads in the SQLite database as `interrupted` so they can be resumed later.

## Critical Gaps Resolved

During implementation, several edge cases and "gaps" native to cross-platform packaging were identified and preemptively solved:

1. **API Base URL Loading (Frontend)**: Previously, the API URL was resolved statically at module load time. Since Next.js static exports have no window object during build time, this would have locked the frontend to `localhost:8000`. We refactored `web/lib/api.ts` to dynamically resolve `http://127.0.0.1:57000` at runtime by checking for `window.__TAURI__`.
2. **PyInstaller `--onefile` Mode**: PyInstaller originally specified `--onedir` mode for the backend, which extracts libraries to a directory. Tauri's sidecar setup expects a single executable file or very specific targeting. We transitioned the `.spec` file to use `EXE()` (single file) packaging to ensure all `.so`/`.dll` libraries are safely bundled inside the single entry point.
3. **Windows Defender / Antivirus False Positives**: PyInstaller executables compressed with UPX often get silently quarantined by Windows Defender. To mitigate this, `upx=False` was strictly enforced in the `.spec` file.
4. **Rust Configuration Polish**: 
   - Centralized the target port (`57000`) into a `const API_PORT` in Rust to eliminate the risk of mismatched ports between backend environment variables and the frontend API requests.
   - Increased the backend health-check polling timeout to 30 seconds. A large PyInstaller bundle (`yt-dlp` + `uvicorn` + `fastapi`) can sometimes take several seconds to extract to a temporary directory and cold-start on older hard drives.
5. **Automated FFmpeg Dependencies**: The `scripts/build.sh` script was upgraded to automatically download the static `ffmpeg` Linux binary from `johnvansickle.com` if it is missing locally before running Tauri build.

## Detailed Changelog

### 1. Web (Next.js)
- `web/next.config.ts`: Added `output: 'export'`, `trailingSlash: true`, and `images: { unoptimized: true }` to convert the SSR app into a static site.
- `web/lib/api.ts`: Replaced `const API_BASE_URL` with a dynamic `getBaseUrl()` function.

### 2. Tauri Shell (`src-tauri/`)
- `tauri.conf.json`: Configured the build to read from `../web/out` and define the backend binary (`nextract-server`) and FFmpeg executables (`resources`).
- `src/lib.rs`: Handles filesystem resolution for `NEXTRACT_DATA_DIR` (app data), SQLite db path, and system Downloads folder. Spawns the sidecar, manages the hidden loading state, and safely kills the process when the window closes.
- `capabilities/default.json`: Defines Tauri permissions (`shell:allow-execute`, `fs:allow-read-dir`, etc.) required by the app.

### 3. Server (FastAPI)
- `server/app/core/config.py`: The application now detects if `NEXTRACT_ENV == "packaged"`. If packaged, it dynamically reads paths (Data, DB, FFmpeg) and the port (`57000`) passed down by Tauri via environment variables.
- `server/app/workers/queue.py`: Implemented `shutdown_queue()`. On exit, it queries the SQLite DB for any `queued`, `downloading`, or `merging` items and marks them as `interrupted`.
- `server/app/main.py`: Updated with an async `@asynccontextmanager` lifespan event to trigger `shutdown_queue()` upon receiving termination signals.
- `server/nextract-server.spec`: Custom PyInstaller configuration instructing it to fully bundle `yt-dlp` and `uvicorn` using `collect_all('yt_dlp')`.

### 4. Build System
- `scripts/dev.sh`: Re-written to spin up both FastAPI and the Next.js development server simultaneously in the background while routing logs safely.
- `server/build-server.sh`: Installs PyInstaller via `uv` and compiles the Python app into the `src-tauri/binaries` directory under the required target triple (e.g., `x86_64-unknown-linux-gnu`).
- `scripts/build.sh`: The master production build script. It orchestrates downloading FFmpeg, compiling the Python sidecar, statically exporting Next.js, and running `pnpm tauri build`.

---

## How to Build & Test

### Prerequisites (Linux)
Building the Tauri application on Linux requires a few system dependencies. If you haven't installed them, run:
```bash
sudo apt-get update
sudo apt-get install -y libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev patchelf libssl-dev pkg-config libfuse2
```
*(Note: `libfuse2` is required for running `.AppImage` output on Ubuntu 22.04+).*

### Running the Build
Ensure you are in the project root and run:
```bash
./scripts/build.sh
```

**What this does:**
1. Downloads `ffmpeg` if not already present in `src-tauri/resources/`.
2. Packages the Python backend into an executable binary.
3. Builds the Next.js frontend into `web/out/`.
4. Compiles the Rust application and links everything together.

When the build finishes, you will find your installers (e.g., `.deb` and `.AppImage`) located in:
`src-tauri/target/release/bundle/`

### Testing Checklist
1. Launch the `.AppImage` or installed desktop application.
2. Verify the window stays hidden for a few seconds (while the backend boots) and then appears cleanly.
3. Paste a YouTube URL and verify analysis works (proving `yt-dlp` is functioning inside PyInstaller).
4. Initiate a download and check if the real-time progress WebSocket works.
5. Ensure the final video is saved to `~/Downloads/Nextract/`.
6. Close the window and check your system monitor (`ps aux | grep nextract-server`) to ensure the Python background process cleanly exited and didn't zombie.

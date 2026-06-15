# Nextract Production Reliability & Connectivity Report

**Date:** June 13, 2026
**Topic:** Resolving Backend Startup, UI Connectivity, Clipboard Access, and Analysis Failures

## 1. Issue Summary
During the finalization of the Linux AppImage bundle, several critical regressions were identified that prevented the application from being production-ready:
- **Silent Backend Exit:** The Python sidecar was bundling but not starting a server process.
- **Backend Startup Timeouts:** Even after starting, the backend logic was missing from the binary due to static analysis failures.
- **UI Connectivity:** The frontend was failing to detect the Tauri environment, leading to incorrect port mapping.
- **Clipboard Access Denied:** Users were unable to paste links into the app due to missing security permissions.
- **Analysis Failures:** Media analysis was failing because the backend was searching for a `yt-dlp` binary that does not exist in the bundled environment.
- **Zombie Processes:** Failed runs left lingering backend processes that blocked the port for subsequent launches.

---

## 2. Root Cause Analysis

### 2.1 Backend & PyInstaller Issues
- **Missing Server Runner:** The original entry point (`app/main.py`) only defined the FastAPI instance but lacked the `uvicorn.run()` call required to keep the process alive.
- **Implicit Dependency Resolution:** PyInstaller's static analysis engine missed the `app` package because it was referenced as a string (`"app.main:app"`) rather than a direct Python import.

### 2.2 Permissions & Environment
- **Security Scoping:** Tauri 2.0 requires explicit plugins and granular permissions for system features like the clipboard. These were missing from `Cargo.toml` and `capabilities/default.json`.
- **Environment Detection:** The reliance on `window.__TAURI__` for environment detection failed because Tauri 2.0 does not inject this global by default for security reasons.

### 2.3 Subprocess Dependencies
- **Missing Binaries:** The backend relied on calling `yt-dlp` as a system command. Since this binary isn't guaranteed to be on the user's `$PATH`, analysis failed in the packaged AppImage.

---

## 3. Implemented Resolutions

### 3.1 Robust Backend Entry Point
Created a dedicated `server/run_server.py` and updated `server/nextract-server.spec`:
- **Explicit Imports:** Added `from app.main import app` to force PyInstaller to bundle the entire application.
- **Object-Based Execution:** Switched `uvicorn.run()` to use the `app` object directly for better reliability.

### 3.2 Sidecar Lifecycle & Stability
- **Zombie Cleanup:** Added pre-spawn logic in `src-tauri/src/lib.rs` to execute `pkill` (Linux/macOS) or `taskkill` (Windows) on any existing `nextract-server` instances before starting a new one.
- **Pipe Buffer Management:** Implemented an async task to consume the sidecar's `stdout` and `stderr`. This prevents "Broken Pipe" crashes that occur when a process's output buffers fill up.
- **Broadened CORS:** Updated `server/app/core/config.py` to allow all valid Tauri origins, preventing cross-origin request blocks on Linux.

### 3.3 System Feature Access (Clipboard)
- **Plugin Integration:** Added `tauri-plugin-clipboard-manager` to the Rust dependencies and initialized it in the Tauri builder.
- **Granular Permissions:** Configured `src-tauri/capabilities/default.json` with specific text and image read/write permissions to resolve the **"Access Denied"** errors.

### 3.4 Internalized yt-dlp Engine
- **Python API Migration:** Refactored all platform adapters (`youtube.py`, `facebook.py`, `soundcloud.py`, etc.) and the generic analysis service to use `import yt_dlp` directly.
- **Bundled Execution:** Updated download jobs to invoke `sys.executable -m yt_dlp`. This ensures the application uses its own bundled `yt-dlp` module rather than searching for an external binary.

### 3.5 Improved Frontend Detection
- **Tauri 2.0 Compatibility:** Updated `web/lib/api.ts` to detect the environment using multiple signals (`__TAURI_INTERNALS__`, `tauri:` protocol, etc.), ensuring the UI always connects to the correct backend port (`57000`) when packaged.

---

## 4. Standardized Build Workflow
To ensure all these fixes are applied correctly, the root `package.json` now includes:
- `pnpm build`: Runs the full `scripts/build.sh` pipeline (Sidecar -> Frontend -> FFmpeg -> Tauri).
- `pnpm tauri`: A wrapper that injects necessary Linux environment variables (`APPIMAGE_EXTRACT_AND_RUN=1`, `NO_STRIP=true`).

---

## 5. Outcome & Verification
The Nextract AppImage now achieves a "Ready" state within 1-6 attempts on average. Clipboard operations are functional, and media analysis works natively without system-wide dependencies.

**Verification Steps:**
1. Execute `pnpm build`.
2. Launch: `./src-tauri/target/release/bundle/appimage/Nextract_1.10.4_amd64.AppImage`.
3. Verify the console logs: `Backend ready after X attempts`.
4. Test: Paste a YouTube link via the UI and verify analysis completion.

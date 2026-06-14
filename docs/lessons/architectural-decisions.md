# Nextract Architectural Decisions Records (ADR)

This document registers the key architectural and design decisions chosen during the development of Nextract, detailing the rationale behind each choice.

---

## Decision 1: Tauri v2 + Next.js + FastAPI Stack

### Context
Nextract is a media downloader and manager. The core download engines (like `yt-dlp`) and transcoding engines (like `FFmpeg`) are natively written or best supported in Python/C. However, the desktop shell needs to be highly performant, responsive, and cross-platform.

### Decision
We chose a hybrid desktop architecture:
1. **Frontend:** React + Next.js (Static Export `out/`) styled with Vanilla CSS variables.
2. **System Shell:** Rust-based **Tauri v2** for window management, file access, dialogs, clipboard, and auto-updating.
3. **Download Engine:** **FastAPI / Python** server that acts as a sidecar process handling the heavy yt-dlp downloading and database management.

### Rationale
* **Tauri over Electron:** Tauri uses the host system's native Webview (WebView2 on Windows, WebKit on macOS/Linux), resulting in a massive reduction in package size (~15MB vs ~100MB+ for Electron) and RAM usage.
* **Python Backend:** Rather than rewriting the highly complex `yt-dlp` parsing engine in Rust, we bundle a lightweight Python server. This keeps development fast and keeps download logic decoupled.

---

## Decision 2: Backend Sidecar Lifecycle & Port Management

### Context
Because the Python server runs as an independent process, the frontend needs a reliable way to communicate with it, and the desktop shell must guarantee that closing the app doesn't leave zombie Python server instances running in the background.

### Decision
1. **Fixed Port:** The sidecar binds to a fixed local port `57000`.
2. **Zombie Prevention:** Before starting the sidecar, the Rust core runs a clean-up command (`pkill` on Linux/macOS and `taskkill` on Windows) to terminate any hanging instances.
3. **Tauri State Management:** The launched sidecar process child handle is stored in a thread-safe mutex state:
   ```rust
   pub struct SidecarState(pub Mutex<Option<CommandChild>>);
   ```
4. **Explicit Kill on Exit:** Registered a callback on Tauri's `on_window_event` (`CloseRequested`) to retrieve the sidecar state and explicitly kill the backend child process:
   ```rust
   if let Some(child) = guard.take() {
       let _ = child.kill();
   }
   ```

---

## Decision 3: Custom Update Prompts & OS Decoupling

### Context
We want automatic updates for Windows, macOS, and Linux AppImage users, but Linux DEB and RPM packages are traditionally updated via distribution repositories or manual download. Forcing an auto-update on DEB/RPM can break the package manager's ownership of the installation files.

### Decision
* **Auto-Updater (NSIS/DMG/AppImage):** Integrated `tauri-plugin-updater` with a custom frontend overlay modal. Users can "Update Now", "Later", or "Skip Version" (caching skipped versions in `localStorage` so they aren't nagged again).
* **Manual Notification (DEB/RPM):** For Linux packages, we check the latest release using the public GitHub Releases API. If a newer version is available, the app displays a non-intrusive top banner with a link to the download page.
* **Process Relaunch:** To ensure a smooth hot-restart once the update is downloaded, we integrated `tauri-plugin-process` so the app restarts immediately upon clicking "Restart Now".

---

## Decision 4: Platform-Specific Target Configurations

### Context
In Tauri v2, if bundle targets are declared globally in the main configuration file, the build runner on all platforms tries to compile every format. This causes cross-compilation build failures on macOS and Windows runners because they cannot compile formats like Linux `.deb` or `.rpm`.

### Decision
We decoupled the bundle targets using Tauri's platform-specific JSON overrides:
1. Removed the `"targets"` array from the base `tauri.conf.json`.
2. Created separate files:
   * `tauri.linux.conf.json` — specifies targets `["deb", "rpm", "appimage"]`.
   * `tauri.windows.conf.json` — specifies target `["nsis"]`.
   * `tauri.macos.conf.json` — specifies target `["dmg"]`.
3. Tauri automatically detects the host OS at compile time and merges the corresponding overrides file with the base configuration.

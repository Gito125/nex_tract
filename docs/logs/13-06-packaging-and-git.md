# Nextract Multi-Platform Packaging & Git Configuration Report

**Date:** June 13, 2026
**Topic:** Implementing Multi-Platform Installers (Linux RPM/AppImage, Windows NSIS), Tauri Icon Generation, and Git Build Artifact Exclusion

## 1. Issue Summary
As part of transitioning Nextract to a production-grade desktop application (Phase 9), several packaging, asset management, and Git tracking issues required resolution:
- **Limited Package Support:** Packaging was restricted to Debian and AppImage, lacking support for RPM packages and Windows (NSIS) installers.
- **Generic Branding:** The application lacked proper high-resolution icons for desktop shortcuts and window decorations.
- **PyInstaller Bundling Warnings:** Static analysis during backend bundling raised noise warnings regarding missing database modules (`pysqlite2`, `MySQLdb`, `psycopg2`).
- **Untracked Build Artifacts in Git:** Large generated binaries (such as `nextract-server` and `nextract-server-x86_64-unknown-linux-gnu`) were cached and tracked in the repository, bloating the repository size.

---

## 2. Implemented Resolutions

### 2.1 Multi-Platform Packaging Configuration (`src-tauri/tauri.conf.json`)
Enabled comprehensive multi-platform outputs to allow native installations on both Linux distributions and Windows environments:
- **RPM Packaging:** Configured Tauri's Linux bundler targets to include `"appimage"`, `"deb"`, and `"rpm"`. Provided necessary metadata configurations.
- **Windows NSIS Installer:** Configured the Windows bundler target to use `"nsis"` for single-file installer packages.
- **Resource Globbing:** Updated resource paths from `resources/ffmpeg` to `resources/*` to dynamically bundle whichever platform-specific dependency binaries are present.

### 2.2 Branding & Icon Generation
Automated the creation of 30+ platform-specific app icons (ICO, ICNS, PNGs, and mobile formats):
- Leveraged Tauri's command-line icon processor to parse the high-resolution source icon and populate `src-tauri/icons/`.
- Integrated branding outputs into the frontend as `web/app/favicon.ico` and `web/public/icon.png`.

### 2.3 PyInstaller Exclusion Rules
Cleaned up warnings raised during backend compilation by excluding unnecessary database adapters in `server/nextract-server.spec`:
- Explicitly excluded `pysqlite2`, `MySQLdb`, and `psycopg2` from the PyInstaller hidden imports list, preventing redundant build log noise.

### 2.4 Platform-Aware Build Orchestration (`scripts/build.sh`)
Refactored the build scripts to detect host platforms (Linux, Windows, macOS) dynamically:
- Implemented static FFmpeg binary acquisition (pulling johnvansickle release for Linux and Gyan.dev essentials for Windows).
- Set up target-agnostic pathing, permissions, and directory preparation for sidecar and asset distribution.

---

## 3. Git Cache & Exclude Management

To prevent large build assets (upwards of 40MB-80MB each) from polluting the commit history, we cleaned up Git tracking:

### 3.1 Gitignore Additions
Updated the root `.gitignore` to explicitly ignore PyInstaller build outputs and Tauri sidecar binaries:
```gitignore
# production / build
build
server/build/
server/dist/
src-tauri/binaries/
```

### 3.2 Git Cache Eviction
Evicted already-tracked binaries from the Git repository cache, retaining them safely on the local disk:
```bash
git rm --cached server/dist/nextract-server
git rm --cached src-tauri/binaries/nextract-server-x86_64-unknown-linux-gnu
```

Verification via `git status --ignored` confirms that both directories are successfully ignored and marked for deletion from the index.

---

### 3.3 Transparent Icon Corner Correction
The initial source icon was built as a non-transparent JPEG which resulted in solid white corners outside the rounded square border.
- We analyzed the color profile along the diagonal of the 1024x1024 icon to locate the boundary transition.
- Applied an anti-aliased rounded rectangle mask with a corner radius of `176px` using PIL to crop the corners to 100% transparency.
- Regenerated all sizes and formats (ICO, ICNS, PNGs) using `pnpm tauri icon`.
- Copied the transparent PNG and ICO assets to `web/public/icon.png` and `web/app/favicon.ico` for frontend branding consistency.

### 3.4 GitHub Actions Cloud Build Pipeline (`.github/workflows/release.yml`)
To solve the issue of building Windows installers (`.exe`/`.msi`) and macOS packages (`.dmg`) from a Linux development machine, we implemented a GitHub Actions workflow:
- The workflow runs a multi-runner build matrix (`windows-latest`, `macos-latest`, `ubuntu-latest`).
- It automates Python sidecar bundling (using `uv` and PyInstaller), frontend compilation (`pnpm build`), and Rust/Tauri execution (`tauri-action`).
- Releases draft versions automatically on Git tag pushes or via manual trigger (`workflow_dispatch`).

---

## 4. Verification and Future Action

### Build Process (To be run by User):
1. **Local Linux Build**: Run `pnpm build` to compile the sidecar, frontend, and package the AppImage/DEB/RPM targets.
2. **Cloud/Windows Build**: Trigger the "Release Build" workflow on GitHub Actions to compile the Windows NSIS installer and macOS dmg, then download them from the Draft Release page.
3. Inspect `src-tauri/target/release/bundle/` for output binaries.
4. Run `git status` to verify that no new build files or intermediates appear under untracked files.

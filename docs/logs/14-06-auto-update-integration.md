# Nextract Auto-Update Integration Log

**Date:** June 14, 2026
**Topic:** Implementing Auto-Updates with Tauri Built-in Updater, GitHub Release Action, Signing Keys, and Frontend Relaunch

## 1. Context & Goal
To provide a production-grade experience for Windows, macOS, and Linux users, Nextract needs an automatic update mechanism:
- **Windows / macOS / AppImage (Linux):** Auto-updates via Tauri's native `tauri-plugin-updater` with prompt-to-update modal (Update Now, Skip Version, or Later).
- **RPM / DEB (Linux):** Inline notification banner linking to the new release download on GitHub.
- **Relaunch Capability:** Automatically restarting the application immediately after downloading and installing the update.

---

## 2. Integrated Components

### 2.1 Tauri Backend Integration
Registered the updater and process-relaunch plugins to handle the background payload download, verification, and app restart:
- **`src-tauri/Cargo.toml`:** Added dependencies for `tauri-plugin-updater = "2"` and `tauri-plugin-process = "2"`.
- **`src-tauri/src/lib.rs`:** Registered both plugins in the Tauri builder builder block:
  ```rust
  .plugin(tauri_plugin_updater::Builder::new().build())
  .plugin(tauri_plugin_process::init())
  ```
- **`src-tauri/capabilities/default.json`:** Configured capability access to allow updater operations and application relaunching:
  ```json
  "updater:default",
  "process:allow-restart"
  ```
- **`src-tauri/tauri.conf.json`:** Configured the updater endpoint pointing to GitHub Releases, including the public key declaration for cryptographic verification:
  ```json
  "plugins": {
    "updater": {
      "endpoints": [
        "https://github.com/Gito125/nex_tract/releases/latest/download/latest.json"
      ],
      "pubkey": "REPLACE_WITH_REAL_PUBKEY"
    }
  }
  ```

### 2.2 Frontend Components & UI
Built a custom, responsive update check overlay styled using Vanilla CSS tokens matching Nextract's UI system:
- **`web/lib/updater.ts`:** Implemented utility functions for semver version comparison, checking GitHub API releases (fallback for RPM/DEB), and caching skipped versions in `localStorage`.
- **`web/components/updater/update-checker.tsx`:** Custom React component that:
  1. Checks for updates using `@tauri-apps/plugin-updater` or GitHub release fallback.
  2. Displays a premium, blur-background modal with progress bar and options ("Update Now", "Later", "Skip Version").
  3. Uses `@tauri-apps/plugin-process` to relaunch the application smoothly upon completion.
- **`web/app/providers.tsx`:** Mounted the `<UpdateChecker />` component globally so that update checks run automatically when the app loads.

### 2.3 CI/CD & Secure Artifact Signing
Updated `.github/workflows/release.yml` to automatically build, sign, and compile the update manifests on GitHub Actions:
- Integrated Tauri's updater signing variables (`TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`).
- Added automated `latest.json` generation as a build artifact uploaded directly to the corresponding GitHub Release.

---

## 3. Git Release Flow
To trigger a new build and release:
1. Commit changes to your branch.
2. Push tag `v1.13.1` to GitHub, which automatically starts the multi-runner build process in the cloud.
3. The build runner outputs installer files and `latest.json` updater info.

*Note: If a tag was pushed prematurely, it can be deleted locally and remotely, and then re-pushed following the workflow in `docs/CORE-COMMANDS.md`.*

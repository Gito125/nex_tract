# Nextract Lesson: Git Tag Releases, GitHub Actions & Tauri Signing

This document outlines the key lessons learned during the integration of Tauri's auto-updater, multi-platform releases, and secure code-signing pipeline using GitHub Actions.

---

## Lesson 1: How Git Tags Trigger Cloud Builds

In professional desktop app development, local machines (especially Linux) cannot easily compile installer packages for all target operating systems (like `.exe` for Windows or `.dmg` for macOS). We offload this compilation to the cloud using **GitHub Actions**.

* **The Trigger Mechanism:** The cloud builder does not run on normal branch pushes. It is configured in `.github/workflows/release.yml` to trigger only when a Git **tag** matching the pattern `v*` (like `v1.13.1`) is pushed.
* **The Workflow:**
  1. Commit and push your code to your development/main branch.
  2. Create a local tag: `git tag v1.13.1`
  3. Push the tag to GitHub: `git push origin v1.13.1`
  4. The tag push triggers the runner to compile, sign, package, and publish the release.

---

## Lesson 2: Fixing a Prematurely Pushed Tag

A common mistake is tagging and pushing a release *before* staging and committing all final code changes. If this happens, the cloud runner will build the old code, and the new changes will be missing from the release.

### How to completely replace/correct a tag:
Because Git tags are unique pointers, you must delete the old tag from both your local machine and your GitHub remote before re-creating it:

```bash
# 1. Delete the incorrect tag locally
git tag -d v1.13.1

# 2. Delete the incorrect tag from the GitHub remote repository
git push origin :refs/tags/v1.13.1

# 3. Stage, commit, and push your latest code changes to your branch
git add .
git commit -m "feat: complete all changes before tagging"
git push origin main

# 4. Re-create the tag on the new commit and push it to trigger the clean build
git tag v1.13.1
git push origin v1.13.1
```

---

## Lesson 3: The Tauri v2 Updater & Process Relaunch Relationship

To implement a complete auto-update workflow in Tauri v2, you need **two** distinct plugins working together:

1. **`tauri-plugin-updater`**: Handles checking the remote manifest (`latest.json`), downloading the new installer package, verifying the signature, and running the installer.
2. **`tauri-plugin-process`**: Handles restarting (relaunching) the application once the new files are in place.

### The Backend Setup (`Cargo.toml`, `lib.rs`, and capabilities)
Both plugins must be declared as dependencies and registered in the Rust core:
* **Cargo.toml**:
  ```toml
  tauri-plugin-updater = "2"
  tauri-plugin-process = "2"
  ```
* **lib.rs**:
  ```rust
  .plugin(tauri_plugin_updater::Builder::new().build())
  .plugin(tauri_plugin_process::init())
  ```
* **capabilities/default.json** (Permissions):
  ```json
  "updater:default",
  "process:allow-restart"
  ```

### The Frontend Setup
In Next.js, the updater downloads the package, but the app must be programmatically restarted. This requires importing the `relaunch` utility:
```typescript
import { relaunch } from "@tauri-apps/plugin-process";

async function handleRestart() {
  try {
    await relaunch();
  } catch {
    window.location.reload(); // fallback
  }
}
```

---

## Lesson 4: Cryptographic Signing & Secret Management

To prevent malicious updates, Tauri enforces cryptographic signing. The application will refuse to install any update package that is not signed by your private key.

* **Key Generation:** We generate a key pair (`.key` private key and a public key string) locally using `tauri-cli`.
* **Repository Secrets:** The private key and its password are highly sensitive. They are never committed to Git. Instead, they are stored in **GitHub Repository Secrets** under:
  `Settings → Secrets and variables → Actions → New repository secret`
  * `TAURI_SIGNING_PRIVATE_KEY`: The content of the private key file.
  * `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: The password chosen for the key.
* **Public Verification:** The corresponding public key is safe to share and is placed directly inside `src-tauri/tauri.conf.json` so the app can verify incoming downloads.

---

## Lesson 5: Platform-Specific Configuration & Bundle Targets

In a multi-platform Tauri application, different operating systems require different package bundles (e.g., Linux uses `.deb`/`.rpm`/`.AppImage`, Windows uses `.exe`/`msi`, and macOS uses `.dmg`/`.pkg`). 

### The Problem with Global Targets
If bundle targets are configured globally in the main `tauri.conf.json`:
```json
"targets": ["deb", "rpm", "appimage", "nsis"]
```
Tauri will attempt to compile all listed targets on whatever operating system runs the build. 
* Building on **macOS** will fail because it cannot compile Windows `nsis` or Linux `deb`/`rpm`/`appimage` packages.
* Building on **Windows** will fail because it cannot compile Linux formats.
* This results in a build compilation crash: `Command "pnpm ["tauri","build"]" failed with exit code 1`.

### The Solution: Platform Overrides
Tauri v2 allows creating platform-specific configuration files that are automatically detected and merged with the base `tauri.conf.json` at build time.

1. **Remove** the global `"targets"` array from your main `src-tauri/tauri.conf.json`.
2. **Create** three files in your `src-tauri/` directory:
   * **`tauri.linux.conf.json`**:
     ```json
     {
       "bundle": {
         "targets": ["deb", "rpm", "appimage"]
       }
     }
     ```
   * **`tauri.windows.conf.json`**:
     ```json
     {
       "bundle": {
         "targets": ["nsis"]
       }
     }
     ```
   * **`tauri.macos.conf.json`**:
     ```json
     {
       "bundle": {
         "targets": ["dmg"]
       }
     }
     ```

Tauri automatically merges these files with `tauri.conf.json` based on the host OS executing the build runner, preventing invalid target cross-compilation errors!


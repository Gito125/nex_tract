# Release Checklist

This document outlines the step-by-step procedure for preparing, validating, and publishing a new release of Nextract.

## 1. Version Bump & Changelog

- [ ] Review recent commits to identify all features, bug fixes, and breaking changes.
- [ ] Determine the new semantic version number (`MAJOR.MINOR.PATCH`).
- [ ] Update the version number in `package.json` (root).
- [ ] Update the version number in `src-tauri/tauri.conf.json`.
- [ ] Update the version number in `server/pyproject.toml` (if applicable).
- [ ] Draft a new section in the `CHANGELOG.md` detailing the changes (if a changelog is maintained).

## 2. Local Environment Checks

- [ ] Ensure your local working tree is clean (`git status`).
- [ ] Pull the latest changes from the `main` branch.
- [ ] Verify `ffmpeg` binary exists in `src-tauri/resources/` or ensure the build script downloads it correctly.

## 3. Linting and Testing

- [ ] **Frontend**: Run frontend linters and type checkers.
  ```bash
  cd web
  pnpm run lint
  pnpm tsc --noEmit
  ```
- [ ] **Backend**: Run backend linters and test suites.
  ```bash
  cd server
  uv run ruff check .
  uv run pytest
  ```

## 4. Full Production Build

Run the master build script to ensure all components compile and package correctly on the target OS:

```bash
./scripts/build.sh
```

- [ ] Verify the PyInstaller backend compilation succeeds.
- [ ] Verify the Next.js static export succeeds (`web/out/` is populated).
- [ ] Verify the Tauri build succeeds without critical warnings.

## 5. Artifact Verification

Locate the compiled installers in `src-tauri/target/release/bundle/`.

- [ ] **Install Test**: Install the `.deb` or run the `.AppImage` on a clean system or VM (if possible) to check for missing shared libraries.
- [ ] **Launch Test**: Open the application. Ensure the UI loads after the Python backend finishes booting.
- [ ] **Functional Test**: Paste a known valid URL, analyze it, and complete a full download.
- [ ] **Shutdown Test**: Ensure the background sidecar terminates correctly when the main window is closed.

## 6. Git Tagging & GitHub Release

- [ ] Commit the version bumps:
  ```bash
  git add .
  git commit -m "chore: release vX.Y.Z"
  ```
- [ ] Create a git tag for the version:
  ```bash
  git tag -a vX.Y.Z -m "Release vX.Y.Z"
  ```
- [ ] Push the commit and tag to the remote repository:
  ```bash
  git push origin main
  git push origin vX.Y.Z
  ```
- [ ] In GitHub, navigate to **Releases -> Draft a new release**.
- [ ] Select the `vX.Y.Z` tag.
- [ ] Copy the changelog notes into the release description.
- [ ] Upload the built binary artifacts (e.g., `.deb`, `.AppImage`) from `src-tauri/target/release/bundle/` to the release assets.
- [ ] Publish the release!
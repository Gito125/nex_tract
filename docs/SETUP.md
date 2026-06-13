# Developer Setup Guide

This guide will walk you through setting up Nextract for local development. These instructions are currently tailored for **Linux** environments (specifically Debian/Ubuntu).

## 1. System Prerequisites

Nextract requires several system-level dependencies for the Tauri WebView, window management, and build processes.

```bash
# Update package list
sudo apt-get update

# Install Tauri prerequisites and build tools
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  patchelf \
  libssl-dev \
  pkg-config \
  libfuse2 \
  build-essential \
  curl \
  wget
```
*(Note: `libfuse2` is specifically required to run generated `.AppImage` output on Ubuntu 22.04+).*

## 2. Toolchain Installation

You need Node.js, Rust, and Python installed on your system.

### Install Rust
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
# Follow the prompts, then restart your terminal or source your env:
source "$HOME/.cargo/env"
```

### Install Node.js & pnpm
Use [nvm](https://github.com/nvm-sh/nvm) or your system package manager to install Node.js (v20+ recommended). Then install `pnpm`:
```bash
npm install -g pnpm
```

### Install Python & uv
Ensure you have Python 3.12+ installed. Nextract uses `uv` for lightning-fast Python dependency management.
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
# Restart terminal or source env
source $HOME/.cargo/env
```

## 3. Project Initialization

Clone the repository and initialize the project:

```bash
# Clone the repository
git clone https://github.com/your-org/nex_tract.git
cd nex_tract

# Install frontend dependencies
pnpm install

# Install backend dependencies
cd server
uv sync
cd ..
```

## 4. Running the App Locally

To start developing, you can use the centralized dev script which spins up both the FastAPI backend and the Next.js frontend simultaneously:

```bash
./scripts/dev.sh
```
- Frontend will be available at: `http://localhost:3000`
- Backend API will be available at: `http://127.0.0.1:8000`
- API Docs (Swagger): `http://127.0.0.1:8000/docs`

## 5. Building the Desktop App (Tauri)

To test the compiled native desktop application:

```bash
./scripts/build.sh
```

**What the build script does:**
1. Downloads a static `ffmpeg` Linux binary to `src-tauri/resources/` (if missing).
2. Uses PyInstaller to bundle the Python backend into a single executable binary under `src-tauri/binaries/`.
3. Performs a Next.js static export to `web/out/`.
4. Runs `pnpm tauri build` to compile the Rust shell and link all assets.

The final built installers (like `.deb` and `.AppImage`) will be available in `src-tauri/target/release/bundle/`.
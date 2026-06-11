#!/usr/bin/env bash
set -e

[ -f "$HOME/.cargo/env" ] && source "$HOME/.cargo/env"

# Resolve the project root (directory containing this script)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

echo "=== Nextract Production Build ==="
echo "Project root: $PROJECT_ROOT"

# ── Download FFmpeg if not present ──────────────────────────────────────────
mkdir -p "$PROJECT_ROOT/src-tauri/resources"
if [ ! -f "$PROJECT_ROOT/src-tauri/resources/ffmpeg" ]; then
    echo "Downloading FFmpeg for Linux..."
    cd /tmp
    wget -q https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz
    tar xf ffmpeg-release-amd64-static.tar.xz
    cp ffmpeg-*-amd64-static/ffmpeg "$PROJECT_ROOT/src-tauri/resources/ffmpeg"
    chmod +x "$PROJECT_ROOT/src-tauri/resources/ffmpeg"
    rm -rf ffmpeg-*-amd64-static* ffmpeg-release-amd64-static.tar.xz
    cd "$PROJECT_ROOT"
fi

# ── Step 1: Build Python sidecar ─────────────────────────────────────────────
echo "[1/3] Building Python server..."
cd "$PROJECT_ROOT/server"
bash build-server.sh
cd "$PROJECT_ROOT"

# ── Step 2: Build Next.js static export ──────────────────────────────────────
echo "[2/3] Building frontend..."
cd "$PROJECT_ROOT/web"
pnpm install
pnpm build
cd "$PROJECT_ROOT"

# ── Step 3: Build Tauri app ───────────────────────────────────────────────────
# pnpm tauri build MUST run from the directory that contains package.json
# with @tauri-apps/cli installed. That is the PROJECT ROOT, not web/.
echo "[3/3] Building Tauri app..."
cd "$PROJECT_ROOT"

# If no root package.json exists yet, bootstrap it
if [ ! -f "package.json" ]; then
    echo "No root package.json found. Initialising..."
    pnpm init
    pnpm add -D @tauri-apps/cli
fi

pnpm tauri build

echo ""
echo "=== Build complete ==="
echo "Installer located in: src-tauri/target/release/bundle/"
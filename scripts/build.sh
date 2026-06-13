#!/usr/bin/env bash
set -e

[ -f "$HOME/.cargo/env" ] && source "$HOME/.cargo/env"

# Resolve the project root (directory containing this script)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=== Nextract Production Build ==="
echo "Project root: $PROJECT_ROOT"

# ── Detect OS ──────────────────────────────────────────────────────────────
OS="$(uname -s)"
case "$OS" in
    Linux*)   PLATFORM="linux"  ;;
    Darwin*)  PLATFORM="macos"  ;;
    MINGW*|MSYS*|CYGWIN*) PLATFORM="windows" ;;
    *) echo "Unsupported OS: $OS"; exit 1 ;;
esac

echo "Detected platform: $PLATFORM"

# ── Download FFmpeg if not present ──────────────────────────────────────────
mkdir -p "$PROJECT_ROOT/src-tauri/resources"

if [ "$PLATFORM" = "linux" ]; then
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
elif [ "$PLATFORM" = "windows" ]; then
    if [ ! -f "$PROJECT_ROOT/src-tauri/resources/ffmpeg.exe" ]; then
        echo "Downloading FFmpeg for Windows..."
        cd /tmp
        curl -sL -o ffmpeg-win.zip https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip
        unzip -qo ffmpeg-win.zip
        cp ffmpeg-*-essentials_build/bin/ffmpeg.exe "$PROJECT_ROOT/src-tauri/resources/ffmpeg.exe"
        rm -rf ffmpeg-*-essentials_build ffmpeg-win.zip
        cd "$PROJECT_ROOT"
    fi
elif [ "$PLATFORM" = "macos" ]; then
    if [ ! -f "$PROJECT_ROOT/src-tauri/resources/ffmpeg" ]; then
        echo "FFmpeg not found. Install via: brew install ffmpeg"
        echo "Then copy ffmpeg to src-tauri/resources/ffmpeg"
        exit 1
    fi
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

# Export environment variables for AppImage bundling on modern Linux
export APPIMAGE_EXTRACT_AND_RUN=1
export NO_STRIP=true

pnpm tauri build

echo ""
echo "=== Build complete ==="
echo "Installers located in: src-tauri/target/release/bundle/"

# List generated bundles
if [ -d "$PROJECT_ROOT/src-tauri/target/release/bundle" ]; then
    echo ""
    echo "Generated packages:"
    find "$PROJECT_ROOT/src-tauri/target/release/bundle" \
        -maxdepth 2 -type f \
        \( -name "*.deb" -o -name "*.rpm" -o -name "*.AppImage" \
           -o -name "*.exe" -o -name "*.msi" -o -name "*.dmg" \) \
        -exec echo "  → {}" \;
fi
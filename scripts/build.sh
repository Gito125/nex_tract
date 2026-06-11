#!/usr/bin/env bash
set -e

[ -f "$HOME/.cargo/env" ] && source "$HOME/.cargo/env"

echo "=== Nextract Production Build ==="

# Download FFmpeg if not present
mkdir -p src-tauri/resources
if [ ! -f "src-tauri/resources/ffmpeg" ]; then
    echo "Downloading FFmpeg for Linux..."
    wget -q https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz
    tar xf ffmpeg-release-amd64-static.tar.xz
    cp ffmpeg-*-amd64-static/ffmpeg src-tauri/resources/ffmpeg
    chmod +x src-tauri/resources/ffmpeg
    rm -rf ffmpeg-*-amd64-static* ffmpeg-release-amd64-static.tar.xz
fi

# Step 1: Build Python sidecar
echo "[1/3] Building Python server..."
cd server
bash build-server.sh
cd ..

# Step 2: Build Next.js static export
echo "[2/3] Building frontend..."
cd web
pnpm install
pnpm build
cd ..

# Step 3: Build Tauri app
echo "[3/3] Building Tauri app..."
pnpm tauri build

echo ""
echo "=== Build complete ==="
echo "Installer located in: src-tauri/target/release/bundle/"

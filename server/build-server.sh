#!/usr/bin/env bash
set -e

echo "Building Nextract Python server..."

cd "$(dirname "$0")"

uv add --dev pyinstaller

uv run pyinstaller nextract-server.spec --clean --noconfirm

# Detect OS and architecture for Tauri sidecar naming
case "$(uname -s)" in
    Linux*)   TARGET="x86_64-unknown-linux-gnu"; EXT="" ;;
    Darwin*)
        if [ "$(uname -m)" = "arm64" ]; then
            TARGET="aarch64-apple-darwin"
        else
            TARGET="x86_64-apple-darwin"
        fi
        EXT="" ;;
    MINGW*|MSYS*|CYGWIN*)
        TARGET="x86_64-pc-windows-msvc"
        EXT=".exe" ;;
    *) echo "Unsupported OS: $(uname -s)"; exit 1 ;;
esac

BINARY_DIR="../src-tauri/binaries"

mkdir -p "$BINARY_DIR"

# Copy the single file executable
cp "dist/nextract-server${EXT}" "$BINARY_DIR/nextract-server-${TARGET}${EXT}"
chmod +x "$BINARY_DIR/nextract-server-${TARGET}${EXT}"

echo "Done. Binary at: $BINARY_DIR/nextract-server-${TARGET}${EXT}"

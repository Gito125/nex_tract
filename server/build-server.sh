#!/usr/bin/env bash
set -e

echo "Building Nextract Python server..."

cd "$(dirname "$0")"

uv add --dev pyinstaller

uv run pyinstaller nextract-server.spec --clean --noconfirm

TARGET="x86_64-unknown-linux-gnu"
BINARY_DIR="../src-tauri/binaries"

mkdir -p "$BINARY_DIR"

# Copy the single file executable
cp "dist/nextract-server" "$BINARY_DIR/nextract-server-${TARGET}"
chmod +x "$BINARY_DIR/nextract-server-${TARGET}"

echo "Done. Binary at: $BINARY_DIR/nextract-server-${TARGET}"

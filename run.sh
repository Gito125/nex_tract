#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

COMMAND=${1:-dev}

cleanup() {
  echo "Shutting down servers..."
  trap - INT TERM EXIT
  kill 0
}

trap cleanup INT TERM EXIT

echo "Starting Nextract in $COMMAND mode..."

if [ "$COMMAND" = "dev" ]; then
  (
    echo "Starting backend (dev)..."
    cd "$ROOT_DIR/server"
    uv run uvicorn app.main:app --reload --port 8000
  ) &
  (
    echo "Starting frontend (dev)..."
    cd "$ROOT_DIR"
    pnpm --filter @nextract/web dev
  ) &
  wait
elif [ "$COMMAND" = "start" ]; then
  (
    echo "Starting backend (prod)..."
    cd "$ROOT_DIR/server"
    uv run uvicorn app.main:app --port 8000
  ) &
  (
    echo "Starting frontend (prod)..."
    cd "$ROOT_DIR"
    pnpm --filter @nextract/web start
  ) &
  wait
else
  echo "Unknown command: $COMMAND"
  echo "Usage: ./run.sh [dev|start]"
  exit 1
fi

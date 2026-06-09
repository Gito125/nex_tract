#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cleanup() {
  trap - INT TERM EXIT
  kill 0
}

trap cleanup INT TERM EXIT

(
  cd "$ROOT_DIR/server"
  uv run uvicorn app.main:app --reload
) &

(
  cd "$ROOT_DIR"
  pnpm --filter @nextract/web dev
) &

wait

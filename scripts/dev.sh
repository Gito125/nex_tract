#!/usr/bin/env bash
set -e

# Start backend
cd server
uv run uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!

# Start frontend dev server
cd ../web
pnpm dev &
FRONTEND_PID=$!

echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "Dev mode: open http://localhost:3000"
echo "To run the Tauri desktop in dev mode: pnpm tauri dev (from project root)"
echo ""
echo "Press Ctrl+C to stop all processes."

cleanup() {
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}
trap cleanup SIGINT SIGTERM

wait

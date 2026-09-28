#!/bin/bash
# Gallows Rock launcher — starts a tiny local web server and opens the game in your browser.
cd "$(dirname "$0")"
PORT=8642
while lsof -i :$PORT >/dev/null 2>&1; do PORT=$((PORT+1)); done
echo "Starting Gallows Rock on http://localhost:$PORT  (close this window to stop)"
( sleep 1; open "http://localhost:$PORT/" ) &
exec python3 -m http.server "$PORT" --bind 127.0.0.1

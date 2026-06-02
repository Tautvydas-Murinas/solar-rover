#!/bin/bash
# Run on the Raspberry Pi: camera stream (8000) + control panel (8080)
set -e
cd "$(dirname "$0")"

python3 stream.py &
STREAM_PID=$!
trap 'kill "$STREAM_PID" 2>/dev/null' EXIT

cd server
node index.js

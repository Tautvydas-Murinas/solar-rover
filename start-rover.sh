#!/bin/bash
# Run on the Raspberry Pi: camera stream (8000) + control panel (8080)
set -e
cd "$(dirname "$0")"

echo "Starting camera stream (stream.py)..."
python3 stream.py &
STREAM_PID=$!
trap 'kill "$STREAM_PID" 2>/dev/null' EXIT

echo "Waiting for camera on port 8000..."
ready=0
for i in $(seq 1 30); do
  if curl -sf http://127.0.0.1:8000/health >/dev/null 2>&1; then
    status=$(curl -s http://127.0.0.1:8000/health)
    if echo "$status" | grep -q '"ready": true'; then
      ready=1
      break
    fi
    if echo "$status" | grep -q '"error":'; then
      echo "Camera error: $status"
      echo "Run 'python3 stream.py' alone to see the full error."
      exit 1
    fi
  fi
  sleep 1
done

if [ "$ready" -ne 1 ]; then
  echo "Camera did not become ready in 30s."
  echo "Check: python3 stream.py"
  exit 1
fi

echo "Starting control panel..."
cd server
node index.js

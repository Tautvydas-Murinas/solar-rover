#!/bin/bash
# Run on the Raspberry Pi: camera stream (8000) + control panel (8080)
set -e
cd "$(dirname "$0")"

CAMERA_WAIT_SECS="${CAMERA_WAIT_SECS:-60}"

check_camera_health() {
  curl -sf http://127.0.0.1:8000/health 2>/dev/null | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
except Exception:
    sys.exit(3)
if data.get('ready'):
    sys.exit(0)
if data.get('error'):
    print(data['error'], file=sys.stderr)
    sys.exit(2)
sys.exit(1)
"
}

echo "Starting camera stream (stream.py)..."
python3 stream.py &
STREAM_PID=$!
trap 'kill "$STREAM_PID" 2>/dev/null' EXIT

echo "Waiting for camera (up to ${CAMERA_WAIT_SECS}s)..."
ready=0
for i in $(seq 1 "$CAMERA_WAIT_SECS"); do
  set +e
  err_msg=$(check_camera_health 2>&1)
  code=$?
  set -e

  if [ "$code" -eq 0 ]; then
    ready=1
    echo "Camera ready."
    break
  fi
  if [ "$code" -eq 2 ]; then
    echo "Camera error: $err_msg"
    exit 1
  fi

  if [ $((i % 5)) -eq 0 ]; then
    echo "  still waiting... (${i}s)"
  fi
  sleep 1
done

if [ "$ready" -ne 1 ]; then
  echo "Camera did not become ready in ${CAMERA_WAIT_SECS}s."
  echo "Run: python3 stream.py"
  exit 1
fi

PI_IP=$(hostname -I | awk '{print $1}')
echo "Starting control panel..."
echo "Open http://${PI_IP}:8080 in your browser"
cd server
node index.js

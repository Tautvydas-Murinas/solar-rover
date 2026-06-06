#!/usr/bin/env python3
"""MJPEG camera stream for the rover control panel (port 8000, /stream.mjpg)."""

import io
import json
import logging
import socketserver
import threading
from http import server
from threading import Condition
from urllib.parse import urlparse

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

HOST = ""
PORT = 8000
STREAM_PATH = "/stream.mjpg"

output = None
picam2 = None
camera = {"ready": False, "error": None}


class StreamingOutput(io.BufferedIOBase):
    def __init__(self):
        self.frame = None
        self.condition = Condition()

    def write(self, buf):
        with self.condition:
            self.frame = buf
            self.condition.notify_all()
        return len(buf)


class StreamingHandler(server.BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        logging.info("%s - %s", self.address_string(), fmt % args)

    def do_GET(self):
        path = urlparse(self.path).path

        if path == "/health":
            body = json.dumps(
                {"ready": camera["ready"], "error": camera["error"]}
            ).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        if path != STREAM_PATH:
            self.send_error(404)
            return

        if camera["error"]:
            self.send_error(503, f"Camera error: {camera['error']}")
            return

        if not camera["ready"] or output is None:
            self.send_error(503, "Camera still starting")
            return

        self.send_response(200)
        self.send_header("Age", 0)
        self.send_header("Cache-Control", "no-cache, private")
        self.send_header("Pragma", "no-cache")
        self.send_header("Content-Type", "multipart/x-mixed-replace; boundary=FRAME")
        self.end_headers()
        try:
            while True:
                with output.condition:
                    output.condition.wait()
                    frame = output.frame
                if not frame:
                    continue
                self.wfile.write(b"--FRAME\r\n")
                self.wfile.write(b"Content-Type: image/jpeg\r\n")
                self.wfile.write(f"Content-Length: {len(frame)}\r\n\r\n".encode())
                self.wfile.write(frame)
                self.wfile.write(b"\r\n")
        except (BrokenPipeError, ConnectionResetError, OSError):
            pass


class StreamingServer(socketserver.ThreadingMixIn, server.HTTPServer):
    allow_reuse_address = True
    daemon_threads = True


def init_camera():
    global output, picam2
    try:
        from picamera2 import Picamera2
        from picamera2.encoders import JpegEncoder
        from picamera2.outputs import FileOutput
    except ImportError:
        camera["error"] = (
            "picamera2 not installed. Run: sudo apt install -y python3-picamera2"
        )
        logging.error(camera["error"])
        return

    try:
        logging.info("Opening camera...")
        picam2 = Picamera2()
        picam2.configure(picam2.create_video_configuration(main={"size": (640, 480)}))
        output = StreamingOutput()
        picam2.start_recording(JpegEncoder(), FileOutput(output))
        camera["ready"] = True
        logging.info("Camera ready")
    except Exception as exc:
        camera["error"] = str(exc)
        logging.error("Camera failed: %s", exc)


def main():
    logging.info("HTTP server on http://0.0.0.0:%s (stream at %s)", PORT, STREAM_PATH)
    threading.Thread(target=init_camera, daemon=True).start()

    httpd = StreamingServer((HOST, PORT), StreamingHandler)
    try:
        httpd.serve_forever()
    finally:
        if picam2 is not None:
            picam2.stop_recording()


if __name__ == "__main__":
    main()

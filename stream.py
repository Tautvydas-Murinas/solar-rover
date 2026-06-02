#!/usr/bin/env python3
"""MJPEG camera stream for the rover control panel (port 8000, /stream.mjpg)."""

import io
import logging
import socketserver
from http import server
from threading import Condition

logging.basicConfig(level=logging.INFO)

try:
    from picamera2 import Picamera2
    from picamera2.encoders import JpegEncoder
    from picamera2.outputs import FileOutput
except ImportError as exc:
    raise SystemExit(
        "picamera2 is required on the Raspberry Pi. Install with: sudo apt install -y python3-picamera2"
    ) from exc

HOST = ""
PORT = 8000
STREAM_PATH = "/stream.mjpg"


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
        if self.path == STREAM_PATH:
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
                    self.wfile.write(b"--FRAME\r\n")
                    self.send_header("Content-Type", "image/jpeg")
                    self.send_header("Content-Length", str(len(frame)))
                    self.end_headers()
                    self.wfile.write(frame)
                    self.wfile.write(b"\r\n")
            except (BrokenPipeError, ConnectionResetError):
                pass
        else:
            self.send_error(404)
            self.end_headers()


class StreamingServer(socketserver.ThreadingMixIn, server.HTTPServer):
    allow_reuse_address = True
    daemon_threads = True


def main():
    global output
    picam2 = Picamera2()
    picam2.configure(picam2.create_video_configuration(main={"size": (640, 480)}))
    output = StreamingOutput()
    picam2.start_recording(JpegEncoder(), FileOutput(output))

    logging.info("MJPEG stream at http://0.0.0.0:%s%s", PORT, STREAM_PATH)
    try:
        StreamingServer((HOST, PORT), StreamingHandler).serve_forever()
    finally:
        picam2.stop_recording()


if __name__ == "__main__":
    main()

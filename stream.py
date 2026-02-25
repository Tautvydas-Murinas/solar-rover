from picamera2 import Picamera2
from flask import Flask, Response
import cv2

app = Flask(__name__)

# Configure Pi Camera
picam2 = Picamera2()
config = picam2.create_preview_configuration(main={"size": (640, 480)})
picam2.configure(config)
picam2.start()

def generate():
    while True:
        frame = picam2.capture_array()
        ret, jpeg = cv2.imencode(".jpg", frame)
        if not ret:
            continue
        yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' +
               jpeg.tobytes() + b'\r\n')

@app.route("/stream.mjpg")
def stream():
    return Response(generate(), mimetype="multipart/x-mixed-replace; boundary=frame")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, threaded=True)
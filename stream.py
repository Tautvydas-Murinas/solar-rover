from picamera2 import Picamera2
from flask import Flask, Response

app = Flask(__name__)
picam2 = Picamera2()
picam2.start()

def generate():
    while True:
        frame = picam2.capture_array()
        # Encode to JPEG
        from cv2 import imencode
        ret, jpeg = imencode(".jpg", frame)
        if not ret:
            continue
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + jpeg.tobytes() + b'\r\n')

@app.route('/stream.mjpg')
def stream():
    return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
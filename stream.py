from flask import Flask, Response
import io
import picamera

app = Flask(__name__)

def gen():
    with picamera.PiCamera() as camera:
        camera.resolution = (640, 480)
        camera.framerate = 24
        stream = io.BytesIO()
        for _ in camera.capture_continuous(stream, 'jpeg', use_video_port=True):
            stream.seek(0)
            frame = stream.read()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
            stream.seek(0)
            stream.truncate()

@app.route('/video_feed')
def video_feed():
    return Response(gen(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/')
def index():
    return """<html><body>
              <h1>Raspberry Pi Camera Stream</h1>
              <img src="/video_feed" width="640" height="480" />
              </body></html>"""

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, threaded=True)

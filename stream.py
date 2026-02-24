
# MJPEG streaming server for Pi Camera
import cv2
from aiohttp import web
import asyncio

async def mjpeg_handler(request):
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        return web.Response(status=500, text="Camera not found")

    response = web.StreamResponse(
        status=200,
        reason='OK',
        headers={
            'Content-Type': 'multipart/x-mixed-replace; boundary=frame'
        }
    )
    await response.prepare(request)

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                await asyncio.sleep(0.1)
                continue
            ret, jpeg = cv2.imencode('.jpg', frame)
            if not ret:
                await asyncio.sleep(0.1)
                continue
            data = jpeg.tobytes()
            await response.write(b'--frame\r\n')
            await response.write(b'Content-Type: image/jpeg\r\n')
            await response.write(f'Content-Length: {len(data)}\r\n\r\n'.encode())
            await response.write(data)
            await response.write(b'\r\n')
            await asyncio.sleep(0.05)  # ~20 FPS
    except asyncio.CancelledError:
        pass
    finally:
        cap.release()
        await response.write_eof()
    return response

app = web.Application()
app.router.add_get('/stream.mjpg', mjpeg_handler)

if __name__ == '__main__':
    web.run_app(app, host='192.168.1.229', port=8000)

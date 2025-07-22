from aiohttp import web
import cv2

cap = cv2.VideoCapture(0)

async def mjpeg_handler(request):
    response = web.StreamResponse(
        status=200,
        reason='OK',
        headers={
            'Content-Type': 'multipart/x-mixed-replace; boundary=frame',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        }
    )
    await response.prepare(request)

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        _, jpeg = cv2.imencode('.jpg', frame)
        jpg_bytes = jpeg.tobytes()

        await response.write(b'--frame\r\n')
        await response.write(b'Content-Type: image/jpeg\r\n')
        await response.write(f'Content-Length: {len(jpg_bytes)}\r\n\r\n'.encode())
        await response.write(jpg_bytes)
        await response.write(b'\r\n')

        await asyncio.sleep(0.05)  # ~20 FPS

    return response

app = web.Application()
app.router.add_get('/stream', mjpeg_handler)

web.run_app(app, host='0.0.0.0', port=8000)

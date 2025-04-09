from aiortc import VideoStreamTrack
from aiohttp import web

class PiCameraStream(VideoStreamTrack):
    async def recv(self):
        frame = get_camera_frame()
        return frame

async def offer(request):
    return web.Response(text="WebRTC stream ready")

app = web.Application()
app.router.add_post("/offer", offer)
web.run_app(app, port=8080)
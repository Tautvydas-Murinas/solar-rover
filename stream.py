from aiortc import VideoStreamTrack, RTCPeerConnection
from aiohttp import web
from av import VideoFrame

def get_camera_frame():
    return VideoFrame.from_ndarray(np.zeros((720, 1280, 3), dtype=np.uint8), format='bgr24')

class PiCameraStream(VideoStreamTrack):
    def __init__(self):
        super().__init__()
        self._frame = None

    async def recv(self):
        frame = get_camera_frame()
        return frame

async def offer(request):
    params = await request.json()
    offer_sdp = params['sdp']
    pc = RTCPeerConnection()

    local_video_track = PiCameraStream()
    pc.addTrack(local_video_track)

    await pc.setRemoteDescription(offer_sdp)

    answer_sdp = await pc.createAnswer()
    await pc.setLocalDescription(answer_sdp)

    return web.json_response({'sdp': pc.localDescription.sdp})

app = web.Application()
app.router.add_post("/offer", offer)
web.run_app(app, port=8080)

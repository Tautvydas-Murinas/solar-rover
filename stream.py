from aiohttp import web
import numpy as np
import cv2
from aiortc import VideoStreamTrack, RTCPeerConnection, RTCSessionDescription
from av import VideoFrame

cap = cv2.VideoCapture(0)

class PiCameraStream(VideoStreamTrack):
    def __init__(self):
        super().__init__()

    async def recv(self):
        pts, time_base = await self.next_timestamp()
        ret, frame = cap.read()
        if not ret:
            frame = np.zeros((720, 1280, 3), dtype=np.uint8)
        video_frame = VideoFrame.from_ndarray(frame, format="bgr24")
        video_frame.pts = pts
        video_frame.time_base = time_base
        return video_frame

async def offer(request):
    if request.method == "OPTIONS":
        # Reply to preflight request
        headers = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        }
        return web.Response(status=204, headers=headers)

    params = await request.json()
    offer = RTCSessionDescription(sdp=params['sdp'], type=params['type'])

    pc = RTCPeerConnection()
    local_video = PiCameraStream()
    pc.addTrack(local_video)

    await pc.setRemoteDescription(offer)
    answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }
    return web.json_response({'sdp': pc.localDescription.sdp, 'type': pc.localDescription.type}, headers=headers)

app = web.Application()
app.router.add_route("*", "/offer", offer)

if __name__ == "__main__":
    web.run_app(app, host="0.0.0.0", port=8000)

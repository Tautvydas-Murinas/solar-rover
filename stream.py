import numpy as np
import cv2
from aiortc import VideoStreamTrack, RTCPeerConnection, RTCSessionDescription
from aiohttp import web
from av import VideoFrame

# OpenCV video capture from default camera (e.g., /dev/video0)
cap = cv2.VideoCapture(0)

class PiCameraStream(VideoStreamTrack):
    def __init__(self):
        super().__init__()

    async def recv(self):
        pts, time_base = await self.next_timestamp()

        ret, frame = cap.read()
        if not ret:
            # Return a black frame if camera fails
            frame = np.zeros((720, 1280, 3), dtype=np.uint8)

        # Convert OpenCV BGR frame to VideoFrame
        video_frame = VideoFrame.from_ndarray(frame, format="bgr24")
        video_frame.pts = pts
        video_frame.time_base = time_base
        return video_frame

async def offer(request):
    params = await request.json()
    offer = RTCSessionDescription(sdp=params['sdp'], type=params['type'])

    pc = RTCPeerConnection()
    local_video = PiCameraStream()
    pc.addTrack(local_video)

    await pc.setRemoteDescription(offer)
    answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    return web.json_response({'sdp': pc.localDescription.sdp, 'type': pc.localDescription.type})

app = web.Application()
app.router.add_post("/offer", offer)

if __name__ == "__main__":
    web.run_app(app, port=8000)

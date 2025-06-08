const express = require('express');
const bodyParser = require('body-parser');
const { RTCPeerConnection, RTCVideoSource, RTCVideoFrame } = require('wrtc');

const app = express();
app.use(bodyParser.json());

const videoSource = new RTCVideoSource();

function getBlankFrame() {
  const width = 1280;
  const height = 720;
  const data = Buffer.alloc(width * height * 1.5); // YUV format
  return new RTCVideoFrame(data, width, height);
}

app.post('/offer', async (req, res) => {
  const pc = new RTCPeerConnection();
  const track = videoSource.createTrack();
  pc.addTrack(track);

  await pc.setRemoteDescription(req.body);
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  // Send dummy video frames every 33ms (30 FPS)
  const interval = setInterval(() => {
    const frame = getBlankFrame();
    videoSource.onFrame(frame);
  }, 33);

  pc.oniceconnectionstatechange = () => {
    if (pc.iceConnectionState === 'closed' || pc.iceConnectionState === 'disconnected') {
      clearInterval(interval);
      track.stop();
    }
  };

  res.json(pc.localDescription);
});

app.listen(8000, () => console.log('WebRTC server running on port 8000'));

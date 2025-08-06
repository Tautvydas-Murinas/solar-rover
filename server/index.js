const http = require('http');
const fs = require('fs');
const path = require('path');
const { SerialPort } = require('serialport');
const { RTCPeerConnection, RTCSessionDescription, MediaStreamTrack } = require('wrtc');

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS' && req.url === '/offer') {
    // Handle CORS preflight for /offer
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': 86400,
    });
    return res.end();
  }

  if (req.url === '/') {
    const filePath = path.join(__dirname, 'index.html');
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading index.html');
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
      }
    });
  } else if (req.url.startsWith('/static/')) {
    const filePath = path.join(__dirname, req.url);
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not Found');
      } else {
        const ext = path.extname(filePath);
        const mimeTypes = {
          '.css': 'text/css',
          '.js': 'application/javascript',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.gif': 'image/gif',
          '.svg': 'image/svg+xml',
        };
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
        res.end(data);
      }
    });
  } else if (req.method === 'POST' && req.url === '/offer') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const offer = JSON.parse(body);
        const pc = new RTCPeerConnection();

        // TODO: Add real video track here
        // For example, connect to your camera source and create a MediaStreamTrack
        // const videoTrack = yourRealVideoTrack;
        // pc.addTrack(videoTrack);

        // For now, add a fake video track (will NOT show real video)
        const videoTrack = new MediaStreamTrack({ kind: 'video' });
        pc.addTrack(videoTrack);

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify(pc.localDescription));
      } catch (e) {
        console.error('Error handling /offer:', e);
        res.writeHead(500);
        res.end('Internal Server Error');
      }
    });
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});


const io = require('socket.io')(server, {
  cors: { origin: '*' }
});

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('message', (message) => {
    console.log(`Command from client: ${message}`);

    // io.emit('message', `Command received: ${message}`);

    if (message === 'forward') port.write('F');
    else if (message === 'stop') port.write('S');
    // Add other commands as needed
  });
});

server.listen(8080, () => console.log('Listening on http://192.168.1.230:8080'));

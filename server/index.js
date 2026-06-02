const http = require('http');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');

const PORT = 8080;
const CAMERA_STREAM_URL = process.env.CAMERA_STREAM_URL || 'http://127.0.0.1:8000/stream.mjpg';

// const portName = '/dev/ttyACM0';
// const { SerialPort } = require('serialport');
// const serialPort = new SerialPort({ path: portName, baudRate: 9600, autoOpen: false });

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];

  if (urlPath === '/') {
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
  } else if (urlPath === '/stream.mjpg') {
    const camReq = http.get(CAMERA_STREAM_URL, (camRes) => {
      if (camRes.statusCode !== 200) {
        res.writeHead(502);
        res.end('Camera stream unavailable');
        camRes.resume();
        return;
      }
      res.writeHead(200, {
        'Content-Type': camRes.headers['content-type'] || 'multipart/x-mixed-replace; boundary=FRAME',
        'Cache-Control': 'no-cache, private',
        Pragma: 'no-cache',
      });
      camRes.pipe(res);
    });
    camReq.on('error', (err) => {
      console.error('Camera proxy error:', err.message);
      if (!res.headersSent) {
        res.writeHead(502);
        res.end('Camera stream unavailable. Start stream.py on port 8000.');
      }
    });
    req.on('close', () => camReq.destroy());
  } else if (urlPath.startsWith('/static/')) {
    const filePath = path.join(__dirname, urlPath);
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
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

const io = new Server(server, {
  cors: { origin: '*' },
});

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('message', (message) => {
    console.log(`Command from client: ${message}`);

    let cmd = '';
    if (message === 'forward') cmd = 'F';
    else if (message === 'stop') cmd = 'S';
    else if (message === 'left') cmd = 'L';
    else if (message === 'right') cmd = 'R';
    else if (message === 'backward') cmd = 'B';

    if (cmd) {
      // if (serialPort.isOpen) serialPort.write(cmd);
      console.log(`Rover command: ${cmd}`);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Control panel at http://0.0.0.0:${PORT}`);
  console.log(`Camera proxy -> ${CAMERA_STREAM_URL}`);
});

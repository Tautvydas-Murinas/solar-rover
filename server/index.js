const http = require('http');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');

const server = http.createServer((req, res) => {
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
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

// Replace this with your actual serial port logic
const port = {
  write: (cmd) => {
    console.log(`Pretend sending command to serial: ${cmd}`);
  }
};

const io = new Server(server, {
  cors: { origin: '*' }
});

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('message', (message) => {
    console.log(`Command from client: ${message}`);
    if (message === 'forward') port.write('F');
    else if (message === 'stop') port.write('S');
    else if (message === 'left') port.write('L');
    else if (message === 'right') port.write('R');
    else if (message === 'backward') port.write('B');
  });
});

server.listen(8080, () => {
  console.log('Listening on http://192.168.1.229:8080');
});

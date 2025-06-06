const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  if (req.url === '/') {
    const filePath = path.join(__dirname, 'client.html');
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading client.html');
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

const io = require('socket.io')(server, {
  cors: { origin: '*' }
});

io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('message', (message) => {
    console.log(message);
    io.emit(`${message}`);
  });
});

server.listen(8080, () => console.log('listening on localhost'));

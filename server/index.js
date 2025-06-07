const http = require('http');
const fs = require('fs');
const path = require('path');
const { SerialPort } = require('serialport');

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

// --- Serial Setup ---
const port = new SerialPort({
  path: '/dev/ttyUSB0', // Change to match your Arduino's serial port
  baudRate: 9600
});

const io = require('socket.io')(server, {
  cors: { origin: '*' }
});

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('message', (message) => {
    console.log(`Command from client: ${message}`);
    
    // Emit to all clients (optional)
    io.emit('message', `Command received: ${message}`);

    // Send appropriate char to Arduino
    if (message === 'forward') port.write('F');
    else if (message === 'stop') port.write('S');
    // Add more like 'left', 'right', etc.
  });
});

server.listen(8080, () => console.log('Listening on http://localhost:8080'));

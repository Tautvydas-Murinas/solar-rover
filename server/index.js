const http = require('http');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');
const { SerialPort } = require('serialport');


// const portName = '/dev/ttyACM0';  // Arduino serial port
// const serialPort = new SerialPort({
//   path: portName,
//   baudRate: 9600,
//   autoOpen: false,
// });


// // Open serial port
// serialPort.open((err) => {
//   if (err) {
//     console.error('Error opening serial port:', err.message);
//   } else {
//     console.log(`Serial port opened on ${portName}`);
//   }
// });

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

const io = new Server(server, {
  cors: { origin: '*' }
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

    // if (cmd) {
    //   if (serialPort.isOpen) {
    //     serialPort.write(cmd, (err) => {
    //       if (err) console.error('Error writing to serial port:', err.message);
    //       else console.log(`Sent to Arduino: ${cmd}`);
    //     });
    //   } else {
    //     console.log('Serial port not open');
    //   }
    // }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

server.listen(8080, () => {
  console.log('Listening on http://192.168.1.231:8080');
});

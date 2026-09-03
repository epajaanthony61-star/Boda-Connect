const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const { sequelize, testConnection } = require('./config/database');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const riderRoutes = require('./routes/riders');
const customerRoutes = require('./routes/customers');
const rideRoutes = require('./routes/rides');
const stageRoutes = require('./routes/stages');
const agentRoutes = require('./routes/agents');
const ratingRoutes = require('./routes/ratings');
const complaintRoutes = require('./routes/complaints');
const paymentRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Make io accessible to routes
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/riders', riderRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/stages', stageRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'BodaClass API is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join rider to their location room for tracking
  socket.on('rider_join', (data) => {
    const { riderId } = data;
    socket.join(`rider:${riderId}`);
    console.log(`Rider ${riderId} joined tracking room`);
  });

  // Update rider location in real-time
  socket.on('update_location', (data) => {
    const { riderId, latitude, longitude } = data;
    // Broadcast location to customers tracking this rider
    io.to(`tracking:${riderId}`).emit('location_update', {
      riderId,
      latitude,
      longitude,
      timestamp: new Date().toISOString()
    });
  });

  // Customer tracking a rider
  socket.on('track_rider', (data) => {
    const { rideId, riderId } = data;
    socket.join(`tracking:${riderId}`);
    console.log(`Customer tracking rider ${riderId} for ride ${rideId}`);
  });

  // Ride status updates
  socket.on('ride_status_update', (data) => {
    const { rideId, status, customerId, riderId } = data;
    
    // Notify customer
    if (customerId) {
      io.to(`customer:${customerId}`).emit('ride_update', data);
    }
    
    // Notify rider
    if (riderId) {
      io.to(`rider:${riderId}`).emit('ride_update', data);
    }
    
    // Broadcast to admin dashboard
    io.to('admin').emit('ride_status_change', data);
  });

  // SOS Emergency alert
  socket.on('sos_alert', (data) => {
    const { customerId, location, rideId } = data;
    // Broadcast to all admins and nearby riders
    io.to('admin').emit('emergency_alert', data);
    io.to('nearby_riders').emit('emergency_nearby', data);
    console.log(`SOS Alert from customer ${customerId}`);
  });

  // Agent/Stage manager room
  socket.on('agent_join', (data) => {
    const { agentId, stageId } = data;
    socket.join(`stage:${stageId}`);
    socket.join('agent_room');
    console.log(`Agent ${agentId} joined stage ${stageId}`);
  });

  // Admin room
  socket.on('admin_join', () => {
    socket.join('admin');
    console.log('Admin joined dashboard');
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Test database connection
    await testConnection();
    
    // Sync database models (use alter: true for development, false for production)
    await sequelize.sync({ 
      alter: process.env.NODE_ENV === 'development',
      force: false 
    });
    console.log('Database synchronized successfully');
    
    server.listen(PORT, () => {
      console.log(`🚀 BodaClass server running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = { app, io, server };

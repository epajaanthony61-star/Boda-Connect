/**
 * Boda Boda Platform - Backend Server Entry Point
 * 
 * Node.js + Express + TypeScript + Socket.io
 * 
 * Features:
 * - REST API for CRUD operations
 * - WebSocket for real-time GPS tracking
 * - JWT authentication with phone OTP
 * - PostgreSQL + PostGIS integration
 * - Offline-first sync support
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth.routes';
import riderRoutes from './routes/rider.routes';
import passengerRoutes from './routes/passenger.routes';
import rideRoutes from './routes/ride.routes';
import financeRoutes from './routes/finance.routes';
import adminRoutes from './routes/admin.routes';

// Import WebSocket handler
import { initializeSocketIO } from './sockets/socketHandler';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

// Import database connection
import { connectDatabase } from './config/database';

// ============================================
// APP INITIALIZATION
// ============================================

const app: Application = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // Optimize for low-bandwidth environments
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ============================================
// MIDDLEWARE
// ============================================

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));

// Rate limiting (adjusted for East African mobile networks)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'Please slow down to ensure fair usage',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging (use 'tiny' for production to reduce bandwidth)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Custom request logger for debugging
app.use(requestLogger);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API version indicator
app.get('/api', (req: Request, res: Response) => {
  res.json({
    name: 'Boda Boda Platform API',
    version: '1.0.0',
    description: 'Fair distance-based fare calculation, rider growth & safety tracking, financial tools',
    endpoints: {
      auth: '/api/auth',
      rider: '/api/rider',
      passenger: '/api/passenger',
      rides: '/api/rides',
      finance: '/api/finance',
      admin: '/api/admin',
    },
    websocket: {
      url: '/socket.io/',
      events: ['location:update', 'ride:request', 'ride:status', 'sos:alert'],
    },
  });
});

// ============================================
// ROUTES
// ============================================

// Authentication routes (phone OTP, JWT)
app.use('/api/auth', authRoutes);

// Rider-specific routes
app.use('/api/rider', riderRoutes);

// Passenger-specific routes
app.use('/api/passenger', passengerRoutes);

// Ride management routes
app.use('/api/rides', rideRoutes);

// Financial transactions routes
app.use('/api/finance', financeRoutes);

// Admin dashboard routes
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} does not exist`,
  });
});

// Global error handler
app.use(errorHandler);

// ============================================
// WEBSOCKET SETUP
// ============================================

initializeSocketIO(io);

// Attach Socket.io to response object for use in routes
app.use((req: Request, res: Response, next: NextFunction) => {
  (res as any).io = io;
  next();
});

// ============================================
// SERVER STARTUP
// ============================================

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Connect to PostgreSQL database
    await connectDatabase();
    console.log('✅ Database connected successfully');

    // Start HTTP server
    httpServer.listen(PORT, () => {
      console.log(`🚀 Boda Boda Platform API running on port ${PORT}`);
      console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌍 WebSocket server initialized`);
      console.log(`⏰ Server started at: ${new Date().toISOString()}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received. Shutting down gracefully...');
      httpServer.close(() => {
        console.log('HTTP server closed');
        io.close(() => {
          console.log('WebSocket server closed');
          process.exit(0);
        });
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export { app, httpServer, io };

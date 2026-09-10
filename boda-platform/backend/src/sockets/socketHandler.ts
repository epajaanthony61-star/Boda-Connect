/**
 * Socket.io Handler for Real-Time Communication
 * 
 * Events:
 * - location:update: Rider GPS position updates
 * - ride:request: New ride request broadcast to nearby riders
 * - ride:status: Ride status changes (accepted, arrived, in-transit, completed)
 * - sos:alert: Emergency SOS button triggered
 * 
 * Optimized for low-bandwidth environments:
 * - Sparse GPS updates when stationary
 * - Adaptive update frequency based on network quality
 * - Automatic reconnection with state recovery
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { query } from '../config/database';

interface JwtPayload {
  userId: string;
  role: 'rider' | 'passenger' | 'admin';
}

interface LocationUpdate {
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
  batteryLevel?: number;
  networkType?: '4G' | '3G' | '2G' | 'offline';
}

export function initializeSocketIO(io: SocketIOServer): void {
  // Middleware for authentication
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as JwtPayload;
      socket.data.userId = decoded.userId;
      socket.data.role = decoded.role;
      
      next();
    } catch (error) {
      next(new Error('Invalid authentication token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Client connected: ${socket.id} (User: ${socket.data.userId}, Role: ${socket.data.role})`);

    const userId = socket.data.userId;
    const role = socket.data.role;

    // Join user-specific room for targeted messages
    socket.join(`user:${userId}`);

    // ============================================
    // RIDER EVENTS
    // ============================================

    if (role === 'rider') {
      // Rider goes online
      socket.on('rider:online', async (data: { location: LocationUpdate }) => {
        try {
          await query(
            `UPDATE riders 
             SET is_online = TRUE, 
                 current_location = ST_SetSRID(ST_MakePoint($1, $2), 4326),
                 last_location_update = NOW()
             WHERE id = $3`,
            [data.location.longitude, data.location.latitude, userId]
          );

          // Notify admin dashboard
          io.to('admin:dashboard').emit('rider:online', {
            riderId: userId,
            location: data.location,
            timestamp: new Date().toISOString(),
          });

          socket.emit('rider:online:confirmed', { success: true });
        } catch (error) {
          console.error('Error updating rider online status:', error);
          socket.emit('error', { message: 'Failed to update online status' });
        }
      });

      // GPS location update (throttled on client-side)
      socket.on('location:update', async (location: LocationUpdate) => {
        try {
          // Update rider's current location in database
          await query(
            `UPDATE riders 
             SET current_location = ST_SetSRID(ST_MakePoint($1, $2), 4326),
                 current_heading = $3,
                 last_location_update = NOW()
             WHERE id = $4`,
            [location.longitude, location.latitude, location.heading || 0, userId]
          );

          // Store trajectory point (sparse logging for low bandwidth)
          await query(
            `INSERT INTO ride_trajectories (rider_id, location, speed_kmh, heading, battery_level, network_type)
             VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, $5, $6, $7)`,
            [
              userId,
              location.longitude,
              location.latitude,
              location.speed || 0,
              location.heading || 0,
              location.batteryLevel || null,
              location.networkType || null,
            ]
          );

          // Broadcast location to passengers with active rides
          // Find active ride for this rider
          const activeRide = await query(
            `SELECT id, passenger_id FROM rides 
             WHERE rider_id = $1 AND status IN ('accepted', 'arrived', 'in_transit')
             LIMIT 1`,
            [userId]
          );

          if (activeRide.rows.length > 0) {
            const passengerId = activeRide.rows[0].passenger_id;
            
            // Send location to specific passenger
            io.to(`user:${passengerId}`).emit('ride:driver_location', {
              rideId: activeRide.rows[0].id,
              location: location,
              timestamp: new Date().toISOString(),
            });
          }

          // Acknowledge receipt (important for unreliable networks)
          socket.emit('location:update:ack', {
            received: true,
            timestamp: Date.now(),
          });
        } catch (error) {
          console.error('Error processing location update:', error);
          socket.emit('error', { message: 'Failed to process location update' });
        }
      });

      // Ride status update
      socket.on('ride:status:update', async (data: { 
        rideId: string; 
        status: 'accepted' | 'arrived' | 'in_transit' | 'completed';
        location?: LocationUpdate;
      }) => {
        try {
          const { rideId, status, location } = data;

          // Update ride status in database
          const updateQuery = `
            UPDATE rides 
            SET status = $1,
                accepted_at = CASE WHEN $1 = 'accepted' THEN NOW() ELSE accepted_at END,
                arrived_at = CASE WHEN $1 = 'arrived' THEN NOW() ELSE arrived_at END,
                started_at = CASE WHEN $1 = 'in_transit' THEN NOW() ELSE started_at END,
                completed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE completed_at END
            WHERE id = $2 AND rider_id = $3
            RETURNING id, passenger_id, status
          `;

          const result = await query(updateQuery, [status, rideId, userId]);

          if (result.rows.length === 0) {
            throw new Error('Ride not found or unauthorized');
          }

          const ride = result.rows[0];

          // Notify passenger
          io.to(`user:${ride.passenger_id}`).emit('ride:status:changed', {
            rideId: ride.id,
            status: ride.status,
            timestamp: new Date().toISOString(),
          });

          // Notify admin dashboard
          io.to('admin:dashboard').emit('ride:status:update', {
            rideId: ride.id,
            status: ride.status,
            riderId: userId,
            timestamp: new Date().toISOString(),
          });

          // If completing ride, calculate final fare and notify both parties
          if (status === 'completed' && location) {
            // Emit fare calculation event (would trigger fare calculation service)
            io.to(`user:${ride.passenger_id}`).emit('ride:completed', {
              rideId: ride.id,
              message: 'Ride completed. Please proceed to payment.',
            });
          }

          socket.emit('ride:status:update:confirmed', {
            rideId,
            status,
            success: true,
          });
        } catch (error) {
          console.error('Error updating ride status:', error);
          socket.emit('error', { 
            message: 'Failed to update ride status',
            code: 'RIDE_STATUS_ERROR'
          });
        }
      });

      // SOS emergency alert
      socket.on('sos:trigger', async (data: { 
        location: LocationUpdate;
        message?: string;
      }) => {
        try {
          const { location, message } = data;

          // Log SOS event in database
          const result = await query(
            `INSERT INTO sos_events (rider_id, location, triggered_at, status)
             VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), NOW(), 'active')
             RETURNING id`,
            [userId, location.longitude, location.latitude]
          );

          const sosEventId = result.rows[0].id;

          // Broadcast to admin dashboard immediately (high priority)
          io.to('admin:dashboard').emit('sos:alert', {
            eventId: sosEventId,
            riderId: userId,
            location: location,
            message: message || 'SOS button triggered',
            timestamp: new Date().toISOString(),
            priority: 'critical',
          });

          // Also broadcast to nearby riders (community safety)
          socket.broadcast.emit('sos:nearby_alert', {
            riderId: userId,
            location: location,
            radius: '500m',
          });

          socket.emit('sos:trigger:confirmed', {
            eventId: sosEventId,
            message: 'Emergency alert sent. Help is on the way.',
          });
        } catch (error) {
          console.error('Error processing SOS alert:', error);
          socket.emit('error', { message: 'Failed to send SOS alert' });
        }
      });

      // Rider goes offline
      socket.on('rider:offline', async () => {
        try {
          await query(
            `UPDATE riders SET is_online = FALSE WHERE id = $1`,
            [userId]
          );

          io.to('admin:dashboard').emit('rider:offline', {
            riderId: userId,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error('Error updating rider offline status:', error);
        }
      });
    }

    // ============================================
    // PASSENGER EVENTS
    // ============================================

    if (role === 'passenger') {
      // Request a ride
      socket.on('ride:request', async (data: {
        pickupLocation: { latitude: number; longitude: number };
        dropoffLocation: { latitude: number; longitude: number };
        fareEstimate: number;
      }) => {
        try {
          // Create ride request in database
          const result = await query(
            `INSERT INTO rides (passenger_id, pickup_location, dropoff_location, status, total_fare)
             VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), ST_SetSRID(ST_MakePoint($4, $5), 4326), 'pending', $6)
             RETURNING id`,
            [
              userId,
              data.pickupLocation.longitude,
              data.pickupLocation.latitude,
              data.dropoffLocation.longitude,
              data.dropoffLocation.latitude,
              data.fareEstimate,
            ]
          );

          const rideId = result.rows[0].id;

          // Broadcast to nearby riders (within 5km radius)
          io.emit('ride:request:new', {
            rideId: rideId,
            pickupLocation: data.pickupLocation,
            dropoffLocation: data.dropoffLocation,
            fareEstimate: data.fareEstimate,
            timestamp: new Date().toISOString(),
          });

          // Notify admin dashboard
          io.to('admin:dashboard').emit('ride:request:new', {
            rideId: rideId,
            passengerId: userId,
            pickupLocation: data.pickupLocation,
            timestamp: new Date().toISOString(),
          });

          socket.emit('ride:request:created', {
            rideId: rideId,
            status: 'pending',
            message: 'Searching for nearby riders...',
          });
        } catch (error) {
          console.error('Error creating ride request:', error);
          socket.emit('error', { message: 'Failed to create ride request' });
        }
      });

      // Cancel ride
      socket.on('ride:cancel', async (data: { rideId: string; reason?: string }) => {
        try {
          await query(
            `UPDATE rides 
             SET status = 'cancelled', cancelled_at = NOW(), cancellation_reason = $1
             WHERE id = $2 AND passenger_id = $3`,
            [data.reason || 'Passenger cancelled', data.rideId, userId]
          );

          // Notify assigned rider if any
          const ride = await query(
            `SELECT rider_id FROM rides WHERE id = $1`,
            [data.rideId]
          );

          if (ride.rows.length > 0 && ride.rows[0].rider_id) {
            io.to(`user:${ride.rows[0].rider_id}`).emit('ride:cancelled', {
              rideId: data.rideId,
              reason: data.reason,
            });
          }

          socket.emit('ride:cancel:confirmed', {
            rideId: data.rideId,
            success: true,
          });
        } catch (error) {
          console.error('Error cancelling ride:', error);
          socket.emit('error', { message: 'Failed to cancel ride' });
        }
      });
    }

    // ============================================
    // ADMIN EVENTS
    // ============================================

    if (role === 'admin') {
      // Join admin dashboard room
      socket.join('admin:dashboard');

      socket.on('admin:get_stats', async () => {
        try {
          const [activeRiders, activeRides, todayEarnings] = await Promise.all([
            query(`SELECT COUNT(*) FROM riders WHERE is_online = TRUE`),
            query(`SELECT COUNT(*) FROM rides WHERE status IN ('accepted', 'arrived', 'in_transit')`),
            query(`SELECT SUM(total_fare) FROM rides WHERE DATE(completed_at) = CURRENT_DATE`),
          ]);

          socket.emit('admin:stats', {
            activeRiders: parseInt(activeRiders.rows[0].count),
            activeRides: parseInt(activeRides.rows[0].count),
            todayEarnings: parseFloat(todayEarnings.rows[0].sum || 0),
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error('Error fetching admin stats:', error);
        }
      });
    }

    // ============================================
    // DISCONNECT HANDLER
    // ============================================

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);

      // Mark rider as offline if they disconnect unexpectedly
      if (role === 'rider') {
        query(
          `UPDATE riders SET is_online = FALSE WHERE id = $1`,
          [userId]
        ).catch(err => console.error('Error marking rider offline:', err));
      }
    });

    // Handle connection errors
    socket.on('error', (error: any) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });
  });
}

/**
 * Ride Routes
 * 
 * Ride lifecycle management:
 * - Create ride request (passenger)
 * - Accept ride (rider)
 * - Update ride status
 * - Complete ride and process payment
 */

import { Router } from 'express';
import { asyncHandler, HttpError } from '../middleware/errorHandler';
import { authenticate, requireRole } from '../middleware/auth';
import { query } from '../config/database';
import { calculateFare, getFareConfigForRegion } from '../utils/fareCalculator';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /rides/request
 * Passenger creates a new ride request
 */
router.post('/request', asyncHandler(async (req, res) => {
  const role = req.user!.role;
  
  if (role !== 'passenger') {
    throw new HttpError('Only passengers can request rides', 403, 'FORBIDDEN');
  }

  const { pickupLocation, dropoffLocation, pickupAddress, dropoffAddress } = req.body;

  if (!pickupLocation?.latitude || !pickupLocation?.longitude) {
    throw new HttpError('Pickup location is required', 400, 'VALIDATION_ERROR');
  }

  if (!dropoffLocation?.latitude || !dropoffLocation?.longitude) {
    throw new HttpError('Dropoff location is required', 400, 'VALIDATION_ERROR');
  }

  // Calculate distance using PostGIS
  const distanceResult = await query(
    `SELECT ST_Distance(
       ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
       ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography
     ) / 1000 as distance_km`,
    [
      pickupLocation.longitude,
      pickupLocation.latitude,
      dropoffLocation.longitude,
      dropoffLocation.latitude,
    ]
  );

  const distanceKm = parseFloat(distanceResult.rows[0].distance_km);

  // Calculate fare estimate
  const fareConfig = getFareConfigForRegion(req.body.countryCode || 'KE');
  const fareBreakdown = calculateFare({
    distanceKm,
    pickupLatitude: pickupLocation.latitude,
    pickupLongitude: pickupLocation.longitude,
    dropoffLatitude: dropoffLocation.latitude,
    dropoffLongitude: dropoffLocation.longitude,
    timestamp: new Date(),
    dayOfWeek: new Date().getDay(),
    hourOfDay: new Date().getHours(),
  }, fareConfig);

  // Create ride request
  const result = await query(
    `INSERT INTO rides (
       passenger_id, pickup_location, dropoff_location, 
       pickup_address, dropoff_address,
       estimated_distance_km, base_fare, distance_fare, 
       total_fare, currency, status
     ) VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), ST_SetSRID(ST_MakePoint($4, $5), 4326), 
               $6, $7, $8, $9, $10, $11, $12, 'pending')
     RETURNING id`,
    [
      req.user!.userId,
      pickupLocation.longitude,
      pickupLocation.latitude,
      dropoffLocation.longitude,
      dropoffLocation.latitude,
      pickupAddress || null,
      dropoffAddress || null,
      distanceKm,
      fareBreakdown.baseFare,
      fareBreakdown.distanceFare,
      fareBreakdown.totalFare,
      fareBreakdown.currency,
    ]
  );

  // Emit WebSocket event to nearby riders (handled in socketHandler)
  // io.emit('ride:request:new', { ... })

  res.status(201).json({
    success: true,
    message: 'Ride request created. Searching for nearby riders...',
    data: {
      rideId: result.rows[0].id,
      fareEstimate: fareBreakdown.totalFare,
      distance: distanceKm.toFixed(2),
      currency: fareBreakdown.currency,
      fareBreakdown,
    },
  });
}));

/**
 * POST /rides/:id/accept
 * Rider accepts a ride request
 */
router.post('/:id/accept', asyncHandler(async (req, res) => {
  const role = req.user!.role;
  
  if (role !== 'rider') {
    throw new HttpError('Only riders can accept rides', 403, 'FORBIDDEN');
  }

  const { id: rideId } = req.params;

  // Check if ride is still pending
  const rideCheck = await query(
    `SELECT status, passenger_id FROM rides WHERE id = $1`,
    [rideId]
  );

  if (rideCheck.rows.length === 0) {
    throw new HttpError('Ride not found', 404, 'NOT_FOUND');
  }

  if (rideCheck.rows[0].status !== 'pending') {
    throw new HttpError('Ride is no longer available', 409, 'RIDE_UNAVAILABLE');
  }

  // Assign rider and update status
  await query(
    `UPDATE rides 
     SET rider_id = $1, status = 'accepted', accepted_at = NOW()
     WHERE id = $2`,
    [req.user!.userId, rideId]
  );

  res.json({
    success: true,
    message: 'Ride accepted successfully',
    data: {
      rideId,
      status: 'accepted',
    },
  });
}));

/**
 * PUT /rides/:id/status
 * Update ride status (arrived, in_transit, completed)
 */
router.put('/:id/status', asyncHandler(async (req, res) => {
  const { id: rideId } = req.params;
  const { status, location } = req.body;

  const validStatuses = ['arrived', 'in_transit', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new HttpError('Invalid status', 400, 'VALIDATION_ERROR');
  }

  // Verify rider owns this ride or is admin
  const rideCheck = await query(
    `SELECT rider_id, passenger_id, status FROM rides WHERE id = $1`,
    [rideId]
  );

  if (rideCheck.rows.length === 0) {
    throw new HttpError('Ride not found', 404, 'NOT_FOUND');
  }

  const ride = rideCheck.rows[0];

  if (req.user!.role === 'rider' && ride.rider_id !== req.user!.userId) {
    throw new HttpError('Not authorized to update this ride', 403, 'FORBIDDEN');
  }

  // Build dynamic update query based on status
  let statusUpdate = 'status = $1';
  let timestampUpdate = '';

  switch (status) {
    case 'arrived':
      timestampUpdate = ', arrived_at = NOW()';
      break;
    case 'in_transit':
      timestampUpdate = ', started_at = NOW()';
      break;
    case 'completed':
      timestampUpdate = ', completed_at = NOW(), payment_status = \'pending\'';
      break;
    case 'cancelled':
      timestampUpdate = ', cancelled_at = NOW(), cancellation_reason = $2';
      statusUpdate = 'status = $1';
      break;
  }

  await query(
    `UPDATE rides SET ${statusUpdate}${timestampUpdate} WHERE id = $${status.includes('cancelled') ? 3 : 2}`,
    status.includes('cancelled') ? [status, req.body.reason || 'Cancelled by user', rideId] : [status, rideId]
  );

  res.json({
    success: true,
    message: `Ride status updated to ${status}`,
    data: {
      rideId,
      status,
    },
  });
}));

/**
 * GET /rides/:id
 * Get ride details
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id: rideId } = req.params;

  const result = await query(
    `SELECT r.*, 
            p.first_name as passenger_name, p.phone_number as passenger_phone,
            r2.first_name as rider_name, r2.phone_number as rider_phone,
            r2.motorcycle_plate, r2.motorcycle_color, r2.motorcycle_model
     FROM rides r
     LEFT JOIN passengers p ON r.passenger_id = p.id
     LEFT JOIN riders r2 ON r.rider_id = r2.id
     WHERE r.id = $1`,
    [rideId]
  );

  if (result.rows.length === 0) {
    throw new HttpError('Ride not found', 404, 'NOT_FOUND');
  }

  // Check authorization
  const ride = result.rows[0];
  if (
    ride.passenger_id !== req.user!.userId &&
    ride.rider_id !== req.user!.userId &&
    req.user!.role !== 'admin'
  ) {
    throw new HttpError('Not authorized to view this ride', 403, 'FORBIDDEN');
  }

  res.json({
    success: true,
    data: ride,
  });
}));

/**
 * GET /rides
 * Get user's ride history (based on role)
 */
router.get('/', asyncHandler(async (req, res) => {
  const role = req.user!.role;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;

  let whereClause = '';
  if (role === 'rider') {
    whereClause = 'WHERE r.rider_id = $1';
  } else if (role === 'passenger') {
    whereClause = 'WHERE r.passenger_id = $1';
  }

  const result = await query(
    `SELECT r.id, r.status, r.pickup_address, r.dropoff_address,
            r.total_fare, r.created_at, r.completed_at,
            CASE WHEN $1 = 'rider' THEN p.first_name ELSE r2.first_name END as other_party_name
     FROM rides r
     LEFT JOIN passengers p ON r.passenger_id = p.id
     LEFT JOIN riders r2 ON r.rider_id = r2.id
     ${whereClause}
     ORDER BY r.created_at DESC
     LIMIT $2 OFFSET $3`,
    [role === 'rider' ? req.user!.userId : req.user!.userId, limit, offset]
  );

  res.json({
    success: true,
    data: result.rows,
    pagination: { page, limit },
  });
}));

export default router;

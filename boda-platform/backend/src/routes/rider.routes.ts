/**
 * Rider Routes
 * 
 * Rider-specific endpoints for profile, earnings, and ride management
 */

import { Router } from 'express';
import { asyncHandler, HttpError } from '../middleware/errorHandler';
import { authenticate, requireRole } from '../middleware/auth';
import { query } from '../config/database';

const router = Router();

// All routes require authentication and rider role
router.use(authenticate);
router.use(requireRole('rider'));

/**
 * GET /rider/profile
 * Get rider's complete profile
 */
router.get('/profile', asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT r.*, u.phone_number, u.is_verified,
            (SELECT COUNT(*) FROM rides WHERE rider_id = r.id) as total_rides,
            (SELECT SUM(total_fare) FROM rides WHERE rider_id = r.id AND status = 'completed') as lifetime_earnings
     FROM riders r
     JOIN users u ON r.id = u.id
     WHERE r.id = $1`,
    [req.user!.userId]
  );

  if (result.rows.length === 0) {
    throw new HttpError('Rider profile not found', 404, 'NOT_FOUND');
  }

  res.json({
    success: true,
    data: result.rows[0],
  });
}));

/**
 * GET /rider/earnings/today
 * Get today's earnings summary
 */
router.get('/earnings/today', asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT 
       COUNT(*) as total_rides,
       COALESCE(SUM(total_fare), 0) as total_earnings,
       COALESCE(AVG(total_fare), 0) as avg_fare
     FROM rides
     WHERE rider_id = $1 
       AND status = 'completed'
       AND DATE(completed_at) = CURRENT_DATE`,
    [req.user!.userId]
  );

  // Get today's expenses
  const expensesResult = await query(
    `SELECT COALESCE(SUM(amount), 0) as total_expenses
     FROM transactions
     WHERE rider_id = $1
       AND transaction_type = 'expense'
       AND DATE(created_at) = CURRENT_DATE`,
    [req.user!.userId]
  );

  const earnings = parseFloat(result.rows[0].total_earnings);
  const expenses = parseFloat(expensesResult.rows[0].total_expenses);

  res.json({
    success: true,
    data: {
      date: new Date().toISOString().split('T')[0],
      totalRides: parseInt(result.rows[0].total_rides),
      totalEarnings: earnings,
      totalExpenses: expenses,
      netIncome: earnings - expenses,
      averageFare: parseFloat(result.rows[0].avg_fare),
    },
  });
}));

/**
 * GET /rider/rides
 * Get rider's ride history with pagination
 */
router.get('/rides', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;

  const result = await query(
    `SELECT r.id, r.status, r.pickup_address, r.dropoff_address,
            r.total_fare, r.created_at, r.completed_at,
            p.first_name as passenger_name, p.phone_number as passenger_phone
     FROM rides r
     LEFT JOIN passengers p ON r.passenger_id = p.id
     WHERE r.rider_id = $1
     ORDER BY r.created_at DESC
     LIMIT $2 OFFSET $3`,
    [req.user!.userId, limit, offset]
  );

  const countResult = await query(
    `SELECT COUNT(*) FROM rides WHERE rider_id = $1`,
    [req.user!.userId]
  );

  res.json({
    success: true,
    data: result.rows,
    pagination: {
      page,
      limit,
      total: parseInt(countResult.rows[0].count),
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    },
  });
}));

/**
 * POST /rider/go-online
 * Set rider status to online (available for rides)
 */
router.post('/go-online', asyncHandler(async (req, res) => {
  const { location } = req.body;

  if (!location?.latitude || !location?.longitude) {
    throw new HttpError('Current location is required', 400, 'VALIDATION_ERROR');
  }

  await query(
    `UPDATE riders 
     SET is_online = TRUE,
         current_location = ST_SetSRID(ST_MakePoint($1, $2), 4326),
         last_location_update = NOW()
     WHERE id = $3`,
    [location.longitude, location.latitude, req.user!.userId]
  );

  res.json({
    success: true,
    message: 'You are now online and visible to passengers',
  });
}));

/**
 * POST /rider/go-offline
 * Set rider status to offline
 */
router.post('/go-offline', asyncHandler(async (req, res) => {
  await query(
    `UPDATE riders SET is_online = FALSE WHERE id = $1`,
    [req.user!.userId]
  );

  res.json({
    success: true,
    message: 'You are now offline',
  });
}));

/**
 * PUT /rider/profile
 * Update rider profile information
 */
router.put('/profile', asyncHandler(async (req, res) => {
  const { firstName, lastName, motorcyclePlate, motorcycleModel, motorcycleColor } = req.body;

  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (firstName) {
    updates.push(`first_name = $${paramIndex++}`);
    values.push(firstName);
  }
  if (lastName) {
    updates.push(`last_name = $${paramIndex++}`);
    values.push(lastName);
  }
  if (motorcyclePlate) {
    updates.push(`motorcycle_plate = $${paramIndex++}`);
    values.push(motorcyclePlate);
  }
  if (motorcycleModel) {
    updates.push(`motorcycle_model = $${paramIndex++}`);
    values.push(motorcycleModel);
  }
  if (motorcycleColor) {
    updates.push(`motorcycle_color = $${paramIndex++}`);
    values.push(motorcycleColor);
  }

  if (updates.length === 0) {
    throw new HttpError('No fields to update', 400, 'VALIDATION_ERROR');
  }

  values.push(req.user!.userId);

  await query(
    `UPDATE riders SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex}`,
    values
  );

  res.json({
    success: true,
    message: 'Profile updated successfully',
  });
}));

export default router;

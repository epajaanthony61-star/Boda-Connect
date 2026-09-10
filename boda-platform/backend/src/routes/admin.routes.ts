/**
 * Admin Routes
 * 
 * Fleet management and system analytics
 */

import { Router } from 'express';
import { asyncHandler, HttpError } from '../middleware/errorHandler';
import { authenticate, requireRole } from '../middleware/auth';
import { query } from '../config/database';

const router = Router();

router.use(authenticate);
router.use(requireRole('admin', 'fleet_manager'));

/**
 * GET /admin/dashboard/stats
 * System-wide statistics
 */
router.get('/dashboard/stats', asyncHandler(async (req, res) => {
  const [
    totalRiders,
    activeRiders,
    totalPassengers,
    todayRides,
    todayRevenue,
    totalRides,
  ] = await Promise.all([
    query(`SELECT COUNT(*) FROM riders`),
    query(`SELECT COUNT(*) FROM riders WHERE is_online = TRUE`),
    query(`SELECT COUNT(*) FROM passengers`),
    query(`SELECT COUNT(*) FROM rides WHERE DATE(created_at) = CURRENT_DATE`),
    query(`SELECT COALESCE(SUM(total_fare), 0) FROM rides WHERE DATE(completed_at) = CURRENT_DATE AND status = 'completed'`),
    query(`SELECT COUNT(*) FROM rides`),
  ]);

  res.json({
    success: true,
    data: {
      riders: {
        total: parseInt(totalRiders.rows[0].count),
        activeNow: parseInt(activeRiders.rows[0].count),
      },
      passengers: parseInt(totalPassengers.rows[0].count),
      rides: {
        today: parseInt(todayRides.rows[0].count),
        total: parseInt(totalRides.rows[0].count),
      },
      revenue: {
        today: parseFloat(todayRevenue.rows[0].coalesce || 0),
      },
    },
  });
}));

/**
 * GET /admin/riders
 * List all riders with filters
 */
router.get('/riders', asyncHandler(async (req, res) => {
  const { status, page = '1', limit = '20' } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

  let whereClause = '';
  if (status === 'online') {
    whereClause = 'WHERE r.is_online = TRUE';
  } else if (status === 'offline') {
    whereClause = 'WHERE r.is_online = FALSE';
  }

  const result = await query(
    `SELECT r.id, r.first_name, r.last_name, r.motorcycle_plate, 
            r.safety_score, r.customer_rating, r.is_online,
            u.phone_number, u.is_verified
     FROM riders r
     JOIN users u ON r.id = u.id
     ${whereClause}
     ORDER BY r.created_at DESC
     LIMIT $1 OFFSET $2`,
    [parseInt(limit as string), offset]
  );

  res.json({ success: true, data: result.rows });
}));

/**
 * GET /admin/rides/active
 * Get all active rides
 */
router.get('/rides/active', asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT r.id, r.status, r.pickup_address, r.dropoff_address,
            r.total_fare, r.created_at,
            p.first_name as passenger_name,
            r2.first_name as rider_name, r2.motorcycle_plate,
            ST_AsGeoJSON(r2.current_location) as rider_location
     FROM rides r
     LEFT JOIN passengers p ON r.passenger_id = p.id
     LEFT JOIN riders r2 ON r.rider_id = r2.id
     WHERE r.status IN ('accepted', 'arrived', 'in_transit')
     ORDER BY r.created_at DESC`
  );

  res.json({ success: true, data: result.rows });
}));

/**
 * PUT /admin/riders/:id/suspend
 * Suspend a rider
 */
router.put('/riders/:id/suspend', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  await query(
    `UPDATE riders SET is_online = FALSE WHERE id = $1`,
    [id]
  );

  await query(
    `UPDATE users SET is_active = FALSE WHERE id = $1`,
    [id]
  );

  res.json({
    success: true,
    message: `Rider suspended. Reason: ${reason || 'Not specified'}`,
  });
}));

export default router;

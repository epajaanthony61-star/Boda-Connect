/**
 * Passenger Routes
 */

import { Router } from 'express';
import { asyncHandler, HttpError } from '../middleware/errorHandler';
import { authenticate, requireRole } from '../middleware/auth';
import { query } from '../config/database';

const router = Router();

router.use(authenticate);
router.use(requireRole('passenger'));

/**
 * GET /passenger/profile
 */
router.get('/profile', asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT p.*, u.phone_number, u.is_verified
     FROM passengers p
     JOIN users u ON p.id = u.id
     WHERE p.id = $1`,
    [req.user!.userId]
  );

  if (result.rows.length === 0) {
    throw new HttpError('Profile not found', 404, 'NOT_FOUND');
  }

  res.json({ success: true, data: result.rows[0] });
}));

/**
 * GET /passenger/rides
 */
router.get('/rides', asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT id, status, pickup_address, dropoff_address, total_fare, created_at
     FROM rides
     WHERE passenger_id = $1
     ORDER BY created_at DESC
     LIMIT 20`,
    [req.user!.userId]
  );

  res.json({ success: true, data: result.rows });
}));

export default router;

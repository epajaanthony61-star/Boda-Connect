/**
 * Finance Routes
 * 
 * Financial transaction management for riders:
 * - Log expenses (fuel, maintenance, lease)
 * - Track earnings
 * - Withdraw to Mobile Money
 * - Generate financial reports
 */

import { Router } from 'express';
import { asyncHandler, HttpError } from '../middleware/errorHandler';
import { authenticate, requireRole } from '../middleware/auth';
import { query, transaction } from '../config/database';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /finance/expenses
 * Log a new expense (supports offline sync)
 */
router.post('/expenses', asyncHandler(async (req, res) => {
  const { 
    amount, 
    category, 
    description, 
    paymentMethod, 
    receiptImageUri,
    deviceTimestamp 
  } = req.body;

  if (!amount || !category) {
    throw new HttpError('Amount and category are required', 400, 'VALIDATION_ERROR');
  }

  const validCategories = ['fuel', 'maintenance', 'lease_payment', 'insurance', 'license', 'other'];
  if (!validCategories.includes(category)) {
    throw new HttpError('Invalid expense category', 400, 'VALIDATION_ERROR');
  }

  // Insert transaction
  const result = await query(
    `INSERT INTO transactions (
       rider_id, transaction_type, category, amount, description, 
       payment_method, receipt_image_url, device_timestamp, is_synced
     ) VALUES ($1, 'expense', $2, $3, $4, $5, $6, $7, TRUE)
     RETURNING id`,
    [
      req.user!.userId,
      category,
      amount,
      description || `${category} expense`,
      paymentMethod || 'cash',
      receiptImageUri || null,
      deviceTimestamp ? new Date(deviceTimestamp) : new Date(),
    ]
  );

  // Update daily expense log
  await query(
    `INSERT INTO daily_expense_logs (rider_id, log_date, ${category}_cost, total_expenses)
     VALUES ($1, CURRENT_DATE, $2, $2)
     ON CONFLICT (rider_id, log_date) 
     DO UPDATE SET 
       ${category}_cost = daily_expense_logs.${category}_cost + $2,
       total_expenses = daily_expense_logs.total_expenses + $2,
       updated_at = NOW()`,
    [req.user!.userId, amount]
  );

  res.status(201).json({
    success: true,
    message: 'Expense logged successfully',
    data: {
      transactionId: result.rows[0].id,
      amount,
      category,
    },
  });
}));

/**
 * GET /finance/expenses
 * Get expense history with filters
 */
router.get('/expenses', asyncHandler(async (req, res) => {
  const { startDate, endDate, category, page = '1', limit = '20' } = req.query;
  
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  
  let whereClause = 'WHERE rider_id = $1';
  const values: any[] = [req.user!.userId];
  let paramIndex = 2;

  if (startDate) {
    whereClause += ` AND DATE(created_at) >= $${paramIndex++}`;
    values.push(startDate);
  }

  if (endDate) {
    whereClause += ` AND DATE(created_at) <= $${paramIndex++}`;
    values.push(endDate);
  }

  if (category && category !== 'all') {
    whereClause += ` AND category = $${paramIndex++}`;
    values.push(category);
  }

  const result = await query(
    `SELECT id, transaction_type, category, amount, currency, description,
            payment_method, created_at, is_synced
     FROM transactions
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...values, parseInt(limit as string), offset]
  );

  const countResult = await query(
    `SELECT COUNT(*) FROM transactions ${whereClause}`,
    values.slice(0, paramIndex - 2)
  );

  res.json({
    success: true,
    data: result.rows,
    pagination: {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total: parseInt(countResult.rows[0].count),
    },
  });
}));

/**
 * GET /finance/summary
 * Get financial summary for a period
 */
router.get('/summary', asyncHandler(async (req, res) => {
  const { period = 'today' } = req.query; // today, week, month, custom
  
  let dateCondition = 'DATE(created_at) = CURRENT_DATE';
  if (period === 'week') {
    dateCondition = 'created_at >= NOW() - INTERVAL \'7 days\'';
  } else if (period === 'month') {
    dateCondition = 'created_at >= NOW() - INTERVAL \'30 days\'';
  }

  const [earningsResult, expensesResult, ridesResult] = await Promise.all([
    query(
      `SELECT COALESCE(SUM(amount), 0) as total 
       FROM transactions 
       WHERE rider_id = $1 AND transaction_type = 'earning' AND ${dateCondition}`,
      [req.user!.userId]
    ),
    query(
      `SELECT COALESCE(SUM(amount), 0) as total 
       FROM transactions 
       WHERE rider_id = $1 AND transaction_type = 'expense' AND ${dateCondition}`,
      [req.user!.userId]
    ),
    query(
      `SELECT COUNT(*) as total_rides, COALESCE(SUM(total_fare), 0) as ride_earnings
       FROM rides 
       WHERE rider_id = $1 AND status = 'completed' AND ${dateCondition.replace('created_at', 'completed_at')}`,
      [req.user!.userId]
    ),
  ]);

  const totalEarnings = parseFloat(earningsResult.rows[0].total);
  const totalExpenses = parseFloat(expensesResult.rows[0].total);
  const netIncome = totalEarnings - totalExpenses;

  res.json({
    success: true,
    data: {
      period,
      totalEarnings,
      totalExpenses,
      netIncome,
      rideCount: parseInt(ridesResult.rows[0].total_rides),
      rideEarnings: parseFloat(ridesResult.rows[0].ride_earnings),
    },
  });
}));

/**
 * POST /finance/withdraw
 * Withdraw earnings to Mobile Money
 */
router.post('/withdraw', asyncHandler(async (req, res) => {
  const { amount, method, phoneNumber } = req.body;

  if (!amount || !method) {
    throw new HttpError('Amount and withdrawal method are required', 400, 'VALIDATION_ERROR');
  }

  const validMethods = ['mpesa', 'airtel_money', 'mtn_mobile_money'];
  if (!validMethods.includes(method)) {
    throw new HttpError('Invalid withdrawal method', 400, 'VALIDATION_ERROR');
  }

  // Check available balance
  const balanceResult = await query(
    `SELECT 
       COALESCE((SELECT SUM(amount) FROM transactions WHERE rider_id = $1 AND transaction_type = 'earning'), 0) -
       COALESCE((SELECT SUM(amount) FROM transactions WHERE rider_id = $1 AND transaction_type = 'expense'), 0) 
       as available_balance`,
    [req.user!.userId]
  );

  const availableBalance = parseFloat(balanceResult.rows[0].available_balance);
  
  if (amount > availableBalance) {
    throw new HttpError('Insufficient balance', 400, 'INSUFFICIENT_BALANCE');
  }

  if (amount < 100) {
    throw new HttpError('Minimum withdrawal amount is 100', 400, 'MINIMUM_AMOUNT');
  }

  // Create withdrawal transaction
  const withdrawalResult = await query(
    `INSERT INTO transactions (rider_id, transaction_type, amount, payment_method, payment_status, description)
     VALUES ($1, 'withdrawal', $2, $3, 'pending', 'Withdrawal to ${method}')
     RETURNING id`,
    [req.user!.userId, amount, method]
  );

  // In production, initiate Mobile Money payout via API
  // Example: M-Pesa B2C API, Airtel Money disbursement
  
  res.json({
    success: true,
    message: `Withdrawal of ${amount} initiated to ${method}`,
    data: {
      transactionId: withdrawalResult.rows[0].id,
      amount,
      method,
      phoneNumber: phoneNumber || req.user!.phoneNumber,
      estimatedArrival: 'Within 5 minutes',
    },
  });
}));

/**
 * GET /finance/lease-progress
 * Get motorcycle lease/ownership progress
 */
router.get('/lease-progress', asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT ownership_status, lease_provider, lease_amount, lease_remaining_balance,
            lease_start_date, lease_end_date,
            CASE 
              WHEN lease_amount > 0 THEN ((lease_amount - lease_remaining_balance) / lease_amount * 100)::numeric(5,2)
              ELSE 100 
            END as progress_percentage
     FROM riders
     WHERE id = $1`,
    [req.user!.userId]
  );

  if (result.rows.length === 0) {
    throw new HttpError('Rider profile not found', 404, 'NOT_FOUND');
  }

  const leaseData = result.rows[0];

  res.json({
    success: true,
    data: {
      ownershipStatus: leaseData.ownership_status,
      isLeasing: leaseData.ownership_status === 'leasing',
      provider: leaseData.lease_provider,
      totalAmount: parseFloat(leaseData.lease_amount || 0),
      paidAmount: parseFloat((leaseData.lease_amount || 0) - (leaseData.lease_remaining_balance || 0)),
      remainingBalance: parseFloat(leaseData.lease_remaining_balance || 0),
      progressPercentage: parseFloat(leaseData.progress_percentage),
      startDate: leaseData.lease_start_date,
      endDate: leaseData.lease_end_date,
    },
  });
}));

export default router;

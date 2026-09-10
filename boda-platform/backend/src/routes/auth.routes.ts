/**
 * Authentication Routes
 * 
 * Phone number OTP authentication flow:
 * 1. POST /auth/request-otp - Request OTP for phone number
 * 2. POST /auth/verify-otp - Verify OTP and get JWT token
 * 3. POST /auth/register - Register new user (rider/passenger)
 */

import { Router } from 'express';
import { asyncHandler, HttpError } from '../middleware/errorHandler';
import { generateToken, generateOTP, sendOTP } from '../middleware/auth';
import { query } from '../config/database';

const router = Router();

/**
 * POST /auth/request-otp
 * Request OTP for phone number authentication
 */
router.post('/request-otp', asyncHandler(async (req, res) => {
  const { phoneNumber, countryCode = 'KE' } = req.body;

  if (!phoneNumber) {
    throw new HttpError('Phone number is required', 400, 'VALIDATION_ERROR');
  }

  // Generate OTP
  const otp = generateOTP();

  // In production, store OTP in cache with expiration (5 minutes)
  // await redis.setex(`otp:${phoneNumber}`, 300, otp);
  console.log(`[OTP Cache] Storing ${otp} for ${phoneNumber}`);

  // Send OTP via SMS
  await sendOTP(phoneNumber, otp);

  res.json({
    success: true,
    message: 'OTP sent successfully',
    expiresInSeconds: 300, // 5 minutes
  });
}));

/**
 * POST /auth/verify-otp
 * Verify OTP and return JWT token
 */
router.post('/verify-otp', asyncHandler(async (req, res) => {
  const { phoneNumber, otp, role } = req.body;

  if (!phoneNumber || !otp) {
    throw new HttpError('Phone number and OTP are required', 400, 'VALIDATION_ERROR');
  }

  // In production, verify OTP from cache
  // const storedOtp = await redis.get(`otp:${phoneNumber}`);
  // if (!storedOtp || storedOtp !== otp) { ... }
  
  // Demo: accept any 6-digit OTP
  if (otp.length !== 6) {
    throw new HttpError('Invalid OTP format', 400, 'INVALID_OTP');
  }

  // Check if user exists
  const userResult = await query(
    `SELECT id, phone_number, role, is_verified FROM users WHERE phone_number = $1`,
    [phoneNumber]
  );

  let userId: string;
  let userRole: string;

  if (userResult.rows.length === 0) {
    // New user - create account
    const newUserResult = await query(
      `INSERT INTO users (phone_number, country_code, role, is_verified, is_active)
       VALUES ($1, $2, $3, TRUE, TRUE)
       RETURNING id, role`,
      [phoneNumber, req.body.countryCode || 'KE', role || 'passenger']
    );

    userId = newUserResult.rows[0].id;
    userRole = newUserResult.rows[0].role;

    // Create profile based on role
    if (userRole === 'rider') {
      await query(
        `INSERT INTO riders (id, first_name, last_name) VALUES ($1, 'New', 'Rider')`,
        [userId]
      );
    } else if (userRole === 'passenger') {
      await query(
        `INSERT INTO passengers (id, first_name, last_name) VALUES ($1, 'New', 'Passenger')`,
        [userId]
      );
    }
  } else {
    userId = userResult.rows[0].id;
    userRole = userResult.rows[0].role;
  }

  // Generate JWT token
  const token = generateToken(userId, userRole);

  res.json({
    success: true,
    token,
    user: {
      userId,
      role: userRole,
      phoneNumber,
    },
  });
}));

/**
 * POST /auth/register
 * Register new user with additional details
 */
router.post('/register', asyncHandler(async (req, res) => {
  const { phoneNumber, role, firstName, lastName, ...additionalData } = req.body;

  if (!phoneNumber || !role) {
    throw new HttpError('Phone number and role are required', 400, 'VALIDATION_ERROR');
  }

  // Check if user already exists
  const existingUser = await query(
    `SELECT id FROM users WHERE phone_number = $1`,
    [phoneNumber]
  );

  if (existingUser.rows.length > 0) {
    throw new HttpError('User with this phone number already exists', 409, 'USER_EXISTS');
  }

  // Create user transactionally
  const result = await query(
    `INSERT INTO users (phone_number, role, is_verified, is_active)
     VALUES ($1, $2, TRUE, TRUE)
     RETURNING id`,
    [phoneNumber, role]
  );

  const userId = result.rows[0].id;

  // Create role-specific profile
  if (role === 'rider') {
    await query(
      `INSERT INTO riders (id, first_name, last_name, motorcycle_plate, ownership_status)
       VALUES ($1, $2, $3, $4, 'owned')`,
      [userId, firstName, lastName, additionalData.motorcyclePlate || null]
    );
  } else if (role === 'passenger') {
    await query(
      `INSERT INTO passengers (id, first_name, last_name)
       VALUES ($1, $2, $3)`,
      [userId, firstName, lastName]
    );
  }

  // Generate token
  const token = generateToken(userId, role);

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    token,
    user: {
      userId,
      role,
      phoneNumber,
    },
  });
}));

/**
 * GET /auth/me
 * Get current user profile
 */
router.get('/me', asyncHandler(async (req, res) => {
  // This route requires authentication middleware
  // Implementation in auth middleware demo
  res.json({
    success: true,
    message: 'Use authenticate middleware to protect this route',
  });
}));

export default router;

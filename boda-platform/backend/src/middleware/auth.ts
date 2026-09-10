/**
 * Authentication Middleware
 * 
 * JWT verification for protected routes
 * Supports phone number OTP authentication flow
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { HttpError } from './errorHandler';
import { query } from '../config/database';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: 'rider' | 'passenger' | 'admin' | 'fleet_manager';
    phoneNumber: string;
  };
}

/**
 * Verify JWT token and attach user to request
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new HttpError('Authorization token required', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as {
      userId: string;
      role: string;
    };

    // Check if user still exists and is active
    const result = await query(
      `SELECT id, phone_number, role, is_active FROM users WHERE id = $1`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      throw new HttpError('User not found', 401, 'USER_NOT_FOUND');
    }

    const user = result.rows[0];

    if (!user.is_active) {
      throw new HttpError('Account deactivated', 403, 'ACCOUNT_DEACTIVATED');
    }

    // Attach user to request
    req.user = {
      userId: user.id,
      role: user.role,
      phoneNumber: user.phone_number,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new HttpError('Invalid token', 401, 'INVALID_TOKEN'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new HttpError('Token expired', 401, 'TOKEN_EXPIRED'));
    } else {
      next(error);
    }
  }
};

/**
 * Require specific role(s) for route access
 */
export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new HttpError('Authentication required', 401, 'UNAUTHORIZED'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new HttpError(
          `Access denied. Required roles: ${roles.join(', ')}`,
          403,
          'FORBIDDEN'
        )
      );
    }

    next();
  };
};

/**
 * Generate JWT token for user
 */
export const generateToken = (userId: string, role: string): string => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * Generate OTP for phone authentication
 * In production, integrate with SMS provider (Africa's Talking, Twilio)
 */
export const generateOTP = (): string => {
  // 6-digit OTP
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send OTP via SMS
 * Placeholder for integration with SMS providers
 */
export const sendOTP = async (phoneNumber: string, otp: string): Promise<void> => {
  console.log(`[OTP] Sending ${otp} to ${phoneNumber}`);
  
  // In production, integrate with:
  // - Africa's Talking (popular in East Africa)
  // - Twilio
  // - Local telecom APIs
  
  // Example with Africa's Talking:
  /*
  const username = process.env.AT_USERNAME;
  const apiKey = process.env.AT_API_KEY;
  const message = `Your Boda Boda verification code is: ${otp}. Valid for 5 minutes.`;
  
  await fetch('https://api.africastalking.com/version1/messaging', {
    method: 'POST',
    headers: {
      'ApiKey': apiKey,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      username,
      to: phoneNumber,
      message,
    }),
  });
  */
};

/**
 * Error Handling Middleware
 * 
 * Centralized error handling for the API
 * Returns consistent error format for all failures
 */

import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
}

export class HttpError extends Error {
  statusCode: number;
  code: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handler middleware
 */
export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(`[Error] ${err.name}: ${err.message}`);

  // Operational errors (expected, safe to send to client)
  if (err instanceof HttpError || err.isOperational) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: {
        message: err.message,
        code: err.code || 'INTERNAL_ERROR',
      },
    });
  }

  // Programming errors or unknown errors
  console.error('[Critical Error]', err.stack);

  return res.status(500).json({
    success: false,
    error: {
      message: process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : err.message,
      code: 'INTERNAL_ERROR',
    },
  });
};

/**
 * Async handler wrapper to catch promise rejections
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Not found handler
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  throw new HttpError(
    `Route ${req.method} ${req.path} not found`,
    404,
    'NOT_FOUND'
  );
};

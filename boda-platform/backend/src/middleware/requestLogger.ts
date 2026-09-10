/**
 * Request Logger Middleware
 * 
 * Logs incoming requests for debugging and analytics
 * Optimized for low-bandwidth by using minimal logging in production
 */

import { Request, Response, NextFunction } from 'express';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  // Log on response finish
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // Skip logging for health checks in production
    if (req.path === '/health' && process.env.NODE_ENV === 'production') {
      return;
    }

    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ` +
      `${res.statusCode} ${duration}ms`
    );
  });

  next();
};

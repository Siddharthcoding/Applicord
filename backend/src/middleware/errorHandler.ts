import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';
import { sendError } from '../utils/response';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) => {
  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    err.errors.forEach((e) => {
      const field = e.path.join('.') || 'body';
      if (!fieldErrors[field]) {
        fieldErrors[field] = [];
      }
      fieldErrors[field].push(e.message);
    });
    return sendError(res, 'Validation failed', 400, fieldErrors);
  }

  // Handle Prisma Known Errors
  if (err.code === 'P2002') {
    const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : 'Field';
    return sendError(res, `A record with this ${target} already exists`, 409);
  }

  if (err.code === 'P2025') {
    return sendError(res, 'The requested resource was not found', 404);
  }

  const statusCode = err.statusCode || err.status || 500;

  // Only log unexpected internal errors (500+) as errors
  if (statusCode >= 500) {
    logger.error('Unhandled server error', err, {
      route: req.originalUrl,
      method: req.method,
    });
  }

  const message =
    process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'An unexpected error occurred. Please try again later.'
      : err.message || 'Internal server error';

  return sendError(res, message, statusCode);
};

import rateLimit from 'express-rate-limit';
import { sendError } from '../utils/response';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per window
  handler: (req, res) => {
    return sendError(res, 'Too many authentication attempts. Please try again after 15 minutes.', 429);
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 300, // 300 requests per minute
  handler: (req, res) => {
    return sendError(res, 'Rate limit exceeded. Please slow down your requests.', 429);
  },
  standardHeaders: true,
  legacyHeaders: false,
});

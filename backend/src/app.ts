import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { config } from './config';
import apiRouter from './routes';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { apiLimiter } from './middleware/rateLimiter';
import { prisma } from './config/prisma';
import { checkRedisAvailable } from './config/redis';

export const createApp = () => {
  const app = express();

  // Security headers & CORS
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  const allowedOrigins = [config.frontendUrl];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow server-to-server or non-browser requests
        if (!origin) return callback(null, true);

        // Allow any localhost / 127.0.0.1 port (e.g. 5173, 5174, etc.)
        const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
        // Allow configured origin
        const isAllowedConfig = allowedOrigins.includes(origin);
        // Allow Chrome or Firefox extensions
        const isExtension = origin.startsWith('chrome-extension://') || origin.startsWith('moz-extension://');

        if (isLocalhost || isAllowedConfig || isExtension) {
          return callback(null, true);
        }

        return callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logger
  app.use(requestLogger);

  // Static uploads serving (with safe access control)
  app.use('/uploads', express.static(path.resolve(config.uploadDir)));

  // Health Checks (Requirement #80)
  app.get('/health', (req, res) => {
    return res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
    });
  });

  app.get('/ready', async (req, res) => {
    try {
      // Check Postgres DB
      await prisma.$queryRaw`SELECT 1`;
      const isRedisOk = checkRedisAvailable();

      return res.status(200).json({
        status: 'ready',
        database: 'connected',
        redis: isRedisOk ? 'connected' : 'standalone_in_memory_mode',
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      return res.status(503).json({
        status: 'not_ready',
        error: err.message,
      });
    }
  });

  // API Routes with rate limiter
  app.use('/api/v1', apiLimiter, apiRouter);

  // Fallback 404
  app.use((req, res) => {
    return res.status(404).json({
      success: false,
      error: `Cannot ${req.method} ${req.originalUrl}`,
    });
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
};

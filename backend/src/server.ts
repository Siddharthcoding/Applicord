import { createApp } from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { prisma } from './config/prisma';
import { startWorker } from './workers/worker';

const app = createApp();

const server = app.listen(config.port, () => {
  logger.info(`Applicord API server started on port ${config.port} [env=${config.nodeEnv}]`);
  
  // Start in-process background worker scheduler
  startWorker();
});

const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    logger.info('HTTP server closed.');
    await prisma.$disconnect();
    logger.info('Prisma disconnected.');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1), 10000;
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default server;

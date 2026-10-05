import { initQueues } from './queue';
import { processDueReminders } from './reminderWorker';
import { processEmailSync } from './emailWorker';
import { logger } from '../utils/logger';
import { redisReady } from '../config/redis';

export const startWorker = async () => {
  logger.info('[Worker] Starting background worker service...');

  // Wait for Redis connection attempt to settle before deciding on BullMQ vs in-process
  await redisReady;
  initQueues();

  // Run initial checks with a brief delay so HTTP server starts instantly without delay
  setTimeout(() => {
    processDueReminders().catch((err) => logger.error('Error running due reminders check', err));
    processEmailSync().catch((err) => logger.error('Error running email sync check', err));
  }, 3000);

  // Periodic interval schedule (every 5 minutes for reminders, every 15 minutes for emails)
  const reminderInterval = setInterval(() => {
    processDueReminders().catch((err) => logger.error('Error in reminder periodic task', err));
  }, 5 * 60 * 1000);

  const emailInterval = setInterval(() => {
    processEmailSync().catch((err) => logger.error('Error in email periodic task', err));
  }, 15 * 60 * 1000);

  const shutdown = () => {
    logger.info('[Worker] Shutting down worker...');
    clearInterval(reminderInterval);
    clearInterval(emailInterval);
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

// If run directly as standalone script:
if (require.main === module) {
  startWorker();
}

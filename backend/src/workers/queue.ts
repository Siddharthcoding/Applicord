import { Queue } from 'bullmq';
import { config } from '../config';
import { checkRedisAvailable } from '../config/redis';
import { logger } from '../utils/logger';

let emailQueue: Queue | null = null;
let reminderQueue: Queue | null = null;

export const initQueues = () => {
  if (!checkRedisAvailable()) {
    logger.info('[BullMQ] Redis not active. Using resilient in-process scheduled tasks.');
    return { emailQueue: null, reminderQueue: null };
  }

  try {
    const connection = { url: config.redisUrl };

    emailQueue = new Queue('email-processing', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });

    reminderQueue = new Queue('reminder-processing', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });

    logger.info('[BullMQ] Queues initialized successfully.');
    return { emailQueue, reminderQueue };
  } catch (err) {
    logger.warn('[BullMQ] Failed to initialize Redis queues. Continuing with in-process handlers.', { error: err });
    return { emailQueue: null, reminderQueue: null };
  }
};

export const getEmailQueue = () => emailQueue;
export const getReminderQueue = () => reminderQueue;

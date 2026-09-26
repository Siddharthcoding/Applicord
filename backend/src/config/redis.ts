import Redis from 'ioredis';
import { config } from './index';

let redisClient: Redis | null = null;
let isRedisAvailable = false;

try {
  redisClient = new Redis(config.redisUrl, {
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      if (times > 3) {
        return null; // Stop retrying after 3 attempts
      }
      return Math.min(times * 200, 1000);
    },
    lazyConnect: true,
  });

  redisClient.on('connect', () => {
    isRedisAvailable = true;
    console.log('[Redis] Connected successfully.');
  });

  redisClient.on('error', (err) => {
    isRedisAvailable = false;
    // Log once without spamming
  });
} catch (e) {
  isRedisAvailable = false;
}

export const getRedisClient = () => redisClient;
export const checkRedisAvailable = () => isRedisAvailable;
export { isRedisAvailable };

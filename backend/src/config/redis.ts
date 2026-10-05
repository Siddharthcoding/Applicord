import Redis from 'ioredis';
import { config } from './index';

let redisClient: Redis | null = null;
let isRedisAvailable = false;

// Resolves true if connected, false if not available
export let redisReady: Promise<boolean> = Promise.resolve(false);

try {
  const isTLS = config.redisUrl.startsWith('rediss://');

  // Extract hostname for SNI — required by Upstash (without it TLS handshake is ECONNRESET)
  const redisHostname = new URL(config.redisUrl).hostname;

  redisClient = new Redis(config.redisUrl, {
    maxRetriesPerRequest: 1,
    connectTimeout: 10000,
    retryStrategy(times) {
      if (times > 3) {
        return null; // Stop retrying after 3 attempts
      }
      return Math.min(times * 200, 1000);
    },
    // No lazyConnect — connect eagerly so isRedisAvailable is set before initQueues() runs
    ...(isTLS && { tls: { servername: redisHostname } }),
  });

  redisReady = new Promise<boolean>((resolve) => {
    redisClient!.once('ready', () => {
      isRedisAvailable = true;
      console.log('[Redis] Connected successfully.');
      resolve(true);
    });

    redisClient!.once('error', (err) => {
      console.warn('[Redis] Connection failed:', err.message);
      resolve(false);
    });

    // Safety timeout — don't block startup forever
    setTimeout(() => resolve(isRedisAvailable), 8000);
  });

  redisClient.on('error', () => {
    isRedisAvailable = false;
  });
} catch (e) {
  isRedisAvailable = false;
}

export const getRedisClient = () => redisClient;
export const checkRedisAvailable = () => isRedisAvailable;
export { isRedisAvailable };

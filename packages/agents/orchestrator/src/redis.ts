import IORedis from 'ioredis';

/**
 * Singleton Redis connection for BullMQ.
 * Supports redis:// (local/Docker) and rediss:// (TLS, e.g. Redis Cloud).
 */
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const isTls = redisUrl.startsWith('rediss://');

export const redisConnection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null, // Required for BullMQ
  ...(isTls ? { tls: {} } : {}),
});

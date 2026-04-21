import IORedis from 'ioredis';

const redisClient = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

export async function getCache(key: string): Promise<string | null> {
  return redisClient.get(key);
}

export async function setCache(key: string, value: string, ttlSeconds?: number): Promise<void> {
  if (ttlSeconds !== undefined) {
    await redisClient.set(key, value, 'EX', ttlSeconds);
  } else {
    await redisClient.set(key, value);
  }
}

export async function deleteCache(key: string): Promise<void> {
  await redisClient.del(key);
}

export default redisClient;

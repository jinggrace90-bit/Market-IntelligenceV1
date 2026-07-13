import Redis from 'ioredis';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export const redis = new Redis(env.redisUrl, {
  maxRetriesPerRequest: 3,
  lazyConnect: false,
});

redis.on('error', (err) => logger.error('Redis error', err.message));
redis.on('connect', () => logger.info('Redis connected'));

/**
 * Cache-aside helper. Returns cached JSON if present, otherwise runs
 * `producer`, caches the result for `ttlSeconds`, and returns it.
 * Falls back to the producer if Redis is unavailable so the app keeps working.
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  producer: () => Promise<T>,
): Promise<T> {
  try {
    const hit = await redis.get(key);
    if (hit) return JSON.parse(hit) as T;
  } catch (err) {
    logger.warn(`Redis GET failed for ${key}, bypassing cache`);
  }

  const value = await producer();

  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    /* non-fatal */
  }
  return value;
}

/**
 * Cache factory — selects the correct NarrationCache implementation
 * based on server configuration.
 *
 * When Redis is enabled and reachable: RedisNarrationCache
 * Otherwise: InMemoryNarrationCache (LRU, max 1000 entries)
 */

import type { NarrationCache } from '../narrative/cache.js';
import { InMemoryNarrationCache } from '../narrative/cache.js';
import { RedisNarrationCache } from './redis-client.js';
import type { ServerConfig } from '../config.js';

/**
 * Build a NarrationCache from config. If Redis is enabled, attempts
 * to connect. Falls back to in-memory if connection fails.
 *
 * @returns The cache instance and whether it's Redis-backed.
 */
export async function createNarrationCache(
  config: ServerConfig,
): Promise<{ cache: NarrationCache; isRedis: boolean }> {
  if (!config.redis.cacheEnabled) {
    return { cache: new InMemoryNarrationCache(), isRedis: false };
  }

  const redisCache = new RedisNarrationCache({
    url: config.redis.connectionString,
    silent: false,
  });

  const connected = await redisCache.connect();
  if (connected) {
    console.log('[Cache] Redis narration cache connected');
    return { cache: redisCache, isRedis: true };
  }

  console.warn('[Cache] Redis unavailable — falling back to in-memory cache');
  return { cache: new InMemoryNarrationCache(), isRedis: false };
}

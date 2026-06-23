/**
 * Cache factory — selects the correct NarrationCache implementation
 * based on server configuration.
 *
 * When Redis is enabled: RedisNarrationCache connects in the background.
 * Otherwise: InMemoryNarrationCache (LRU, max 1000 entries)
 */

import type { NarrationCache } from '../narrative/cache.js';
import { InMemoryNarrationCache } from '../narrative/cache.js';
import { RedisNarrationCache } from './redis-client.js';
import type { ServerConfig } from '../config.js';

/**
 * Build a NarrationCache from config. If Redis is enabled, do not block boot on
 * Redis connectivity; the Redis cache retries in the background and cache
 * operations are no-ops until Redis is ready.
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

  redisCache.startBackgroundConnect();
  console.log('[Cache] Redis narration cache enabled (non-blocking startup)');
  return { cache: redisCache, isRedis: true };
}

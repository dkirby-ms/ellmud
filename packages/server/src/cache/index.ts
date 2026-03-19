/**
 * Cache module barrel export.
 */

export { RedisNarrationCache } from './redis-client.js';
export type { RedisNarrationCacheConfig } from './redis-client.js';
export { createNarrationCache } from './cache-factory.js';

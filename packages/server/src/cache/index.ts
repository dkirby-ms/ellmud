/**
 * Cache module barrel export.
 */

export { RedisNarrationCache } from './redis-client.js';
export type { RedisNarrationCacheConfig } from './redis-client.js';
export { createNarrationCache } from './cache-factory.js';
export { createPresence } from './redis-presence.js';
export type { PresenceResult } from './redis-presence.js';
export { NonBlockingRedisDriver } from './nonblocking-redis-driver.js';
export { testRedisConnection } from './redis-test.js';
export type { RedisProbeResult } from './redis-test.js';

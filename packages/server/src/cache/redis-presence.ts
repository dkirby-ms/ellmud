/**
 * Redis Presence Factory — creates Colyseus Presence backend.
 *
 * When Redis is enabled: use a non-blocking presence proxy. It starts as
 * LocalPresence so server.listen() and /health never wait on Redis, then
 * connects RedisPresence in the background and mirrors subscriptions when ready.
 */

import type { Presence } from '@colyseus/core';
import { LocalPresence } from '@colyseus/core';
import type { ServerConfig } from '../config.js';
import { NonBlockingRedisPresence } from './nonblocking-redis-presence.js';

export interface PresenceResult {
  presence: Presence;
  isRedis: boolean;
  getStatus: () => string;
}

/**
 * Build a Colyseus Presence from config without probing/awaiting Redis.
 */
export async function createPresence(config: ServerConfig): Promise<PresenceResult> {
  if (!config.redis.enabled) {
    return { presence: new LocalPresence(), isRedis: false, getStatus: () => 'local' };
  }

  const presence = new NonBlockingRedisPresence(config.redis.connectionString);
  presence.start();
  console.log('[Presence] Redis presence enabled (non-blocking startup)');
  return { presence, isRedis: true, getStatus: () => `redis-${presence.status}` };
}

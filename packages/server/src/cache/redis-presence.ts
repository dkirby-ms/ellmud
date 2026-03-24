/**
 * Redis Presence Factory — creates Colyseus Presence backend.
 *
 * When Redis is enabled and reachable: RedisPresence (multi-replica scaling).
 * Otherwise: LocalPresence (in-process, single-replica only).
 *
 * The RedisPresence import is dynamic to avoid hard dependency when Redis
 * is disabled — @colyseus/redis-presence is an optional peer dep.
 *
 * Pre-validates Redis connectivity before constructing RedisPresence to
 * prevent unhandled ioredis `error` events from crashing the process
 * (the Colyseus package does not register its own error handler).
 */

import type { Presence } from '@colyseus/core';
import { LocalPresence } from '@colyseus/core';
import type { ServerConfig } from '../config.js';
import { testRedisConnection } from './redis-test.js';

export interface PresenceResult {
  presence: Presence;
  isRedis: boolean;
}

/**
 * Build a Colyseus Presence from config. If Redis presence is enabled,
 * probes connectivity first, then dynamically imports @colyseus/redis-presence.
 * Falls back to LocalPresence if Redis is unreachable or import fails.
 */
export async function createPresence(config: ServerConfig): Promise<PresenceResult> {
  if (!config.redis.enabled) {
    return { presence: new LocalPresence(), isRedis: false };
  }

  // Pre-validate — avoid handing an unreachable URL to RedisPresence
  const probe = await testRedisConnection(config.redis.connectionString);
  if (!probe.reachable) {
    console.warn(
      '[Presence] Redis unreachable — falling back to LocalPresence:',
      probe.error,
    );
    return { presence: new LocalPresence(), isRedis: false };
  }

  try {
    const { RedisPresence } = await import('@colyseus/redis-presence');
    const presence = new RedisPresence(config.redis.connectionString);
    console.log('[Presence] Redis presence initialized:', config.redis.connectionString);
    return { presence, isRedis: true };
  } catch (err) {
    console.warn(
      '[Presence] Redis presence unavailable — falling back to LocalPresence:',
      (err as Error).message,
    );
    return { presence: new LocalPresence(), isRedis: false };
  }
}

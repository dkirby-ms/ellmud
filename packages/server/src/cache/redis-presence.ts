/**
 * Redis Presence Factory — creates Colyseus Presence backend.
 *
 * When Redis is enabled and reachable: RedisPresence (multi-replica scaling).
 * Otherwise: LocalPresence (in-process, single-replica only).
 *
 * The RedisPresence import is dynamic to avoid hard dependency when Redis
 * is disabled — @colyseus/redis-presence is an optional peer dep.
 */

import type { Presence } from '@colyseus/core';
import { LocalPresence } from '@colyseus/core';
import type { ServerConfig } from '../config.js';

export interface PresenceResult {
  presence: Presence;
  isRedis: boolean;
}

/**
 * Build a Colyseus Presence from config. If Redis presence is enabled,
 * dynamically imports @colyseus/redis-presence and connects. Falls back
 * to LocalPresence on failure.
 */
export async function createPresence(config: ServerConfig): Promise<PresenceResult> {
  if (!config.redis.enabled) {
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

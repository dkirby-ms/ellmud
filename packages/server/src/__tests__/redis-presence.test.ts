/**
 * Redis Presence Factory Tests
 *
 * Covers: createPresence() factory function, config-driven backend selection,
 * graceful fallback to LocalPresence when Redis is disabled or unavailable.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LocalPresence } from '@colyseus/core';
import { createPresence } from '../cache/redis-presence.js';
import { NonBlockingRedisPresence } from '../cache/nonblocking-redis-presence.js';
import { loadConfig, resetConfig } from '../config.js';

describe('createPresence', () => {
  const envBackup: Record<string, string | undefined> = {};

  beforeEach(() => {
    envBackup['REDIS_PRESENCE_ENABLED'] = process.env['REDIS_PRESENCE_ENABLED'];
    envBackup['REDIS_CONNECTION_STRING'] = process.env['REDIS_CONNECTION_STRING'];
    resetConfig();
  });

  afterEach(() => {
    for (const [key, val] of Object.entries(envBackup)) {
      if (val === undefined) Reflect.deleteProperty(process.env, key);
      else process.env[key] = val;
    }
    resetConfig();
  });

  it('returns LocalPresence when redis.enabled is false', async () => {
    delete process.env['REDIS_PRESENCE_ENABLED'];
    const config = loadConfig();
    const { presence, isRedis } = await createPresence(config);

    expect(isRedis).toBe(false);
    expect(presence).toBeInstanceOf(LocalPresence);
  });

  it('returns LocalPresence by default (config defaults)', async () => {
    delete process.env['REDIS_PRESENCE_ENABLED'];
    delete process.env['REDIS_CONNECTION_STRING'];
    const config = loadConfig();
    const { presence, isRedis } = await createPresence(config);

    expect(isRedis).toBe(false);
    expect(presence).toBeInstanceOf(LocalPresence);
  });

  it('returns non-blocking Redis presence when redis.enabled is true', async () => {
    process.env['REDIS_PRESENCE_ENABLED'] = 'true';
    process.env['REDIS_CONNECTION_STRING'] = 'redis://localhost:6379';
    const config = loadConfig();

    const { presence, isRedis, getStatus } = await createPresence(config);
    expect(isRedis).toBe(true);
    expect(presence).toBeDefined();
    expect(presence).toBeInstanceOf(NonBlockingRedisPresence);
    expect(getStatus()).toMatch(/^redis-/);

    if ('shutdown' in presence && typeof presence.shutdown === 'function') {
      presence.shutdown();
    }
  });
});

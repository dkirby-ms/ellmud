/**
 * Wave 3 Redis Contracts — Anticipatory Tests (Issue #2)
 *
 * Tests behavioral contracts for Redis cache integration:
 * - Cache factory fallback when Redis unavailable
 * - RedisNarrationCache graceful degradation (get/set don't throw)
 * - TTL enforcement (ms→seconds conversion, minimum 1s)
 * - Key schema (narration: prefix + SHA-256 key)
 * - Connection lifecycle (connect → operations → disconnect)
 *
 * All tests mock ioredis — no real Redis required.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NarrationCache } from '../narrative/cache.js';
import { InMemoryNarrationCache } from '../narrative/cache.js';
import { RedisNarrationCache } from '../cache/redis-client.js';
import { createNarrationCache } from '../cache/cache-factory.js';
import type { ServerConfig } from '../config.js';

// ─── Mock ioredis ────────────────────────────────────────────────────────────

/**
 * Controllable mock Redis client that simulates ioredis behavior.
 * Allows tests to simulate connect success/failure, get/set/del,
 * and connection errors without a real Redis server.
 */
class MockRedisClient {
  private store = new Map<string, { value: string; ttl: number }>();
  private handlers = new Map<string, Array<(...args: unknown[]) => void>>();
  private _shouldConnectFail = false;
  private _shouldOperationsFail = false;
  private _quitShouldFail = false;
  private _connected = false;

  /** Configure whether connect() should throw. */
  set shouldConnectFail(v: boolean) { this._shouldConnectFail = v; }
  /** Configure whether get/set/del should throw. */
  set shouldOperationsFail(v: boolean) { this._shouldOperationsFail = v; }
  /** Configure whether quit() should throw. */
  set quitShouldFail(v: boolean) { this._quitShouldFail = v; }

  on(event: string, handler: (...args: unknown[]) => void): this {
    const list = this.handlers.get(event) ?? [];
    list.push(handler);
    this.handlers.set(event, list);
    return this;
  }

  private emit(event: string, ...args: unknown[]): void {
    for (const handler of this.handlers.get(event) ?? []) {
      handler(...args);
    }
  }

  async connect(): Promise<void> {
    if (this._shouldConnectFail) {
      this.emit('error', new Error('Connection refused'));
      throw new Error('Connection refused');
    }
    this._connected = true;
    this.emit('connect');
  }

  async get(key: string): Promise<string | null> {
    if (this._shouldOperationsFail) throw new Error('Redis GET failed');
    const entry = this.store.get(key);
    return entry?.value ?? null;
  }

  async set(key: string, value: string, _mode: string, _ttl: number): Promise<'OK'> {
    if (this._shouldOperationsFail) throw new Error('Redis SET failed');
    this.store.set(key, { value, ttl: _ttl });
    return 'OK';
  }

  async del(key: string): Promise<number> {
    if (this._shouldOperationsFail) throw new Error('Redis DEL failed');
    return this.store.delete(key) ? 1 : 0;
  }

  async quit(): Promise<'OK'> {
    if (this._quitShouldFail) throw new Error('Redis QUIT failed');
    this._connected = false;
    this.emit('close');
    return 'OK';
  }

  disconnect(): void {
    this._connected = false;
    this.emit('close');
  }

  /** Expose stored data for test assertions. */
  getStore(): Map<string, { value: string; ttl: number }> {
    return this.store;
  }
}

/** Module-level mock Redis instance, swapped per test. */
let mockRedisInstance: MockRedisClient;

vi.mock('ioredis', () => {
  return {
    Redis: vi.fn().mockImplementation(() => {
      return mockRedisInstance;
    }),
  };
});

// ─── Test Fixtures ───────────────────────────────────────────────────────────

function makeServerConfig(overrides: Partial<ServerConfig['redis']> = {}): ServerConfig {
  return {
    maxPlayersPerZone: 1,
    maxReplicas: 1,
    matchmakerMode: 'in-process',
    redis: {
      enabled: false,
      connectionString: 'redis://localhost:6379',
      cacheEnabled: false,
      driverEnabled: false,
      ...overrides,
    },
    port: 2567,
    authRequired: false,
    reconnectionTimeoutS: 30,
    reconnectDeathBehavior: 'kill',
    devModeEnabled: false,
    enableProceduralGeneration: false,
  };
}

// ─── Cache Factory Fallback ──────────────────────────────────────────────────

describe('Cache Factory Fallback (Issue #2)', () => {
  beforeEach(() => {
    mockRedisInstance = new MockRedisClient();
  });

  it('returns in-memory cache when cacheEnabled is false', async () => {
    const config = makeServerConfig({ cacheEnabled: false });
    const { cache, isRedis } = await createNarrationCache(config);

    expect(isRedis).toBe(false);
    expect(cache).toBeInstanceOf(InMemoryNarrationCache);
  });

  it('returns Redis cache when cacheEnabled is true and Redis connects', async () => {
    mockRedisInstance.shouldConnectFail = false;
    const config = makeServerConfig({ cacheEnabled: true });
    const { cache, isRedis } = await createNarrationCache(config);

    expect(isRedis).toBe(true);
    expect(cache).toBeInstanceOf(RedisNarrationCache);
  });

  it('falls back to in-memory when cacheEnabled is true but Redis connect fails', async () => {
    mockRedisInstance.shouldConnectFail = true;
    const config = makeServerConfig({ cacheEnabled: true });
    const { cache, isRedis } = await createNarrationCache(config);

    expect(isRedis).toBe(false);
    expect(cache).toBeInstanceOf(InMemoryNarrationCache);
  });

  it('uses custom connection string from config', async () => {
    const config = makeServerConfig({
      cacheEnabled: true,
      connectionString: 'redis://custom-host:6380',
    });
    // Connect will succeed (default mock behavior)
    const { isRedis } = await createNarrationCache(config);
    expect(isRedis).toBe(true);
  });
});

// ─── RedisNarrationCache Graceful Degradation ────────────────────────────────

describe('RedisNarrationCache Graceful Degradation (Issue #2)', () => {
  let cache: RedisNarrationCache;

  beforeEach(async () => {
    mockRedisInstance = new MockRedisClient();
    cache = new RedisNarrationCache({
      url: 'redis://localhost:6379',
      silent: true,
    });
    await cache.connect();
  });

  afterEach(async () => {
    await cache.disconnect();
  });

  it('get() returns null (not throws) when Redis errors', async () => {
    mockRedisInstance.shouldOperationsFail = true;
    const result = await cache.get('some-key');
    expect(result).toBeNull();
  });

  it('set() silently swallows errors (not throws)', async () => {
    mockRedisInstance.shouldOperationsFail = true;
    // Should NOT throw
    await expect(cache.set('key', 'value', 60000)).resolves.toBeUndefined();
  });

  it('del() silently swallows errors (not throws)', async () => {
    mockRedisInstance.shouldOperationsFail = true;
    await expect(cache.del('key')).resolves.toBeUndefined();
  });

  it('operations work normally when Redis is healthy', async () => {
    await cache.set('test-key', 'test-value', 60000);
    const result = await cache.get('test-key');
    expect(result).toBe('test-value');
  });
});

// ─── TTL Enforcement ─────────────────────────────────────────────────────────

describe('RedisNarrationCache TTL Enforcement (Issue #2)', () => {
  let cache: RedisNarrationCache;

  beforeEach(async () => {
    mockRedisInstance = new MockRedisClient();
    cache = new RedisNarrationCache({
      url: 'redis://localhost:6379',
      silent: true,
    });
    await cache.connect();
  });

  afterEach(async () => {
    await cache.disconnect();
  });

  it('converts TTL from milliseconds to seconds for Redis EX command', async () => {
    await cache.set('key1', 'value', 60000); // 60 seconds
    const entry = mockRedisInstance.getStore().get('narration:key1');
    expect(entry).toBeDefined();
    expect(entry?.ttl).toBe(60); // 60s, not 60000ms
  });

  it('enforces minimum TTL of 1 second', async () => {
    await cache.set('short-ttl', 'value', 500); // 500ms → should become 1s
    const entry = mockRedisInstance.getStore().get('narration:short-ttl');
    expect(entry).toBeDefined();
    expect(entry?.ttl).toBeGreaterThanOrEqual(1);
  });

  it('rounds TTL up (ceiling) for fractional seconds', async () => {
    await cache.set('fractional', 'value', 1500); // 1.5s → should become 2s
    const entry = mockRedisInstance.getStore().get('narration:fractional');
    expect(entry).toBeDefined();
    expect(entry?.ttl).toBe(2);
  });

  it('combat TTL (30s) converts correctly', async () => {
    await cache.set('combat', 'combat prose', 30_000);
    const entry = mockRedisInstance.getStore().get('narration:combat');
    expect(entry?.ttl).toBe(30);
  });

  it('exploration TTL (5min) converts correctly', async () => {
    await cache.set('explore', 'exploration prose', 300_000);
    const entry = mockRedisInstance.getStore().get('narration:explore');
    expect(entry?.ttl).toBe(300);
  });
});

// ─── Key Schema ──────────────────────────────────────────────────────────────

describe('Redis Key Schema (Issue #2)', () => {
  let cache: RedisNarrationCache;

  beforeEach(async () => {
    mockRedisInstance = new MockRedisClient();
    cache = new RedisNarrationCache({
      url: 'redis://localhost:6379',
      silent: true,
    });
    await cache.connect();
  });

  afterEach(async () => {
    await cache.disconnect();
  });

  it('prefixes keys with "narration:" by default', async () => {
    const sha256Key = 'a'.repeat(64); // Simulated SHA-256 hash
    await cache.set(sha256Key, 'prose', 60000);
    const storedKeys = [...mockRedisInstance.getStore().keys()];
    expect(storedKeys).toHaveLength(1);
    expect(storedKeys[0]).toBe(`narration:${'a'.repeat(64)}`);
  });

  it('get() uses the same prefix for lookups', async () => {
    const key = 'deadbeef'.repeat(8); // 64-char hex
    await cache.set(key, 'cached prose', 60000);
    const result = await cache.get(key);
    expect(result).toBe('cached prose');
  });

  it('del() uses the same prefix for deletion', async () => {
    const key = 'cafebabe'.repeat(8);
    await cache.set(key, 'to be deleted', 60000);
    await cache.del(key);
    const result = await cache.get(key);
    expect(result).toBeNull();
  });

  it('custom key prefix is respected', async () => {
    const customCache = new RedisNarrationCache({
      url: 'redis://localhost:6379',
      keyPrefix: 'custom:',
      silent: true,
    });
    await customCache.connect();
    await customCache.set('mykey', 'myvalue', 60000);

    const storedKeys = [...mockRedisInstance.getStore().keys()];
    expect(storedKeys[0]).toBe('custom:mykey');
    await customCache.disconnect();
  });
});

// ─── Connection Lifecycle ────────────────────────────────────────────────────

describe('Redis Connection Lifecycle (Issue #2)', () => {
  beforeEach(() => {
    mockRedisInstance = new MockRedisClient();
  });

  it('connect() returns true on success and sets connected=true', async () => {
    const cache = new RedisNarrationCache({
      url: 'redis://localhost:6379',
      silent: true,
    });
    const result = await cache.connect();
    expect(result).toBe(true);
    expect(cache.connected).toBe(true);
    await cache.disconnect();
  });

  it('connect() returns false on failure and sets connected=false', async () => {
    mockRedisInstance.shouldConnectFail = true;
    const cache = new RedisNarrationCache({
      url: 'redis://bad-host:6379',
      silent: true,
    });
    const result = await cache.connect();
    expect(result).toBe(false);
    expect(cache.connected).toBe(false);
  });

  it('disconnect() sets connected=false after quit', async () => {
    const cache = new RedisNarrationCache({
      url: 'redis://localhost:6379',
      silent: true,
    });
    await cache.connect();
    expect(cache.connected).toBe(true);

    await cache.disconnect();
    expect(cache.connected).toBe(false);
  });

  it('disconnect() force-disconnects when quit fails', async () => {
    mockRedisInstance.quitShouldFail = true;
    const cache = new RedisNarrationCache({
      url: 'redis://localhost:6379',
      silent: true,
    });
    await cache.connect();
    expect(cache.connected).toBe(true);

    // Should not throw even when quit fails
    await cache.disconnect();
    expect(cache.connected).toBe(false);
  });

  it('getClient() exposes the underlying Redis client', async () => {
    const cache = new RedisNarrationCache({
      url: 'redis://localhost:6379',
      silent: true,
    });
    const client = cache.getClient();
    expect(client).toBeDefined();
    expect(typeof client.get).toBe('function');
    expect(typeof client.set).toBe('function');
  });

  it('full lifecycle: connect → set → get → del → disconnect', async () => {
    const cache = new RedisNarrationCache({
      url: 'redis://localhost:6379',
      silent: true,
    });

    // Connect
    const connected = await cache.connect();
    expect(connected).toBe(true);

    // Set
    await cache.set('lifecycle-key', 'lifecycle-value', 60000);

    // Get
    const value = await cache.get('lifecycle-key');
    expect(value).toBe('lifecycle-value');

    // Del
    await cache.del('lifecycle-key');
    const deleted = await cache.get('lifecycle-key');
    expect(deleted).toBeNull();

    // Disconnect
    await cache.disconnect();
    expect(cache.connected).toBe(false);
  });
});

// ─── NarrationCache Interface Contract ───────────────────────────────────────

describe('RedisNarrationCache satisfies NarrationCache interface', () => {
  beforeEach(() => {
    mockRedisInstance = new MockRedisClient();
  });

  it('can be used wherever NarrationCache is expected', async () => {
    const cache: NarrationCache = new RedisNarrationCache({
      url: 'redis://localhost:6379',
      silent: true,
    });

    // Type check: NarrationCache requires get() and set()
    expect(typeof cache.get).toBe('function');
    expect(typeof cache.set).toBe('function');
  });

  it('get/set contract matches InMemoryNarrationCache behavior', async () => {
    const redis = new RedisNarrationCache({
      url: 'redis://localhost:6379',
      silent: true,
    });
    await (redis as RedisNarrationCache).connect();

    const memory = new InMemoryNarrationCache();

    // Both: miss → null
    expect(await redis.get('missing')).toBeNull();
    expect(await memory.get('missing')).toBeNull();

    // Both: set then get → returns value
    await redis.set('key', 'value', 60000);
    await memory.set('key', 'value', 60000);
    expect(await redis.get('key')).toBe('value');
    expect(await memory.get('key')).toBe('value');

    await (redis as RedisNarrationCache).disconnect();
  });
});

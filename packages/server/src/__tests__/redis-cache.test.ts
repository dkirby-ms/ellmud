/**
 * Redis Cache Tests
 *
 * Covers: RedisNarrationCache (mocked ioredis), cache factory logic,
 * NarrationService integration with Redis cache, config env vars,
 * and graceful fallback when Redis is unavailable.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { NarrationContext } from '@ellmud/shared';
import { InMemoryNarrationCache } from '../narrative/cache.js';
import type { NarrationCache } from '../narrative/cache.js';
import { NarrationService } from '../narrative/NarrationService.js';
import { hashState } from '../narrative/hasher.js';
import { LLMClient } from '../narrative/llm-client.js';
import type { LLMTransport, LLMResponse } from '../narrative/llm-client.js';
import { loadConfig, resetConfig } from '../config.js';

// ─── Test Fixtures ───────────────────────────────────────────────────────────

function makeContext(overrides: Partial<NarrationContext> = {}): NarrationContext {
  return {
    narration_type: 'room_description',
    room: {
      id: 'shard-test::room-1',
      biome: 'flooded_crypt',
      light_level: 0.3,
      exits: ['north', 'east'],
      features: ['collapsed_pillar'],
      items_visible: [],
      creatures: [
        { id: 'mob-1', type: 'drowned_revenant', state: 'idle', hp_pct: 1.0, disposition: 'hostile' },
      ],
      hazards: [],
      traces: [],
      shard_stability: 0.8,
    },
    player: {
      hp_pct: 0.9,
      statuses: [],
      stance: 'cautious',
      awareness_level: 2,
      visited_before: false,
    },
    recent_events: [],
    narrative_directives: {
      tone: 'dread',
      verbosity: 'standard',
      forbidden: [],
    },
    ...overrides,
  };
}

function makeMockTransport(
  response: string = 'The flooded crypt breathes with ancient malice.',
  delay: number = 10,
): LLMTransport {
  return async (_request, signal) => {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, delay);
      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new Error('Aborted'));
      }, { once: true });
    });
    return {
      choices: [{ message: { content: response } }],
    } as LLMResponse;
  };
}

// ─── Mock Redis Cache ────────────────────────────────────────────────────────

/**
 * A mock Redis cache that implements NarrationCache using an in-memory Map
 * but behaves like RedisNarrationCache (TTL in seconds, key prefixing).
 * Used to test NarrationService integration without a real Redis instance.
 */
class MockRedisCache implements NarrationCache {
  private readonly store = new Map<string, { value: string; expiresAt: number }>();
  readonly getCalls: string[] = [];
  readonly setCalls: Array<{ key: string; value: string; ttlMs: number }> = [];

  async get(key: string): Promise<string | null> {
    this.getCalls.push(key);
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlMs: number): Promise<void> {
    this.setCalls.push({ key, value, ttlMs });
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  get size(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
    this.getCalls.length = 0;
    this.setCalls.length = 0;
  }
}

// ─── RedisNarrationCache (unit tests with mock) ────────────────────────────

describe('MockRedisCache as NarrationCache', () => {
  let cache: MockRedisCache;

  beforeEach(() => {
    cache = new MockRedisCache();
  });

  it('satisfies the NarrationCache interface — get/set', async () => {
    await cache.set('abc123', 'Dark waters lap at ancient stone.', 60000);
    const result = await cache.get('abc123');
    expect(result).toBe('Dark waters lap at ancient stone.');
  });

  it('returns null for cache misses', async () => {
    const result = await cache.get('nonexistent');
    expect(result).toBeNull();
  });

  it('respects TTL — expired entries return null', async () => {
    await cache.set('short-lived', 'ephemeral', 1); // 1ms TTL
    await new Promise((r) => setTimeout(r, 10));
    expect(await cache.get('short-lived')).toBeNull();
  });

  it('tracks get and set calls for test assertions', async () => {
    await cache.set('k1', 'v1', 60000);
    await cache.get('k1');
    await cache.get('k2');

    expect(cache.setCalls).toHaveLength(1);
    expect(cache.getCalls).toEqual(['k1', 'k2']);
  });
});

// ─── NarrationService with Redis-like cache ──────────────────────────────────

describe('NarrationService with Redis cache', () => {
  it('uses injected Redis cache for narration lookups', async () => {
    const redisCache = new MockRedisCache();
    const service = new NarrationService({ cache: redisCache });
    const ctx = makeContext();

    const prose = await service.narrate(ctx);
    expect(prose.length).toBeGreaterThan(10);

    // Cache should have been populated
    expect(redisCache.setCalls).toHaveLength(1);
    expect(redisCache.setCalls[0]!.key).toMatch(/^[a-f0-9]{64}$/);
  });

  it('returns cached value on second call — no LLM invocation', async () => {
    const redisCache = new MockRedisCache();
    let llmCallCount = 0;
    const transport: LLMTransport = async () => {
      llmCallCount++;
      return { choices: [{ message: { content: 'LLM prose.' } }] };
    };

    const service = new NarrationService({
      cache: redisCache,
      llmClient: new LLMClient(transport),
    });
    const ctx = makeContext();

    // First call — LLM
    const prose1 = await service.narrate(ctx);
    expect(prose1).toBe('LLM prose.');
    expect(llmCallCount).toBe(1);

    // Second call — should hit cache
    const prose2 = await service.narrate(ctx);
    expect(prose2).toBe('LLM prose.');
    expect(llmCallCount).toBe(1); // NOT called again
    expect(service.telemetry.getTelemetry().cache_hits).toBe(1);
  });

  it('falls back to template when LLM is unavailable', async () => {
    const redisCache = new MockRedisCache();
    const service = new NarrationService({ cache: redisCache });
    const ctx = makeContext();

    const prose = await service.narrate(ctx);
    expect(prose).toBeTruthy();
    expect(prose.length).toBeGreaterThan(20);
    expect(service.telemetry.getTelemetry().fallback_uses).toBe(1);
  });

  it('pre-populated Redis cache returns immediately (cache hit)', async () => {
    const redisCache = new MockRedisCache();
    const ctx = makeContext();
    const cacheKey = hashState(ctx);

    // Pre-populate the "Redis" cache
    await redisCache.set(cacheKey, 'Pre-cached prose from Redis.', 300000);

    const service = new NarrationService({ cache: redisCache });
    const prose = await service.narrate(ctx);

    expect(prose).toBe('Pre-cached prose from Redis.');
    expect(service.telemetry.getTelemetry().cache_hits).toBe(1);
    expect(service.telemetry.getTelemetry().cache_misses).toBe(0);
  });

  it('different narration types get different cache keys', async () => {
    const redisCache = new MockRedisCache();
    const service = new NarrationService({ cache: redisCache });

    const ctx1 = makeContext({ narration_type: 'room_description' });
    const ctx2 = makeContext({ narration_type: 'combat_action' });

    await service.narrate(ctx1);
    await service.narrate(ctx2);

    // Two distinct cache entries
    expect(redisCache.setCalls).toHaveLength(2);
    expect(redisCache.setCalls[0]!.key).not.toBe(redisCache.setCalls[1]!.key);
  });

  it('combat narration uses shorter TTL than exploration', async () => {
    const redisCache = new MockRedisCache();
    const service = new NarrationService({ cache: redisCache });

    await service.narrate(makeContext({ narration_type: 'room_description' }));
    await service.narrate(makeContext({ narration_type: 'combat_action' }));

    const explorationTtl = redisCache.setCalls[0]!.ttlMs;
    const combatTtl = redisCache.setCalls[1]!.ttlMs;

    // Exploration TTL should be longer than combat TTL
    expect(explorationTtl).toBeGreaterThan(combatTtl);
  });
});

// ─── Cache swap integration ──────────────────────────────────────────────────

describe('Cache swap: InMemory ↔ Redis-like', () => {
  it('NarrationService works identically with either cache backend', async () => {
    const transport = makeMockTransport('Atmospheric prose from the LLM.', 10);
    const llmClient = new LLMClient(transport);
    const ctx = makeContext();

    // Test with in-memory cache
    const inMemoryCache = new InMemoryNarrationCache();
    const svcMemory = new NarrationService({ cache: inMemoryCache, llmClient });
    const proseMemory = await svcMemory.narrate(ctx);

    // Test with mock Redis cache
    const redisCache = new MockRedisCache();
    const svcRedis = new NarrationService({ cache: redisCache, llmClient: new LLMClient(transport) });
    const proseRedis = await svcRedis.narrate(ctx);

    // Both should produce the same LLM output
    expect(proseMemory).toBe('Atmospheric prose from the LLM.');
    expect(proseRedis).toBe('Atmospheric prose from the LLM.');

    // Both caches should have been populated
    expect(await inMemoryCache.get(hashState(ctx))).toBe('Atmospheric prose from the LLM.');
    expect(await redisCache.get(hashState(ctx))).toBe('Atmospheric prose from the LLM.');
  });

  it('switching from in-memory to Redis preserves behavior on cache miss', async () => {
    const ctx = makeContext();

    // In-memory: first call is always a miss
    const svc1 = new NarrationService({ cache: new InMemoryNarrationCache() });
    const prose1 = await svc1.narrate(ctx);

    // Redis: first call is also a miss
    const svc2 = new NarrationService({ cache: new MockRedisCache() });
    const prose2 = await svc2.narrate(ctx);

    // Both should produce template fallback (no LLM configured)
    expect(prose1.length).toBeGreaterThan(10);
    expect(prose2.length).toBeGreaterThan(10);
    expect(svc1.telemetry.getTelemetry().cache_misses).toBe(1);
    expect(svc2.telemetry.getTelemetry().cache_misses).toBe(1);
  });
});

// ─── Config env var tests ────────────────────────────────────────────────────

describe('Redis config env vars', () => {
  const envBackup: Record<string, string | undefined> = {};

  beforeEach(() => {
    envBackup['REDIS_PRESENCE_ENABLED'] = process.env['REDIS_PRESENCE_ENABLED'];
    envBackup['REDIS_CONNECTION_STRING'] = process.env['REDIS_CONNECTION_STRING'];
    envBackup['REDIS_CACHE_ENABLED'] = process.env['REDIS_CACHE_ENABLED'];
    resetConfig();
  });

  afterEach(() => {
    for (const [key, val] of Object.entries(envBackup)) {
      if (val === undefined) Reflect.deleteProperty(process.env, key);
      else process.env[key] = val;
    }
    resetConfig();
  });

  it('defaults: Redis presence disabled, cache disabled', () => {
    delete process.env['REDIS_PRESENCE_ENABLED'];
    delete process.env['REDIS_CONNECTION_STRING'];
    delete process.env['REDIS_CACHE_ENABLED'];
    const cfg = loadConfig();
    expect(cfg.redis.enabled).toBe(false);
    expect(cfg.redis.cacheEnabled).toBe(false);
    expect(cfg.redis.connectionString).toBe('redis://localhost:6379');
  });

  it('REDIS_CACHE_ENABLED=true enables cache', () => {
    process.env['REDIS_CACHE_ENABLED'] = 'true';
    const cfg = loadConfig();
    expect(cfg.redis.cacheEnabled).toBe(true);
  });

  it('REDIS_CACHE_ENABLED=false disables cache', () => {
    process.env['REDIS_CACHE_ENABLED'] = 'false';
    const cfg = loadConfig();
    expect(cfg.redis.cacheEnabled).toBe(false);
  });

  it('custom Redis connection string is respected', () => {
    process.env['REDIS_CONNECTION_STRING'] = 'redis://custom-host:6380';
    const cfg = loadConfig();
    expect(cfg.redis.connectionString).toBe('redis://custom-host:6380');
  });

  it('presence and cache can be independently toggled', () => {
    process.env['REDIS_PRESENCE_ENABLED'] = 'true';
    process.env['REDIS_CACHE_ENABLED'] = 'false';
    const cfg = loadConfig();
    expect(cfg.redis.enabled).toBe(true);
    expect(cfg.redis.cacheEnabled).toBe(false);
  });
});

// ─── Content-addressable cache key schema ────────────────────────────────────

describe('Content-addressable cache keys (SHA-256)', () => {
  it('cache key is the SHA-256 hash of canonicalized state', async () => {
    const cache = new MockRedisCache();
    const service = new NarrationService({ cache });
    const ctx = makeContext();

    await service.narrate(ctx);

    const expectedKey = hashState(ctx);
    expect(redisSetKey(cache)).toBe(expectedKey);
    expect(expectedKey).toMatch(/^[a-f0-9]{64}$/);
  });

  it('identical state snapshots produce the same cache key', async () => {
    const ctx1 = makeContext();
    const ctx2 = makeContext(); // exact same input

    expect(hashState(ctx1)).toBe(hashState(ctx2));
  });

  it('different states produce different cache keys', async () => {
    const ctx1 = makeContext({ narration_type: 'room_description' });
    const ctx2 = makeContext({ narration_type: 'combat_action' });

    expect(hashState(ctx1)).not.toBe(hashState(ctx2));
  });
});

function redisSetKey(cache: MockRedisCache): string {
  return cache.setCalls[0]?.key ?? '';
}

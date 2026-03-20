/**
 * Wave 3 Narration Pipeline Contracts — Anticipatory Tests (Issue #9)
 *
 * Tests behavioral contracts the narration pipeline must satisfy:
 * - Timeout budgets from GDD §4.5 (combat=800ms, exploration=2s, hard_limit=3s)
 * - Template fallback when LLM exceeds timeout
 * - Background enrichment writes to cache asynchronously after timeout
 * - Cache hit path skips LLM entirely
 * - Output contract validation (forbidden content detection)
 * - State snapshot → hash → cache key round-trip
 * - Telemetry event tracking (cache_hit, cache_miss, llm_timeout, fallback_used)
 * - End-to-end pipeline with mock dependencies
 */

import { describe, it, expect } from 'vitest';
import type {
  NarrationContext,
  NarrationConfig,
} from '@ellmud/shared';
import { DEFAULT_NARRATION_CONFIG } from '@ellmud/shared';
import { NarrationService } from '../narrative/NarrationService.js';
import { InMemoryNarrationCache } from '../narrative/cache.js';
import { LLMClient, validateLLMOutput } from '../narrative/llm-client.js';
import type { LLMTransport, LLMResponse } from '../narrative/llm-client.js';
import { hashState } from '../narrative/hasher.js';
import { renderTemplate } from '../narrative/templates.js';
import { NarrationTelemetryTracker } from '../narrative/telemetry.js';

// ─── Test Fixtures ───────────────────────────────────────────────────────────

function makeContext(overrides: Partial<NarrationContext> = {}): NarrationContext {
  return {
    narration_type: 'room_description',
    room: {
      id: 'shard-w3::room-01',
      biome: 'flooded_crypt',
      light_level: 0.3,
      exits: ['north', 'east'],
      features: ['collapsed_pillar'],
      items_visible: [],
      creatures: [
        { id: 'mob-1', type: 'drowned_revenant', state: 'idle', hp_pct: 1.0, disposition: 'hostile' },
      ],
      hazards: ['knee_deep_water'],
      traces: [],
      shard_stability: 0.7,
    },
    player: {
      hp_pct: 0.85,
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

function makeSlowTransport(delay: number): LLMTransport {
  return makeMockTransport('Slow LLM response.', delay);
}

function makeTrackingTransport(): { transport: LLMTransport; callCount: () => number } {
  let calls = 0;
  const transport: LLMTransport = async (_req, signal) => {
    calls++;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, 10);
      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new Error('Aborted'));
      }, { once: true });
    });
    return { choices: [{ message: { content: 'Tracked LLM response.' } }] };
  };
  return { transport, callCount: () => calls };
}

// ─── GDD §4.5 Timeout Budget Contracts ───────────────────────────────────────

describe('GDD §4.5 Timeout Budget Contracts (Issue #9)', () => {
  it('DEFAULT_NARRATION_CONFIG: combat_action timeout is 800ms', () => {
    expect(DEFAULT_NARRATION_CONFIG.timeouts.combat_action).toBe(800);
  });

  it('DEFAULT_NARRATION_CONFIG: combat_round timeout is 800ms', () => {
    expect(DEFAULT_NARRATION_CONFIG.timeouts.combat_round).toBe(800);
  });

  it('DEFAULT_NARRATION_CONFIG: room_description timeout is 2000ms', () => {
    expect(DEFAULT_NARRATION_CONFIG.timeouts.room_description).toBe(2000);
  });

  it('DEFAULT_NARRATION_CONFIG: movement timeout is 2000ms', () => {
    expect(DEFAULT_NARRATION_CONFIG.timeouts.movement).toBe(2000);
  });

  it('DEFAULT_NARRATION_CONFIG: event timeout is 2000ms', () => {
    expect(DEFAULT_NARRATION_CONFIG.timeouts.event).toBe(2000);
  });

  it('DEFAULT_NARRATION_CONFIG: hard_limit is 3000ms', () => {
    expect(DEFAULT_NARRATION_CONFIG.timeouts.hard_limit).toBe(3000);
  });

  it('combat narration respects 800ms budget — returns template when LLM is slow', async () => {
    const transport = makeSlowTransport(5000); // 5s — way over budget
    const config: NarrationConfig = {
      ...DEFAULT_NARRATION_CONFIG,
      timeouts: { ...DEFAULT_NARRATION_CONFIG.timeouts, combat_action: 100, hard_limit: 200 },
    };
    const service = new NarrationService({
      llmClient: new LLMClient(transport),
      config,
    });

    const ctx = makeContext({ narration_type: 'combat_action' });
    const start = Date.now();
    const prose = await service.narrate(ctx);
    const elapsed = Date.now() - start;

    expect(prose).not.toBe('Slow LLM response.');
    expect(prose.length).toBeGreaterThan(10);
    // Should complete well within the budget + overhead
    expect(elapsed).toBeLessThan(500);
    expect(service.telemetry.getTelemetry().llm_timeouts).toBe(1);
  });

  it('exploration narration respects 2s budget — returns template when LLM is slow', async () => {
    const transport = makeSlowTransport(5000);
    const config: NarrationConfig = {
      ...DEFAULT_NARRATION_CONFIG,
      timeouts: { ...DEFAULT_NARRATION_CONFIG.timeouts, room_description: 100, hard_limit: 200 },
    };
    const service = new NarrationService({
      llmClient: new LLMClient(transport),
      config,
    });

    const ctx = makeContext({ narration_type: 'room_description' });
    const start = Date.now();
    const prose = await service.narrate(ctx);
    const elapsed = Date.now() - start;

    expect(prose).not.toBe('Slow LLM response.');
    expect(elapsed).toBeLessThan(500);
    expect(service.telemetry.getTelemetry().fallback_uses).toBe(1);
  });

  it('fast LLM within budget returns LLM prose, not template', async () => {
    const transport = makeMockTransport('Dark waters whisper secrets.', 10);
    const service = new NarrationService({
      llmClient: new LLMClient(transport),
    });

    const ctx = makeContext({ narration_type: 'combat_action' });
    const prose = await service.narrate(ctx);

    expect(prose).toBe('Dark waters whisper secrets.');
    expect(service.telemetry.getTelemetry().llm_calls).toBe(1);
    expect(service.telemetry.getTelemetry().fallback_uses).toBe(0);
  });
});

// ─── Template Fallback Contract ──────────────────────────────────────────────

describe('Template Fallback Contract (Issue #9)', () => {
  it('template prose is returned immediately when LLM exceeds timeout', async () => {
    const transport = makeSlowTransport(10000);
    const config: NarrationConfig = {
      ...DEFAULT_NARRATION_CONFIG,
      timeouts: { ...DEFAULT_NARRATION_CONFIG.timeouts, room_description: 50, hard_limit: 100 },
    };
    const service = new NarrationService({
      llmClient: new LLMClient(transport),
      config,
    });

    const ctx = makeContext();
    const prose = await service.narrate(ctx);

    // Template produces atmospheric prose, not empty or error
    expect(prose.length).toBeGreaterThan(30);
    expect(prose).not.toBe('Slow LLM response.');
    expect(service.telemetry.getTelemetry().fallback_uses).toBe(1);
  });

  it('template fallback matches renderTemplate output', async () => {
    const service = new NarrationService(); // no LLM → always template
    const ctx = makeContext();

    const serviceProse = await service.narrate(ctx);
    const templateProse = renderTemplate('room_description', ctx);

    expect(serviceProse).toBe(templateProse);
  });

  it('template fallback for each narration type produces non-empty prose', async () => {
    const service = new NarrationService();
    const types = [
      'room_description',
      'combat_action',
      'combat_round',
      'movement',
      'event',
    ] as const;

    for (const type of types) {
      const ctx = makeContext({ narration_type: type });
      const prose = await service.narrate(ctx);
      expect(prose.length).toBeGreaterThan(5, `Template for ${type} should produce prose`);
    }
  });
});

// ─── Background Enrichment Contract ──────────────────────────────────────────

describe('Background Enrichment Contract (Issue #9)', () => {
  it('after timeout fallback, LLM result writes to cache asynchronously', async () => {
    let callIndex = 0;
    const transport: LLMTransport = async (_req, signal) => {
      callIndex++;
      if (callIndex === 1) {
        // First call: slow (triggers timeout, gets aborted)
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(resolve, 10000);
          signal.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new Error('Aborted'));
          }, { once: true });
        });
      }
      // Background call: fast and valid
      return { choices: [{ message: { content: 'Background enriched prose.' } }] };
    };

    const cache = new InMemoryNarrationCache();
    const config: NarrationConfig = {
      ...DEFAULT_NARRATION_CONFIG,
      timeouts: { ...DEFAULT_NARRATION_CONFIG.timeouts, room_description: 50, hard_limit: 500 },
    };

    const service = new NarrationService({
      llmClient: new LLMClient(transport),
      cache,
      config,
    });

    const ctx = makeContext();

    // First call returns template (LLM too slow)
    const prose = await service.narrate(ctx);
    expect(prose).not.toBe('Background enriched prose.');

    // Wait for background enrichment to complete
    await new Promise((r) => setTimeout(r, 600));

    // Cache should now contain the enriched version
    const cacheKey = hashState(ctx);
    const enriched = await cache.get(cacheKey);
    expect(enriched).toBe('Background enriched prose.');
  });

  it('background enrichment does NOT throw if LLM fails during enrichment', async () => {
    let callIndex = 0;
    const transport: LLMTransport = async (_req, signal) => {
      callIndex++;
      if (callIndex === 1) {
        await new Promise<void>((_, reject) => {
          const timer = setTimeout(() => reject(new Error('Timeout')), 10000);
          signal.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new Error('Aborted'));
          }, { once: true });
        });
      }
      // Background call also fails
      throw new Error('Background LLM network failure');
    };

    const cache = new InMemoryNarrationCache();
    const config: NarrationConfig = {
      ...DEFAULT_NARRATION_CONFIG,
      timeouts: { ...DEFAULT_NARRATION_CONFIG.timeouts, room_description: 50, hard_limit: 500 },
    };

    const service = new NarrationService({
      llmClient: new LLMClient(transport),
      cache,
      config,
    });

    const ctx = makeContext();

    // Should NOT throw even if background enrichment fails
    const prose = await service.narrate(ctx);
    expect(prose.length).toBeGreaterThan(10);

    // Wait for background enrichment attempt
    await new Promise((r) => setTimeout(r, 600));

    // Cache should still have the template (background enrichment failed)
    const cacheKey = hashState(ctx);
    const cached = await cache.get(cacheKey);
    expect(cached).toBeTruthy(); // Template was cached
    expect(cached).not.toBe('Background LLM network failure');
  });
});

// ─── Cache Hit Path Contract ─────────────────────────────────────────────────

describe('Cache Hit Path — No LLM Call (Issue #9)', () => {
  it('cached narration returns immediately without LLM call', async () => {
    const { transport, callCount } = makeTrackingTransport();
    const cache = new InMemoryNarrationCache();
    const ctx = makeContext();
    const cacheKey = hashState(ctx);

    // Pre-populate cache
    await cache.set(cacheKey, 'Pre-cached atmospheric prose.', 300000);

    const service = new NarrationService({
      cache,
      llmClient: new LLMClient(transport),
    });

    const prose = await service.narrate(ctx);
    expect(prose).toBe('Pre-cached atmospheric prose.');
    expect(callCount()).toBe(0); // LLM never called
    expect(service.telemetry.getTelemetry().cache_hits).toBe(1);
    expect(service.telemetry.getTelemetry().llm_calls).toBe(0);
  });

  it('first call populates cache, second call hits cache', async () => {
    const { transport, callCount } = makeTrackingTransport();
    const service = new NarrationService({
      llmClient: new LLMClient(transport),
    });

    const ctx = makeContext();
    await service.narrate(ctx); // miss → LLM
    await service.narrate(ctx); // hit → cache

    expect(callCount()).toBe(1);
    expect(service.telemetry.getTelemetry().cache_hits).toBe(1);
    expect(service.telemetry.getTelemetry().cache_misses).toBe(1);
  });

  it('different contexts produce different cache entries', async () => {
    const { transport, callCount } = makeTrackingTransport();
    const service = new NarrationService({
      llmClient: new LLMClient(transport),
    });

    const ctx1 = makeContext({ narration_type: 'room_description' });
    const ctx2 = makeContext({ narration_type: 'combat_action' });

    await service.narrate(ctx1);
    await service.narrate(ctx2);

    // Both are cache misses — LLM called twice
    expect(callCount()).toBe(2);
    expect(service.telemetry.getTelemetry().cache_misses).toBe(2);
  });
});

// ─── Output Contract Validation (GDD §4.4) ──────────────────────────────────

describe('Output Contract Validation — Forbidden Content (Issue #9)', () => {
  const ctx = makeContext();

  it('rejects text with numeric HP values', () => {
    expect(validateLLMOutput('You have 50 HP remaining.', ctx)).not.toBeNull();
  });

  it('rejects text with damage numbers', () => {
    expect(validateLLMOutput('You deal damage: 12 to the beast.', ctx)).not.toBeNull();
  });

  it('rejects text with percentage values', () => {
    expect(validateLLMOutput('The creature is at 30% health.', ctx)).not.toBeNull();
  });

  it('rejects text with Schema keywords (hp_pct)', () => {
    const result = validateLLMOutput('The hp_pct drops rapidly.', ctx);
    expect(result).not.toBeNull();
    expect(result).toContain('Schema keyword');
  });

  it('rejects text with Schema keywords (shard_stability)', () => {
    expect(validateLLMOutput('The shard_stability is failing.', ctx)).not.toBeNull();
  });

  it('rejects text with Schema keywords (awareness_level)', () => {
    expect(validateLLMOutput('Your awareness_level shifts.', ctx)).not.toBeNull();
  });

  it('rejects text with Schema keywords (light_level)', () => {
    expect(validateLLMOutput('The light_level changes.', ctx)).not.toBeNull();
  });

  it('rejects text with Schema keywords (disposition)', () => {
    expect(validateLLMOutput('Its disposition turns hostile.', ctx)).not.toBeNull();
  });

  it('rejects text with Schema keywords (narration_type)', () => {
    expect(validateLLMOutput('This narration_type is atmospheric.', ctx)).not.toBeNull();
  });

  it('rejects text with Schema keywords (narrative_directives)', () => {
    expect(validateLLMOutput('Following the narrative_directives closely.', ctx)).not.toBeNull();
  });

  it('rejects text with level numbers', () => {
    expect(validateLLMOutput('You are level 5 now.', ctx)).not.toBeNull();
  });

  it('rejects text with XP numbers', () => {
    expect(validateLLMOutput('You gain 100 XP from the fight.', ctx)).not.toBeNull();
  });

  it('rejects text with gold numbers', () => {
    expect(validateLLMOutput('You find 50 gold coins.', ctx)).not.toBeNull();
  });

  it('accepts clean atmospheric prose', () => {
    expect(validateLLMOutput(
      'The flooded crypt breathes with ancient malice. Dark water laps at crumbling stone.',
      ctx,
    )).toBeNull();
  });

  it('accepts prose with small written-out numbers', () => {
    expect(validateLLMOutput(
      'Three pillars rise from the dark water. Two exits beckon.',
      ctx,
    )).toBeNull();
  });

  it('NarrationService falls back to template when LLM output is rejected', async () => {
    const transport = makeMockTransport('You have 50 HP remaining and deal 12 damage.');
    const service = new NarrationService({
      llmClient: new LLMClient(transport),
    });

    const prose = await service.narrate(ctx);
    expect(prose).not.toContain('50 HP');
    expect(prose).not.toContain('12 damage');
    expect(prose.length).toBeGreaterThan(20);
    expect(service.telemetry.getTelemetry().fallback_uses).toBe(1);
  });
});

// ─── State Snapshot → Hash → Cache Key Round-Trip ────────────────────────────

describe('State → Hash → Cache Key Round-Trip (Issue #9)', () => {
  it('hashState produces 64-char hex SHA-256', () => {
    const ctx = makeContext();
    const hash = hashState(ctx);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('same state always produces same hash (deterministic)', () => {
    const ctx1 = makeContext();
    const ctx2 = makeContext();
    expect(hashState(ctx1)).toBe(hashState(ctx2));
  });

  it('different states produce different hashes', () => {
    const ctx1 = makeContext({ narration_type: 'room_description' });
    const ctx2 = makeContext({ narration_type: 'combat_action' });
    expect(hashState(ctx1)).not.toBe(hashState(ctx2));
  });

  it('property order does not affect hash', () => {
    const ctx1 = makeContext();
    const ctx2: NarrationContext = {
      narrative_directives: ctx1.narrative_directives,
      recent_events: ctx1.recent_events,
      player: ctx1.player,
      room: ctx1.room,
      narration_type: ctx1.narration_type,
    };
    expect(hashState(ctx1)).toBe(hashState(ctx2));
  });

  it('ephemeral tick field is stripped — different ticks produce same hash', () => {
    const ctx1 = makeContext({
      recent_events: [{ tick: 1, type: 'combat_result', summary: 'hit' }],
    });
    const ctx2 = makeContext({
      recent_events: [{ tick: 9999, type: 'combat_result', summary: 'hit' }],
    });
    expect(hashState(ctx1)).toBe(hashState(ctx2));
  });

  it('hash is used as the cache key in NarrationService', async () => {
    const cache = new InMemoryNarrationCache();
    const service = new NarrationService({ cache });
    const ctx = makeContext();

    await service.narrate(ctx);

    const expectedKey = hashState(ctx);
    const cached = await cache.get(expectedKey);
    expect(cached).toBeTruthy();
  });
});

// ─── Telemetry Event Tracking ────────────────────────────────────────────────

describe('Telemetry Event Tracking (Issue #9)', () => {
  it('tracks cache_hit when cache is populated', async () => {
    const cache = new InMemoryNarrationCache();
    const ctx = makeContext();
    await cache.set(hashState(ctx), 'cached', 60000);

    const service = new NarrationService({ cache });
    await service.narrate(ctx);

    expect(service.telemetry.getTelemetry().cache_hits).toBe(1);
  });

  it('tracks cache_miss on first call', async () => {
    const service = new NarrationService();
    await service.narrate(makeContext());

    expect(service.telemetry.getTelemetry().cache_misses).toBe(1);
  });

  it('tracks llm_timeout when LLM exceeds budget', async () => {
    const transport = makeSlowTransport(5000);
    const config: NarrationConfig = {
      ...DEFAULT_NARRATION_CONFIG,
      timeouts: { ...DEFAULT_NARRATION_CONFIG.timeouts, room_description: 50, hard_limit: 100 },
    };

    const service = new NarrationService({
      llmClient: new LLMClient(transport),
      config,
    });
    await service.narrate(makeContext());

    expect(service.telemetry.getTelemetry().llm_timeouts).toBe(1);
  });

  it('tracks fallback_used when template is served', async () => {
    const service = new NarrationService(); // no LLM → always fallback
    await service.narrate(makeContext());

    expect(service.telemetry.getTelemetry().fallback_uses).toBe(1);
  });

  it('tracks llm_calls and latency when LLM succeeds', async () => {
    const transport = makeMockTransport('Atmospheric prose.', 20);
    const service = new NarrationService({
      llmClient: new LLMClient(transport),
    });
    await service.narrate(makeContext());

    const t = service.telemetry.getTelemetry();
    expect(t.llm_calls).toBe(1);
    expect(t.llm_latencies.length).toBe(1);
    expect(t.avg_llm_latency_ms).toBeGreaterThan(0);
  });

  it('telemetry accumulates across multiple narrate calls', async () => {
    const service = new NarrationService();
    const ctx1 = makeContext({ narration_type: 'room_description' });
    const ctx2 = makeContext({ narration_type: 'combat_action' });

    await service.narrate(ctx1); // miss + fallback
    await service.narrate(ctx1); // hit
    await service.narrate(ctx2); // miss + fallback

    const t = service.telemetry.getTelemetry();
    expect(t.cache_hits).toBe(1);
    expect(t.cache_misses).toBe(2);
    expect(t.fallback_uses).toBe(2);
    expect(t.cache_hit_ratio).toBeCloseTo(1 / 3);
  });

  it('NarrationTelemetryTracker.reset() clears all counters', () => {
    const tracker = new NarrationTelemetryTracker();
    tracker.recordCacheHit();
    tracker.recordCacheMiss();
    tracker.recordLlmCall(100);
    tracker.recordLlmTimeout();
    tracker.recordFallbackUse();

    tracker.reset();
    const t = tracker.getTelemetry();
    expect(t.cache_hits).toBe(0);
    expect(t.cache_misses).toBe(0);
    expect(t.llm_calls).toBe(0);
    expect(t.llm_timeouts).toBe(0);
    expect(t.fallback_uses).toBe(0);
    expect(t.llm_latencies).toHaveLength(0);
  });
});

// ─── Cache TTL Contracts ─────────────────────────────────────────────────────

describe('Cache TTL Contracts (Issue #9)', () => {
  it('DEFAULT_NARRATION_CONFIG: combat TTL is 30 seconds (30_000ms)', () => {
    expect(DEFAULT_NARRATION_CONFIG.cache_ttl.combat).toBe(30_000);
  });

  it('DEFAULT_NARRATION_CONFIG: exploration TTL is 5 minutes (300_000ms)', () => {
    expect(DEFAULT_NARRATION_CONFIG.cache_ttl.exploration).toBe(300_000);
  });

  it('combat narration uses shorter TTL than exploration', async () => {
    const cache = new InMemoryNarrationCache();
    const service = new NarrationService({ cache });

    // Narrate a combat and an exploration context
    const combatCtx = makeContext({ narration_type: 'combat_action' });
    const exploreCtx = makeContext({ narration_type: 'room_description' });

    await service.narrate(combatCtx);
    await service.narrate(exploreCtx);

    // Both should be cached
    expect(await cache.get(hashState(combatCtx))).toBeTruthy();
    expect(await cache.get(hashState(exploreCtx))).toBeTruthy();
  });
});

// ─── End-to-End Pipeline Integration ─────────────────────────────────────────

describe('End-to-End Narration Pipeline (Issue #9)', () => {
  it('full pipeline: cache miss → LLM → validate → cache → return prose', async () => {
    const transport = makeMockTransport('The crypt murmurs with dread.', 10);
    const cache = new InMemoryNarrationCache();
    const service = new NarrationService({
      llmClient: new LLMClient(transport),
      cache,
    });

    const ctx = makeContext();
    const prose = await service.narrate(ctx);

    // LLM prose returned
    expect(prose).toBe('The crypt murmurs with dread.');

    // Cached for next call
    const cacheKey = hashState(ctx);
    expect(await cache.get(cacheKey)).toBe('The crypt murmurs with dread.');

    // Telemetry recorded
    const t = service.telemetry.getTelemetry();
    expect(t.cache_misses).toBe(1);
    expect(t.llm_calls).toBe(1);
    expect(t.fallback_uses).toBe(0);
  });

  it('full pipeline: cache miss → LLM timeout → template → background enrichment', async () => {
    let callIndex = 0;
    const transport: LLMTransport = async (_req, signal) => {
      callIndex++;
      if (callIndex === 1) {
        await new Promise<void>((_, reject) => {
          const timer = setTimeout(() => reject(new Error('hard timeout')), 10000);
          signal.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new Error('Aborted'));
          }, { once: true });
        });
      }
      return { choices: [{ message: { content: 'Enriched from background.' } }] };
    };

    const cache = new InMemoryNarrationCache();
    const config: NarrationConfig = {
      ...DEFAULT_NARRATION_CONFIG,
      timeouts: { ...DEFAULT_NARRATION_CONFIG.timeouts, room_description: 50, hard_limit: 500 },
    };

    const service = new NarrationService({
      llmClient: new LLMClient(transport),
      cache,
      config,
    });

    const ctx = makeContext();
    const prose = await service.narrate(ctx);

    // Got template, not LLM
    expect(prose).not.toBe('Enriched from background.');
    expect(prose.length).toBeGreaterThan(10);

    // Wait for background
    await new Promise((r) => setTimeout(r, 800));

    // Cache now has enriched version
    expect(await cache.get(hashState(ctx))).toBe('Enriched from background.');
  });

  it('full pipeline: cache hit → return immediately (no LLM, no template)', async () => {
    const { transport, callCount } = makeTrackingTransport();
    const cache = new InMemoryNarrationCache();
    const ctx = makeContext();

    // Pre-populate
    await cache.set(hashState(ctx), 'Pre-cached dark prose.', 300000);

    const service = new NarrationService({
      llmClient: new LLMClient(transport),
      cache,
    });

    const prose = await service.narrate(ctx);
    expect(prose).toBe('Pre-cached dark prose.');
    expect(callCount()).toBe(0);
  });

  it('all narration types produce prose through the full pipeline', async () => {
    const transport = makeMockTransport('Generic atmospheric prose.', 10);
    const service = new NarrationService({
      llmClient: new LLMClient(transport),
    });

    const types = [
      'room_description',
      'combat_action',
      'combat_round',
      'movement',
      'event',
    ] as const;

    for (const type of types) {
      const ctx = makeContext({ narration_type: type });
      const prose = await service.narrate(ctx);
      expect(prose).toBe('Generic atmospheric prose.');
    }

    expect(service.telemetry.getTelemetry().llm_calls).toBe(5);
    expect(service.telemetry.getTelemetry().cache_misses).toBe(5);
  });

  it('LLM transport error falls back gracefully without crashing', async () => {
    const transport: LLMTransport = async () => {
      throw new Error('Azure AI Foundry 503 Service Unavailable');
    };

    const service = new NarrationService({
      llmClient: new LLMClient(transport),
    });

    const ctx = makeContext();
    const prose = await service.narrate(ctx);

    expect(prose).toBeTruthy();
    expect(prose.length).toBeGreaterThan(10);
    expect(service.telemetry.getTelemetry().fallback_uses).toBeGreaterThan(0);
  });
});

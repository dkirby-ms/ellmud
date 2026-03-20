/**
 * Narration Pipeline Tests
 *
 * Covers: state hashing, cache behavior, template fallback, LLM client,
 * output validation, timeout enforcement, background enrichment,
 * and full pipeline integration.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type {
  NarrationContext,
  NarrationConfig,
} from '@ellmud/shared';
import { DEFAULT_NARRATION_CONFIG } from '@ellmud/shared';
import { hashState } from '../narrative/hasher.js';
import { InMemoryNarrationCache } from '../narrative/cache.js';
import { LLMClient, validateLLMOutput } from '../narrative/llm-client.js';
import type { LLMTransport, LLMResponse } from '../narrative/llm-client.js';
import { renderTemplate } from '../narrative/templates.js';
import { NarrationTelemetryTracker } from '../narrative/telemetry.js';
import { NarrationService } from '../narrative/NarrationService.js';

// ─── Test Fixtures ───────────────────────────────────────────────────────────

function makeContext(overrides: Partial<NarrationContext> = {}): NarrationContext {
  return {
    narration_type: 'room_description',
    room: {
      id: 'shard-0a3f::room-17',
      biome: 'flooded_crypt',
      light_level: 0.3,
      exits: ['north', 'east', 'down'],
      features: ['collapsed_pillar', 'altar_bloodstained'],
      items_visible: [
        { id: 'item-882', type: 'weapon', name: 'corroded_halberd', quality: 0.4 },
      ],
      creatures: [
        { id: 'mob-44', type: 'drowned_revenant', state: 'patrolling', hp_pct: 1.0, disposition: 'hostile' },
      ],
      hazards: ['knee_deep_water', 'unstable_ceiling'],
      traces: [
        { type: 'footprints', age_seconds: 180, direction: 'east', source: 'player' },
      ],
      shard_stability: 0.55,
    },
    player: {
      hp_pct: 0.72,
      statuses: ['bleeding_light'],
      stance: 'cautious',
      awareness_level: 2,
      visited_before: false,
    },
    recent_events: [
      { tick: 1042, type: 'combat_result', summary: 'player_hit_mob-44_slash_12dmg' },
      { tick: 1041, type: 'sound_heard', summary: 'footsteps_east_fading' },
    ],
    narrative_directives: {
      tone: 'dread',
      verbosity: 'standard',
      forbidden: ['reveal_hidden_items', 'reveal_player_names'],
    },
    ...overrides,
  };
}

function makeMockTransport(
  response: string = 'The flooded crypt breathes with ancient malice.',
  delay: number = 50,
): LLMTransport {
  return async (_request, signal) => {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, delay);
      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new DOMEvent('abort'));
      }, { once: true });
    });

    return {
      choices: [{ message: { content: response } }],
    } as LLMResponse;
  };
}

class DOMEvent extends Error {
  constructor(type: string) {
    super(type);
    this.name = 'AbortError';
  }
}

// ─── State Hashing ───────────────────────────────────────────────────────────

describe('State Hasher', () => {
  it('should produce a 64-character hex SHA-256 hash', () => {
    const ctx = makeContext();
    const hash = hashState(ctx);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should be deterministic — same input yields same hash', () => {
    const ctx = makeContext();
    expect(hashState(ctx)).toBe(hashState(ctx));
  });

  it('should produce different hashes for different states', () => {
    const ctx1 = makeContext();
    const ctx2 = makeContext({ narration_type: 'combat_action' });
    expect(hashState(ctx1)).not.toBe(hashState(ctx2));
  });

  it('should be order-independent for object keys', () => {
    const ctx1 = makeContext();
    // Create with properties in different order
    const ctx2: NarrationContext = {
      narrative_directives: ctx1.narrative_directives,
      recent_events: ctx1.recent_events,
      player: ctx1.player,
      room: ctx1.room,
      narration_type: ctx1.narration_type,
    };
    expect(hashState(ctx1)).toBe(hashState(ctx2));
  });

  it('should strip ephemeral tick fields from events', () => {
    const ctx1 = makeContext({
      recent_events: [{ tick: 100, type: 'combat_result', summary: 'hit' }],
    });
    const ctx2 = makeContext({
      recent_events: [{ tick: 999, type: 'combat_result', summary: 'hit' }],
    });
    expect(hashState(ctx1)).toBe(hashState(ctx2));
  });
});

// ─── In-Memory Cache ─────────────────────────────────────────────────────────

describe('InMemoryNarrationCache', () => {
  let cache: InMemoryNarrationCache;

  beforeEach(() => {
    cache = new InMemoryNarrationCache(5);
  });

  it('should return null for cache miss', async () => {
    expect(await cache.get('nonexistent')).toBeNull();
  });

  it('should store and retrieve values', async () => {
    await cache.set('key1', 'prose text', 60000);
    expect(await cache.get('key1')).toBe('prose text');
  });

  it('should respect TTL — expired entries return null', async () => {
    await cache.set('key1', 'value', 1); // 1ms TTL
    await new Promise((r) => setTimeout(r, 10));
    expect(await cache.get('key1')).toBeNull();
  });

  it('should evict oldest entry when at capacity', async () => {
    for (let i = 0; i < 5; i++) {
      await cache.set(`key${i}`, `val${i}`, 60000);
    }
    expect(cache.size).toBe(5);

    // Adding one more should evict the first
    await cache.set('key-new', 'new-val', 60000);
    expect(cache.size).toBe(5);
    expect(await cache.get('key0')).toBeNull();
    expect(await cache.get('key-new')).toBe('new-val');
  });

  it('should implement LRU — recently accessed items survive eviction', async () => {
    for (let i = 0; i < 5; i++) {
      await cache.set(`key${i}`, `val${i}`, 60000);
    }
    // Access key0 to make it recently used
    await cache.get('key0');
    // Add new entry — should evict key1 (oldest untouched)
    await cache.set('key-new', 'new-val', 60000);
    expect(await cache.get('key0')).toBe('val0');
    expect(await cache.get('key1')).toBeNull();
  });
});

// ─── Template Fallback ───────────────────────────────────────────────────────

describe('Template Fallback', () => {
  it('should render room_description with atmospheric prose', () => {
    const ctx = makeContext();
    const prose = renderTemplate('room_description', ctx);
    expect(prose.length).toBeGreaterThan(50);
    // Should contain biome atmosphere
    expect(prose.toLowerCase()).toContain('water');
    // Should mention exits
    expect(prose.toLowerCase()).toContain('north');
    // Should mention creatures
    expect(prose.toLowerCase()).toContain('revenant');
  });

  it('should render combat_action with atmospheric prose', () => {
    const ctx = makeContext({ narration_type: 'combat_action' });
    const prose = renderTemplate('combat_action', ctx);
    expect(prose.length).toBeGreaterThan(20);
    // Should not contain raw numbers
    expect(prose).not.toMatch(/\b\d+\s*(?:HP|damage|dmg)\b/i);
  });

  it('should render combat_round', () => {
    const ctx = makeContext({ narration_type: 'combat_round' });
    const prose = renderTemplate('combat_round', ctx);
    expect(prose.length).toBeGreaterThan(20);
    expect(prose).toContain('clash continues');
  });

  it('should render movement with direction and new room description', () => {
    const ctx = makeContext({
      narration_type: 'movement',
      recent_events: [{ tick: 1, type: 'movement', summary: 'north' }],
    });
    const prose = renderTemplate('movement', ctx);
    expect(prose.length).toBeGreaterThan(30);
    expect(prose.toLowerCase()).toContain('north');
  });

  it('should render event narration', () => {
    const ctx = makeContext({ narration_type: 'event' });
    const prose = renderTemplate('event', ctx);
    expect(prose.length).toBeGreaterThan(10);
  });

  it('should handle empty rooms gracefully', () => {
    const ctx = makeContext();
    ctx.room.creatures = [];
    ctx.room.items_visible = [];
    ctx.room.features = [];
    ctx.room.hazards = [];
    const prose = renderTemplate('room_description', ctx);
    expect(prose.length).toBeGreaterThan(30);
  });

  it('should describe stability warnings for unstable shards', () => {
    const ctx = makeContext();
    ctx.room.shard_stability = 0.1;
    const prose = renderTemplate('room_description', ctx);
    expect(prose.toLowerCase()).toContain('reality');
  });
});

// ─── LLM Output Validation ──────────────────────────────────────────────────

describe('LLM Output Validation', () => {
  const ctx = makeContext();

  it('should accept clean atmospheric prose', () => {
    const result = validateLLMOutput(
      'The flooded crypt breathes with ancient malice. Dark water laps at crumbling stone.',
      ctx,
    );
    expect(result).toBeNull();
  });

  it('should reject text containing HP numbers', () => {
    expect(validateLLMOutput('You have 50 HP remaining.', ctx)).not.toBeNull();
  });

  it('should reject text containing damage numbers', () => {
    expect(validateLLMOutput('You deal damage: 12 to the creature.', ctx)).not.toBeNull();
  });

  it('should reject text containing percentages', () => {
    expect(validateLLMOutput('The creature is at 30% health.', ctx)).not.toBeNull();
  });

  it('should reject text containing Schema keywords', () => {
    expect(validateLLMOutput('The hp_pct of the creature drops.', ctx)).not.toBeNull();
    expect(validateLLMOutput('Your awareness_level increases.', ctx)).not.toBeNull();
  });

  it('should reject text with level numbers', () => {
    expect(validateLLMOutput('You are level 5 now.', ctx)).not.toBeNull();
  });

  it('should reject text with XP numbers', () => {
    expect(validateLLMOutput('You gain 100 XP from the fight.', ctx)).not.toBeNull();
  });
});

// ─── LLM Client ──────────────────────────────────────────────────────────────

describe('LLMClient', () => {
  it('should return generated text from transport', async () => {
    const transport = makeMockTransport('The darkness breathes.');
    const client = new LLMClient(transport);
    const ctx = makeContext();
    const controller = new AbortController();

    const result = await client.generate(
      ctx,
      { max_tokens: 200, temperature: 0.8 },
      controller.signal,
    );

    expect(result.text).toBe('The darkness breathes.');
    expect(result.rejected).toBe(false);
  });

  it('should reject invalid LLM output', async () => {
    const transport = makeMockTransport('You have 50 HP remaining and deal 12 damage.');
    const client = new LLMClient(transport);
    const ctx = makeContext();
    const controller = new AbortController();

    const result = await client.generate(
      ctx,
      { max_tokens: 200, temperature: 0.8 },
      controller.signal,
    );

    expect(result.text).toBeNull();
    expect(result.rejected).toBe(true);
    expect(result.reason).toBeDefined();
  });

  it('should reject empty LLM response', async () => {
    const transport: LLMTransport = async () => ({
      choices: [{ message: { content: '' } }],
    });
    const client = new LLMClient(transport);
    const ctx = makeContext();
    const controller = new AbortController();

    const result = await client.generate(
      ctx,
      { max_tokens: 200, temperature: 0.8 },
      controller.signal,
    );

    expect(result.text).toBeNull();
    expect(result.rejected).toBe(true);
  });

  it('should throw on abort signal', async () => {
    const transport = makeMockTransport('text', 5000); // 5s delay
    const client = new LLMClient(transport);
    const ctx = makeContext();
    const controller = new AbortController();

    // Abort immediately
    setTimeout(() => controller.abort(), 10);

    await expect(
      client.generate(ctx, { max_tokens: 200, temperature: 0.8 }, controller.signal),
    ).rejects.toThrow();
  });
});

// ─── Telemetry ───────────────────────────────────────────────────────────────

describe('NarrationTelemetry', () => {
  let tracker: NarrationTelemetryTracker;

  beforeEach(() => {
    tracker = new NarrationTelemetryTracker();
  });

  it('should track cache hits and misses', () => {
    tracker.recordCacheHit();
    tracker.recordCacheHit();
    tracker.recordCacheMiss();

    const t = tracker.getTelemetry();
    expect(t.cache_hits).toBe(2);
    expect(t.cache_misses).toBe(1);
    expect(t.cache_hit_ratio).toBeCloseTo(2 / 3);
  });

  it('should track LLM latencies', () => {
    tracker.recordLlmCall(100);
    tracker.recordLlmCall(200);
    tracker.recordLlmCall(300);

    const t = tracker.getTelemetry();
    expect(t.llm_calls).toBe(3);
    expect(t.avg_llm_latency_ms).toBe(200);
  });

  it('should track fallback rate', () => {
    tracker.recordLlmCall(100);
    tracker.recordFallbackUse();
    tracker.recordFallbackUse();

    const t = tracker.getTelemetry();
    expect(t.fallback_rate).toBeCloseTo(2 / 3);
  });

  it('should reset all counters', () => {
    tracker.recordCacheHit();
    tracker.recordLlmCall(100);
    tracker.reset();

    const t = tracker.getTelemetry();
    expect(t.cache_hits).toBe(0);
    expect(t.llm_calls).toBe(0);
  });
});

// ─── NarrationService (Integration) ─────────────────────────────────────────

describe('NarrationService', () => {
  it('should return template when no LLM client is configured', async () => {
    const service = new NarrationService();
    const ctx = makeContext();
    const prose = await service.narrate(ctx);

    expect(prose.length).toBeGreaterThan(30);
    const t = service.telemetry.getTelemetry();
    expect(t.cache_misses).toBe(1);
    expect(t.fallback_uses).toBe(1);
  });

  it('should return cached prose on second call', async () => {
    const service = new NarrationService();
    const ctx = makeContext();

    await service.narrate(ctx); // first call — template
    const prose = await service.narrate(ctx); // second call — cached

    expect(prose.length).toBeGreaterThan(30);
    const t = service.telemetry.getTelemetry();
    expect(t.cache_hits).toBe(1);
    expect(t.cache_misses).toBe(1);
  });

  it('should return LLM prose when available and fast', async () => {
    const transport = makeMockTransport('The crypt murmurs with ancient sorrow.', 50);
    const llmClient = new LLMClient(transport);
    const service = new NarrationService({ llmClient });
    const ctx = makeContext();

    const prose = await service.narrate(ctx);
    expect(prose).toBe('The crypt murmurs with ancient sorrow.');

    const t = service.telemetry.getTelemetry();
    expect(t.llm_calls).toBe(1);
    expect(t.fallback_uses).toBe(0);
  });

  it('should fallback to template when LLM exceeds timeout', async () => {
    const transport = makeMockTransport('Slow response.', 5000); // 5 seconds
    const llmClient = new LLMClient(transport);
    const config: NarrationConfig = {
      ...DEFAULT_NARRATION_CONFIG,
      timeouts: {
        ...DEFAULT_NARRATION_CONFIG.timeouts,
        room_description: 100, // 100ms timeout for fast test
        hard_limit: 200,
      },
    };
    const service = new NarrationService({ llmClient, config });
    const ctx = makeContext();

    const prose = await service.narrate(ctx);
    // Should get template, not LLM output
    expect(prose).not.toBe('Slow response.');
    expect(prose.length).toBeGreaterThan(30);

    const t = service.telemetry.getTelemetry();
    expect(t.llm_timeouts).toBe(1);
    expect(t.fallback_uses).toBe(1);
  });

  it('should use template when LLM returns invalid output', async () => {
    const transport = makeMockTransport('You take 50 HP damage from the creature.');
    const llmClient = new LLMClient(transport);
    const service = new NarrationService({ llmClient });
    const ctx = makeContext();

    const prose = await service.narrate(ctx);
    // Should get template, not the invalid LLM output
    expect(prose).not.toContain('50 HP');
    expect(prose.length).toBeGreaterThan(30);

    const t = service.telemetry.getTelemetry();
    expect(t.fallback_uses).toBe(1);
  });

  it('should handle combat narration with shorter timeout budget', async () => {
    const transport = makeMockTransport('Steel clashes in shadow.', 50);
    const llmClient = new LLMClient(transport);
    const service = new NarrationService({ llmClient });
    const ctx = makeContext({ narration_type: 'combat_action' });

    const prose = await service.narrate(ctx);
    expect(prose).toBe('Steel clashes in shadow.');
  });

  it('should enrich cache in background after timeout', async () => {
    let callCount = 0;
    const transport: LLMTransport = async (_request, signal) => {
      callCount++;
      if (callCount === 1) {
        // First call: slow (triggers timeout)
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(resolve, 5000);
          signal.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new DOMEvent('abort'));
          }, { once: true });
        });
      }
      // Second call (background): fast and valid
      return { choices: [{ message: { content: 'Enriched prose from background.' } }] };
    };

    const llmClient = new LLMClient(transport);
    const cache = new InMemoryNarrationCache();
    const config: NarrationConfig = {
      ...DEFAULT_NARRATION_CONFIG,
      timeouts: {
        ...DEFAULT_NARRATION_CONFIG.timeouts,
        room_description: 50,
        hard_limit: 200,
      },
    };
    const service = new NarrationService({ llmClient, cache, config });
    const ctx = makeContext();

    // First call should return template
    const prose = await service.narrate(ctx);
    expect(prose).not.toBe('Enriched prose from background.');

    // Wait for background enrichment
    await new Promise((r) => setTimeout(r, 300));

    // Cache should now have the enriched version
    const cacheKey = hashState(ctx);
    const enriched = await cache.get(cacheKey);
    expect(enriched).toBe('Enriched prose from background.');
  });

  it('full pipeline: mock LLM timeout → template fallback delivers prose', async () => {
    // Integration test: the full pipeline with a mock slow LLM
    const transport = makeMockTransport('LLM response', 10000);
    const llmClient = new LLMClient(transport);
    const cache = new InMemoryNarrationCache();
    const config: NarrationConfig = {
      ...DEFAULT_NARRATION_CONFIG,
      timeouts: {
        ...DEFAULT_NARRATION_CONFIG.timeouts,
        combat_action: 50,
        combat_round: 50,
        room_description: 50,
        movement: 50,
        event: 50,
        hard_limit: 100,
      },
    };
    const service = new NarrationService({ llmClient, cache, config });

    // Test all narration types produce prose under timeout
    const types = [
      'room_description',
      'combat_action',
      'combat_round',
      'movement',
      'event',
    ] as const;

    for (const type of types) {
      const ctx = makeContext({ narration_type: type });
      const start = Date.now();
      const prose = await service.narrate(ctx);
      const elapsed = Date.now() - start;

      // Prose was delivered
      expect(prose.length).toBeGreaterThan(10);
      // Within reasonable time (timeout + overhead)
      expect(elapsed).toBeLessThan(1000);
      // Not the LLM response (it timed out)
      expect(prose).not.toBe('LLM response');
    }

    const t = service.telemetry.getTelemetry();
    expect(t.fallback_uses).toBe(5);
    expect(t.cache_misses).toBe(5);
  });
});

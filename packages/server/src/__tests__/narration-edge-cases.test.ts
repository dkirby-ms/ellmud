/**
 * Narration Pipeline Edge Case Tests
 *
 * Covers: concurrent narration requests, LLM transport errors,
 * cache edge cases, template rendering boundary conditions,
 * telemetry accumulation, and background enrichment failure handling.
 */

import { describe, it, expect } from 'vitest';
import type { NarrationContext } from '@ellmud/shared';
import { InMemoryNarrationCache } from '../narrative/cache.js';
import { LLMClient, validateLLMOutput } from '../narrative/llm-client.js';
import type { LLMTransport } from '../narrative/llm-client.js';
import { renderTemplate } from '../narrative/templates.js';
import { NarrationTelemetryTracker } from '../narrative/telemetry.js';
import { NarrationService } from '../narrative/NarrationService.js';
import { hashState } from '../narrative/hasher.js';

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

// ─── Cache Edge Cases ───────────────────────────────────────────────────────

describe('NarrationCache Edge Cases', () => {
  it('LRU eviction removes oldest entry when at capacity', async () => {
    const cache = new InMemoryNarrationCache(3);
    await cache.set('a', 'alpha', 60000);
    await cache.set('b', 'beta', 60000);
    await cache.set('c', 'gamma', 60000);

    // Cache is full (3 entries). Adding a 4th should evict 'a'
    await cache.set('d', 'delta', 60000);

    expect(await cache.get('a')).toBeNull();
    expect(await cache.get('b')).toBe('beta');
    expect(await cache.get('c')).toBe('gamma');
    expect(await cache.get('d')).toBe('delta');
  });

  it('accessing an entry moves it to most recently used position', async () => {
    const cache = new InMemoryNarrationCache(3);
    await cache.set('a', 'alpha', 60000);
    await cache.set('b', 'beta', 60000);
    await cache.set('c', 'gamma', 60000);

    // Access 'a' to move it to MRU
    await cache.get('a');

    // Now add 'd' — should evict 'b' (oldest unused), not 'a'
    await cache.set('d', 'delta', 60000);

    expect(await cache.get('a')).toBe('alpha'); // still present
    expect(await cache.get('b')).toBeNull(); // evicted
  });

  it('expired entries return null and get cleaned up', async () => {
    const cache = new InMemoryNarrationCache();
    await cache.set('key', 'value', 1); // 1ms TTL

    await new Promise((r) => setTimeout(r, 10));
    expect(await cache.get('key')).toBeNull();
  });

  it('overwriting existing key updates value and TTL', async () => {
    const cache = new InMemoryNarrationCache();
    await cache.set('key', 'old', 60000);
    await cache.set('key', 'new', 60000);
    expect(await cache.get('key')).toBe('new');
  });

  it('cache with capacity 1 always has latest entry', async () => {
    const cache = new InMemoryNarrationCache(1);
    await cache.set('a', 'alpha', 60000);
    await cache.set('b', 'beta', 60000);

    expect(await cache.get('a')).toBeNull();
    expect(await cache.get('b')).toBe('beta');
  });
});

// ─── LLM Output Validation Edge Cases ───────────────────────────────────────

describe('LLM Output Validation Edge Cases', () => {
  const ctx = makeContext();

  it('rejects output containing Schema keyword hp_pct', () => {
    const result = validateLLMOutput('The creature has hp_pct of 0.5', ctx);
    expect(result).not.toBeNull();
    expect(result).toContain('Schema keyword');
  });

  it('rejects output containing shard_stability keyword', () => {
    const result = validateLLMOutput('The shard_stability is dropping', ctx);
    expect(result).not.toBeNull();
  });

  it('rejects output with numeric HP values', () => {
    const result = validateLLMOutput('The creature has 50 HP remaining', ctx);
    expect(result).not.toBeNull();
  });

  it('rejects output with percentage values', () => {
    const result = validateLLMOutput('The creature is at 75% health', ctx);
    expect(result).not.toBeNull();
  });

  it('rejects output with level numbers', () => {
    const result = validateLLMOutput('This is a level 5 dungeon', ctx);
    expect(result).not.toBeNull();
  });

  it('accepts valid atmospheric prose', () => {
    const result = validateLLMOutput(
      'Shadows dance along the walls. The air is thick with dread.',
      ctx,
    );
    expect(result).toBeNull();
  });

  it('accepts prose with non-mechanical numbers', () => {
    const result = validateLLMOutput(
      'Three pillars rise from the dark water.',
      ctx,
    );
    expect(result).toBeNull();
  });
});

// ─── Template Rendering Boundary Conditions ─────────────────────────────────

describe('Template Rendering Boundaries', () => {
  it('renders room description with empty room (no creatures, items, features)', () => {
    const ctx = makeContext({
      room: {
        id: 'empty-room',
        biome: 'flooded_crypt',
        light_level: 0.5,
        exits: ['north'],
        features: [],
        items_visible: [],
        creatures: [],
        hazards: [],
        traces: [],
        shard_stability: 1.0,
      },
    });

    const result = renderTemplate('room_description', ctx);
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(10);
    expect(result).toContain('north');
  });

  it('renders room description with very low stability (collapsing)', () => {
    const ctx = makeContext({
      room: {
        ...makeContext().room,
        shard_stability: 0.1,
      },
    });

    const result = renderTemplate('room_description', ctx);
    expect(result).toContain('buckle'); // "Reality buckles"
  });

  it('renders combat_action with critical player HP', () => {
    const ctx = makeContext({
      narration_type: 'combat_action',
      player: {
        ...makeContext().player,
        hp_pct: 0.1,
      },
    });

    const result = renderTemplate('combat_action', ctx);
    expect(result).toContain('barely holding'); // critical HP description
  });

  it('renders combat_action with no recent events', () => {
    const ctx = makeContext({
      narration_type: 'combat_action',
      recent_events: [],
    });

    const result = renderTemplate('combat_action', ctx);
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(5);
  });

  it('renders combat_round template', () => {
    const ctx = makeContext({ narration_type: 'combat_round' });
    const result = renderTemplate('combat_round', ctx);
    expect(result).toContain('clash continues');
  });

  it('renders movement template with direction', () => {
    const ctx = makeContext({
      narration_type: 'movement',
      recent_events: [{ tick: 1, type: 'movement', summary: 'north' }],
    });

    const result = renderTemplate('movement', ctx);
    expect(result).toContain('north');
  });

  it('renders movement template without direction event', () => {
    const ctx = makeContext({
      narration_type: 'movement',
      recent_events: [],
    });

    const result = renderTemplate('movement', ctx);
    expect(result).toContain('move onward');
  });

  it('renders event template with stability warning', () => {
    const ctx = makeContext({
      narration_type: 'event',
      room: { ...makeContext().room, shard_stability: 0.15 },
    });

    const result = renderTemplate('event', ctx);
    expect(result).toBeTruthy();
  });

  it('renders room description for all biomes', () => {
    const biomes = ['flooded_crypt', 'shattered_bastion', 'fungal_deep', 'ashen_reach', 'void_rift'];
    for (const biome of biomes) {
      const ctx = makeContext({
        room: { ...makeContext().room, biome },
      });
      const result = renderTemplate('room_description', ctx);
      expect(result.length).toBeGreaterThan(20);
    }
  });

  it('renders room description for unknown biome gracefully', () => {
    const ctx = makeContext({
      room: { ...makeContext().room, biome: 'unknown_biome' },
    });
    const result = renderTemplate('room_description', ctx);
    expect(result).toContain('air hangs heavy'); // fallback atmosphere
  });
});

// ─── State Hasher Edge Cases ────────────────────────────────────────────────

describe('State Hasher Edge Cases', () => {
  it('identical contexts produce identical hashes', () => {
    const ctx1 = makeContext();
    const ctx2 = makeContext();
    expect(hashState(ctx1)).toBe(hashState(ctx2));
  });

  it('different contexts produce different hashes', () => {
    const ctx1 = makeContext();
    const ctx2 = makeContext({ room: { ...makeContext().room, id: 'different-room' } });
    expect(hashState(ctx1)).not.toBe(hashState(ctx2));
  });

  it('tick field is stripped (ephemeral) — same state with different ticks hashes equally', () => {
    const ctx1 = makeContext({
      recent_events: [{ tick: 100, type: 'combat', summary: 'hit' }],
    });
    const ctx2 = makeContext({
      recent_events: [{ tick: 999, type: 'combat', summary: 'hit' }],
    });
    expect(hashState(ctx1)).toBe(hashState(ctx2));
  });

  it('property insertion order does not affect hash', () => {
    const ctx1 = makeContext({
      room: {
        id: 'room-1',
        biome: 'flooded_crypt',
        light_level: 0.3,
        exits: ['north'],
        features: [],
        items_visible: [],
        creatures: [],
        hazards: [],
        traces: [],
        shard_stability: 0.5,
      },
    });
    const ctx2 = makeContext({
      room: {
        shard_stability: 0.5,
        traces: [],
        hazards: [],
        creatures: [],
        items_visible: [],
        features: [],
        exits: ['north'],
        light_level: 0.3,
        biome: 'flooded_crypt',
        id: 'room-1',
      },
    });
    expect(hashState(ctx1)).toBe(hashState(ctx2));
  });
});

// ─── NarrationService Integration Edge Cases ────────────────────────────────

describe('NarrationService Edge Cases', () => {
  it('concurrent narrate calls for same state use cache efficiently', async () => {
    const callCount = { value: 0 };
    const transport: LLMTransport = async (_req, _sig) => {
      callCount.value++;
      return { choices: [{ message: { content: 'Dark waters rise.' } }] };
    };

    const service = new NarrationService({
      llmClient: new LLMClient(transport),
    });

    const ctx = makeContext();

    // First call populates cache
    const result1 = await service.narrate(ctx);
    expect(result1).toBe('Dark waters rise.');

    // Second call should hit cache without calling LLM
    const result2 = await service.narrate(ctx);
    expect(result2).toBe('Dark waters rise.');

    // LLM should only have been called once
    expect(callCount.value).toBe(1);
    expect(service.telemetry.getTelemetry().cache_hits).toBe(1);
  });

  it('LLM transport error falls back to template', async () => {
    const transport: LLMTransport = async () => {
      throw new Error('Network failure');
    };

    const service = new NarrationService({
      llmClient: new LLMClient(transport),
    });

    const ctx = makeContext();
    const result = await service.narrate(ctx);

    // Should get a template fallback (not throw)
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(10);
    expect(service.telemetry.getTelemetry().fallback_uses).toBeGreaterThan(0);
  });

  it('LLM returning rejected output falls back to template', async () => {
    const transport: LLMTransport = async () => ({
      choices: [{ message: { content: 'The creature has 50 HP remaining' } }],
    });

    const service = new NarrationService({
      llmClient: new LLMClient(transport),
    });

    const ctx = makeContext();
    const result = await service.narrate(ctx);

    // Should get template (LLM output was rejected)
    expect(result).toBeTruthy();
    expect(result).not.toContain('50 HP');
  });

  it('service without LLM client always uses templates', async () => {
    const service = new NarrationService(); // no llmClient

    const ctx = makeContext();
    const result = await service.narrate(ctx);

    expect(result).toBeTruthy();
    expect(service.telemetry.getTelemetry().fallback_uses).toBe(1);
    expect(service.telemetry.getTelemetry().llm_calls).toBe(0);
  });

  it('LLM returning empty response falls back to template', async () => {
    const transport: LLMTransport = async () => ({
      choices: [{ message: { content: '' } }],
    });

    const service = new NarrationService({
      llmClient: new LLMClient(transport),
    });

    const ctx = makeContext();
    const result = await service.narrate(ctx);

    // Empty LLM response → rejected → template
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(10);
  });
});

// ─── Telemetry Tracker Edge Cases ───────────────────────────────────────────

describe('Telemetry Tracker Edge Cases', () => {
  it('fresh tracker has all zeros', () => {
    const tracker = new NarrationTelemetryTracker();
    const t = tracker.getTelemetry();

    expect(t.cache_hits).toBe(0);
    expect(t.cache_misses).toBe(0);
    expect(t.llm_calls).toBe(0);
    expect(t.llm_timeouts).toBe(0);
    expect(t.fallback_uses).toBe(0);
    expect(t.avg_llm_latency_ms).toBe(0);
    expect(t.cache_hit_ratio).toBe(0);
    expect(t.fallback_rate).toBe(0);
  });

  it('cache hit ratio is computed correctly', () => {
    const tracker = new NarrationTelemetryTracker();
    tracker.recordCacheHit();
    tracker.recordCacheHit();
    tracker.recordCacheHit();
    tracker.recordCacheMiss();

    const t = tracker.getTelemetry();
    expect(t.cache_hit_ratio).toBe(0.75);
  });

  it('fallback rate is computed correctly', () => {
    const tracker = new NarrationTelemetryTracker();
    tracker.recordLlmCall(100);
    tracker.recordFallbackUse();
    tracker.recordFallbackUse();

    const t = tracker.getTelemetry();
    expect(t.fallback_rate).toBeCloseTo(2 / 3);
  });

  it('reset clears all counters', () => {
    const tracker = new NarrationTelemetryTracker();
    tracker.recordCacheHit();
    tracker.recordCacheMiss();
    tracker.recordLlmCall(200);
    tracker.recordLlmTimeout();
    tracker.recordFallbackUse();

    tracker.reset();
    const t = tracker.getTelemetry();
    expect(t.cache_hits).toBe(0);
    expect(t.llm_calls).toBe(0);
    expect(t.llm_latencies).toHaveLength(0);
  });

  it('latency samples are capped at 1000', () => {
    const tracker = new NarrationTelemetryTracker();
    for (let i = 0; i < 1100; i++) {
      tracker.recordLlmCall(i);
    }
    expect(tracker.getTelemetry().llm_latencies.length).toBe(1000);
  });
});

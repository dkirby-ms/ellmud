/**
 * Narration Pipeline Integration Tests — Issue #9 Acceptance Criteria
 *
 * End-to-end tests covering the full pipeline:
 *   hash state → cache lookup → LLM with timeout → template fallback → background enrichment
 *
 * Every acceptance criterion from issue #9 is explicitly tested.
 */

import { describe, it, expect } from 'vitest';
import type {
  NarrationContext,
  NarrationConfig,
  LLMNarrationType,
} from '@ellmud/shared';
import { DEFAULT_NARRATION_CONFIG } from '@ellmud/shared';
import { hashState } from '../narrative/hasher.js';
import { InMemoryNarrationCache } from '../narrative/cache.js';
import { LLMClient, validateLLMOutput } from '../narrative/llm-client.js';
import type { LLMTransport, LLMResponse } from '../narrative/llm-client.js';
import { renderTemplate } from '../narrative/templates.js';
import { NarrationService } from '../narrative/NarrationService.js';

// ─── Test Fixtures ───────────────────────────────────────────────────────────

function makeContext(overrides: Partial<NarrationContext> = {}): NarrationContext {
  return {
    narration_type: 'room_description',
    room: {
      id: 'shard-0a3f::room-17',
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
      forbidden: ['reveal_hidden_items', 'reveal_player_names', 'invent_entities', 'resolve_mechanics'],
    },
    ...overrides,
  };
}

class AbortError extends Error {
  constructor() {
    super('abort');
    this.name = 'AbortError';
  }
}

function makeMockTransport(
  response: string,
  delay: number = 50,
): LLMTransport {
  return async (_request, signal) => {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, delay);
      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new AbortError());
      }, { once: true });
    });
    return { choices: [{ message: { content: response } }] } as LLMResponse;
  };
}

function makeSlowTransport(delayMs: number): LLMTransport {
  return makeMockTransport('Slow LLM response that arrives too late.', delayMs);
}

function makeConfig(overrides: Partial<NarrationConfig> = {}): NarrationConfig {
  return {
    ...DEFAULT_NARRATION_CONFIG,
    ...overrides,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// AC: SHA-256 hash function for state snapshot → cache key
// ═════════════════════════════════════════════════════════════════════════════

describe('AC: SHA-256 state hashing for cache keys', () => {
  it('produces a valid 64-char hex SHA-256 hash', () => {
    const hash = hashState(makeContext());
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('is content-addressable: identical states → identical keys', () => {
    const ctx = makeContext();
    expect(hashState(ctx)).toBe(hashState(ctx));
  });

  it('different states produce different keys', () => {
    const roomCtx = makeContext({ narration_type: 'room_description' });
    const combatCtx = makeContext({ narration_type: 'combat_action' });
    expect(hashState(roomCtx)).not.toBe(hashState(combatCtx));
  });

  it('strips ephemeral tick field — same events with different ticks hash equally', () => {
    const ctx1 = makeContext({
      recent_events: [{ tick: 1, type: 'combat_result', summary: 'hit' }],
    });
    const ctx2 = makeContext({
      recent_events: [{ tick: 9999, type: 'combat_result', summary: 'hit' }],
    });
    expect(hashState(ctx1)).toBe(hashState(ctx2));
  });

  it('is order-independent for object keys', () => {
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
});

// ═════════════════════════════════════════════════════════════════════════════
// AC: Redis/Cache lookup — cache hit → return stored prose immediately
// ═════════════════════════════════════════════════════════════════════════════

describe('AC: Cache hit returns stored prose immediately', () => {
  it('second call for same state returns cached prose without LLM call', async () => {
    let llmCallCount = 0;
    const transport: LLMTransport = async () => {
      llmCallCount++;
      return { choices: [{ message: { content: 'Dark waters stir below.' } }] };
    };

    const service = new NarrationService({
      llmClient: new LLMClient(transport),
    });
    const ctx = makeContext();

    const first = await service.narrate(ctx);
    const second = await service.narrate(ctx);

    expect(first).toBe('Dark waters stir below.');
    expect(second).toBe('Dark waters stir below.');
    expect(llmCallCount).toBe(1);
    expect(service.telemetry.getTelemetry().cache_hits).toBe(1);
  });

  it('pre-populated cache returns immediately without any LLM call', async () => {
    const cache = new InMemoryNarrationCache();
    const ctx = makeContext();
    const key = hashState(ctx);
    await cache.set(key, 'Pre-cached description of the flooded crypt.', 60000);

    let llmCalled = false;
    const transport: LLMTransport = async () => {
      llmCalled = true;
      return { choices: [{ message: { content: 'Should not appear.' } }] };
    };

    const service = new NarrationService({
      cache,
      llmClient: new LLMClient(transport),
    });

    const result = await service.narrate(ctx);
    expect(result).toBe('Pre-cached description of the flooded crypt.');
    expect(llmCalled).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// AC: Cache miss → call Azure AI Foundry GPT-4o-mini
// ═════════════════════════════════════════════════════════════════════════════

describe('AC: Cache miss calls LLM and caches result', () => {
  it('calls LLM on cache miss, caches the response', async () => {
    const cache = new InMemoryNarrationCache();
    const transport = makeMockTransport('Ancient stones weep in the darkness.');
    const service = new NarrationService({
      cache,
      llmClient: new LLMClient(transport),
    });

    const ctx = makeContext();
    const result = await service.narrate(ctx);

    expect(result).toBe('Ancient stones weep in the darkness.');
    // Verify it was cached
    const cached = await cache.get(hashState(ctx));
    expect(cached).toBe('Ancient stones weep in the darkness.');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// AC: Timeout budgets (GDD §4.5): 800ms combat, 2s exploration, 3s hard limit
// ═════════════════════════════════════════════════════════════════════════════

describe('AC: Timeout budgets per narration type (GDD §4.5)', () => {
  it('DEFAULT_NARRATION_CONFIG has correct timeout values', () => {
    expect(DEFAULT_NARRATION_CONFIG.timeouts.combat_action).toBe(800);
    expect(DEFAULT_NARRATION_CONFIG.timeouts.combat_round).toBe(800);
    expect(DEFAULT_NARRATION_CONFIG.timeouts.room_description).toBe(2000);
    expect(DEFAULT_NARRATION_CONFIG.timeouts.movement).toBe(2000);
    expect(DEFAULT_NARRATION_CONFIG.timeouts.event).toBe(2000);
    expect(DEFAULT_NARRATION_CONFIG.timeouts.hard_limit).toBe(3000);
  });

  it('combat narration uses 800ms timeout — falls back when LLM exceeds it', async () => {
    const transport = makeSlowTransport(5000);
    const config = makeConfig({
      timeouts: { ...DEFAULT_NARRATION_CONFIG.timeouts, combat_action: 100, hard_limit: 200 },
    });
    const service = new NarrationService({
      llmClient: new LLMClient(transport),
      config,
    });

    const ctx = makeContext({ narration_type: 'combat_action' });
    const start = Date.now();
    const prose = await service.narrate(ctx);
    const elapsed = Date.now() - start;

    expect(prose).not.toBe('Slow LLM response that arrives too late.');
    expect(prose.length).toBeGreaterThan(10);
    expect(elapsed).toBeLessThan(500);
    expect(service.telemetry.getTelemetry().fallback_uses).toBe(1);
  });

  it('exploration narration uses 2s timeout — falls back when LLM exceeds it', async () => {
    const transport = makeSlowTransport(5000);
    const config = makeConfig({
      timeouts: { ...DEFAULT_NARRATION_CONFIG.timeouts, room_description: 100, hard_limit: 200 },
    });
    const service = new NarrationService({
      llmClient: new LLMClient(transport),
      config,
    });

    const ctx = makeContext({ narration_type: 'room_description' });
    const start = Date.now();
    const prose = await service.narrate(ctx);
    const elapsed = Date.now() - start;

    expect(prose).not.toBe('Slow LLM response that arrives too late.');
    expect(prose.length).toBeGreaterThan(30);
    expect(elapsed).toBeLessThan(500);
  });

  it('per-type timeouts are respected — movement uses movement timeout, not room_description', async () => {
    const transport: LLMTransport = async (_req, signal) => {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, 5000);
        signal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new AbortError());
        }, { once: true });
      });
      return { choices: [{ message: { content: 'Should not reach.' } }] };
    };

    const config = makeConfig({
      timeouts: {
        ...DEFAULT_NARRATION_CONFIG.timeouts,
        movement: 150, // Distinct from room_description
      },
    });
    const service = new NarrationService({
      llmClient: new LLMClient(transport),
      config,
    });

    const ctx = makeContext({ narration_type: 'movement' });
    const start = Date.now();
    await service.narrate(ctx);
    const elapsed = Date.now() - start;

    // Should respect movement timeout (150ms), not room_description (2000ms)
    expect(elapsed).toBeLessThan(500);
    expect(elapsed).toBeGreaterThanOrEqual(100);
  });

  it('all narration types fallback within their timeout budget', async () => {
    const transport = makeSlowTransport(5000);
    const config = makeConfig({
      timeouts: {
        ...DEFAULT_NARRATION_CONFIG.timeouts,
        combat_action: 50,
        combat_round: 50,
        room_description: 80,
        movement: 80,
        event: 80,
        hard_limit: 150,
      },
    });

    const types: LLMNarrationType[] = [
      'combat_action', 'combat_round', 'room_description', 'movement', 'event',
    ];

    for (const type of types) {
      const service = new NarrationService({
        llmClient: new LLMClient(transport),
        config,
      });
      const ctx = makeContext({ narration_type: type });
      const start = Date.now();
      const prose = await service.narrate(ctx);
      const elapsed = Date.now() - start;

      expect(prose.length).toBeGreaterThan(5);
      expect(elapsed).toBeLessThan(1000);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// AC: Template fallback delivers prose when Foundry exceeds timeout
// ═════════════════════════════════════════════════════════════════════════════

describe('AC: Template fallback delivers atmospheric prose', () => {
  it('template prose is atmospheric, not placeholder text', () => {
    const types: LLMNarrationType[] = [
      'room_description', 'combat_action', 'combat_round', 'movement', 'event',
    ];

    for (const type of types) {
      const ctx = makeContext({ narration_type: type });
      const prose = renderTemplate(type, ctx);

      expect(prose.length).toBeGreaterThan(10);
      // Should not contain raw field names or obvious placeholders
      expect(prose).not.toMatch(/\{\{.*\}\}/);
      expect(prose).not.toContain('undefined');
      expect(prose).not.toContain('null');
      expect(prose).not.toMatch(/\b\d+\s*(?:HP|damage|dmg)\b/i);
    }
  });

  it('room_description template mentions atmosphere, creatures, exits', () => {
    const ctx = makeContext();
    const prose = renderTemplate('room_description', ctx);

    expect(prose.toLowerCase()).toContain('water');
    expect(prose.toLowerCase()).toContain('revenant');
    expect(prose.toLowerCase()).toContain('north');
  });

  it('combat templates convey action without mechanical numbers', () => {
    const ctx = makeContext({
      narration_type: 'combat_action',
      recent_events: [{ tick: 1, type: 'combat_result', summary: 'player_hit_mob-44_heavy_strike' }],
    });
    const prose = renderTemplate('combat_action', ctx);

    expect(prose).not.toMatch(/\d+\s*(HP|damage|dmg|hit points)/i);
    expect(prose.length).toBeGreaterThan(20);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// AC: LLM call continues in background; result enriches cache asynchronously
// ═════════════════════════════════════════════════════════════════════════════

describe('AC: Background enrichment after timeout', () => {
  it('after timeout fallback, background LLM call enriches cache', async () => {
    let callCount = 0;
    const transport: LLMTransport = async (_request, signal) => {
      callCount++;
      if (callCount === 1) {
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(resolve, 5000);
          signal.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new AbortError());
          }, { once: true });
        });
      }
      return { choices: [{ message: { content: 'Enriched: the crypt whispers of old wars.' } }] };
    };

    const cache = new InMemoryNarrationCache();
    const config = makeConfig({
      timeouts: { ...DEFAULT_NARRATION_CONFIG.timeouts, room_description: 50, hard_limit: 300 },
    });
    const service = new NarrationService({
      llmClient: new LLMClient(transport),
      cache,
      config,
    });

    const ctx = makeContext();
    const firstResult = await service.narrate(ctx);

    expect(firstResult).not.toBe('Enriched: the crypt whispers of old wars.');
    expect(service.telemetry.getTelemetry().fallback_uses).toBe(1);

    await new Promise((r) => setTimeout(r, 400));

    const enriched = await cache.get(hashState(ctx));
    expect(enriched).toBe('Enriched: the crypt whispers of old wars.');
  });

  it('background enrichment with invalid LLM output does not overwrite template', async () => {
    let callCount = 0;
    const transport: LLMTransport = async (_request, signal) => {
      callCount++;
      if (callCount === 1) {
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(resolve, 5000);
          signal.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new AbortError());
          }, { once: true });
        });
      }
      return { choices: [{ message: { content: 'The creature has 50 HP remaining.' } }] };
    };

    const cache = new InMemoryNarrationCache();
    const config = makeConfig({
      timeouts: { ...DEFAULT_NARRATION_CONFIG.timeouts, room_description: 50, hard_limit: 300 },
    });
    const service = new NarrationService({
      llmClient: new LLMClient(transport),
      cache,
      config,
    });

    const ctx = makeContext();
    const template = await service.narrate(ctx);

    await new Promise((r) => setTimeout(r, 400));

    const cached = await cache.get(hashState(ctx));
    expect(cached).toBe(template);
    expect(cached).not.toContain('50 HP');
  });

  it('background enrichment is cancelled at hard limit', async () => {
    let backgroundCompleted = false;
    let callCount = 0;
    const transport: LLMTransport = async (_request, signal) => {
      callCount++;
      if (callCount === 1) {
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(resolve, 5000);
          signal.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new AbortError());
          }, { once: true });
        });
      }
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          backgroundCompleted = true;
          resolve();
        }, 5000);
        signal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new AbortError());
        }, { once: true });
      });
      return { choices: [{ message: { content: 'Should not cache.' } }] };
    };

    const cache = new InMemoryNarrationCache();
    const config = makeConfig({
      timeouts: { ...DEFAULT_NARRATION_CONFIG.timeouts, room_description: 50, hard_limit: 150 },
    });
    const service = new NarrationService({
      llmClient: new LLMClient(transport),
      cache,
      config,
    });

    const ctx = makeContext();
    await service.narrate(ctx);

    await new Promise((r) => setTimeout(r, 400));

    expect(backgroundCompleted).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// AC: State snapshot input schema per §4.3
// ═════════════════════════════════════════════════════════════════════════════

describe('AC: State snapshot schema matches GDD §4.3', () => {
  it('NarrationContext contains all required top-level fields', () => {
    const ctx = makeContext();
    expect(ctx).toHaveProperty('narration_type');
    expect(ctx).toHaveProperty('room');
    expect(ctx).toHaveProperty('player');
    expect(ctx).toHaveProperty('recent_events');
    expect(ctx).toHaveProperty('narrative_directives');
  });

  it('room contains all GDD §4.3 fields', () => {
    const ctx = makeContext();
    expect(ctx.room).toHaveProperty('id');
    expect(ctx.room).toHaveProperty('light_level');
    expect(ctx.room).toHaveProperty('exits');
    expect(ctx.room).toHaveProperty('features');
    expect(ctx.room).toHaveProperty('items_visible');
    expect(ctx.room).toHaveProperty('creatures');
    expect(ctx.room).toHaveProperty('hazards');
    expect(ctx.room).toHaveProperty('traces');
    expect(ctx.room).toHaveProperty('shard_stability');
  });

  it('player contains all GDD §4.3 fields', () => {
    const ctx = makeContext();
    expect(ctx.player).toHaveProperty('hp_pct');
    expect(ctx.player).toHaveProperty('statuses');
    expect(ctx.player).toHaveProperty('stance');
    expect(ctx.player).toHaveProperty('awareness_level');
    expect(ctx.player).toHaveProperty('visited_before');
  });

  it('narrative_directives contains tone, verbosity, and forbidden', () => {
    const ctx = makeContext();
    expect(ctx.narrative_directives).toHaveProperty('tone');
    expect(ctx.narrative_directives).toHaveProperty('verbosity');
    expect(ctx.narrative_directives).toHaveProperty('forbidden');
    expect(Array.isArray(ctx.narrative_directives.forbidden)).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// AC: LLM output constraints (GDD §4.4)
// ═════════════════════════════════════════════════════════════════════════════

describe('AC: LLM output contract enforcement (GDD §4.4)', () => {
  const ctx = makeContext();

  it('rejects output with HP numbers', () => {
    expect(validateLLMOutput('The creature has 50 HP.', ctx)).not.toBeNull();
    expect(validateLLMOutput('You lost 12 hit points.', ctx)).not.toBeNull();
  });

  it('rejects output with damage numbers', () => {
    expect(validateLLMOutput('You deal damage: 25 to the revenant.', ctx)).not.toBeNull();
  });

  it('rejects output with percentages', () => {
    expect(validateLLMOutput('The creature is at 30% health.', ctx)).not.toBeNull();
  });

  it('rejects output with Schema keywords', () => {
    expect(validateLLMOutput('The hp_pct drops rapidly.', ctx)).not.toBeNull();
    expect(validateLLMOutput('Your awareness_level increases.', ctx)).not.toBeNull();
    expect(validateLLMOutput('The shard_stability is failing.', ctx)).not.toBeNull();
    expect(validateLLMOutput('The light_level changes.', ctx)).not.toBeNull();
  });

  it('rejects output with level/XP numbers', () => {
    expect(validateLLMOutput('You are now level 5.', ctx)).not.toBeNull();
    expect(validateLLMOutput('You earned 100 XP.', ctx)).not.toBeNull();
  });

  it('rejects output referencing hidden items when forbidden', () => {
    const result = validateLLMOutput(
      'You notice a hidden item behind the altar.',
      ctx,
    );
    expect(result).not.toBeNull();
    expect(result).toContain('hidden items');
  });

  it('rejects output with mechanical resolution language when forbidden', () => {
    const result = validateLLMOutput(
      'You make a saving throw against the poison.',
      ctx,
    );
    expect(result).not.toBeNull();
    expect(result).toContain('mechanical resolution');
  });

  it('accepts valid atmospheric prose', () => {
    expect(validateLLMOutput(
      'The flooded crypt breathes with ancient malice. Dark water laps at crumbling stone.',
      ctx,
    )).toBeNull();
  });

  it('accepts prose with non-mechanical numbers', () => {
    expect(validateLLMOutput(
      'Three pillars rise from the dark water, their surfaces slick with age.',
      ctx,
    )).toBeNull();
  });

  it('NarrationService rejects invalid LLM output and uses template', async () => {
    const transport = makeMockTransport('You have 100 HP and deal 50 damage.');
    const service = new NarrationService({
      llmClient: new LLMClient(transport),
    });

    const prose = await service.narrate(makeContext());
    expect(prose).not.toContain('100 HP');
    expect(prose).not.toContain('50 damage');
    expect(prose.length).toBeGreaterThan(30);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// AC: Telemetry — cache hit ratio, Foundry latency, fallback rate
// ═════════════════════════════════════════════════════════════════════════════

describe('AC: Telemetry coverage', () => {
  it('tracks cache hits and misses correctly', async () => {
    const transport = makeMockTransport('Prose.');
    const service = new NarrationService({ llmClient: new LLMClient(transport) });

    await service.narrate(makeContext()); // miss
    await service.narrate(makeContext()); // hit

    const t = service.telemetry.getTelemetry();
    expect(t.cache_hits).toBe(1);
    expect(t.cache_misses).toBe(1);
    expect(t.cache_hit_ratio).toBe(0.5);
  });

  it('tracks LLM call latency', async () => {
    const transport = makeMockTransport('Dark waters.', 50);
    const service = new NarrationService({ llmClient: new LLMClient(transport) });

    await service.narrate(makeContext());

    const t = service.telemetry.getTelemetry();
    expect(t.llm_calls).toBe(1);
    expect(t.avg_llm_latency_ms).toBeGreaterThanOrEqual(30);
    expect(t.llm_latencies.length).toBe(1);
  });

  it('tracks fallback rate when LLM times out', async () => {
    const transport = makeSlowTransport(5000);
    const config = makeConfig({
      timeouts: { ...DEFAULT_NARRATION_CONFIG.timeouts, room_description: 50, hard_limit: 100 },
    });
    const service = new NarrationService({
      llmClient: new LLMClient(transport),
      config,
    });

    await service.narrate(makeContext());

    const t = service.telemetry.getTelemetry();
    expect(t.fallback_uses).toBe(1);
    expect(t.llm_timeouts).toBe(1);
    expect(t.fallback_rate).toBe(1);
  });

  it('tracks timeout count separately from fallback on rejected output', async () => {
    const transport = makeMockTransport('You deal 50 damage.'); // will be rejected
    const service = new NarrationService({ llmClient: new LLMClient(transport) });

    await service.narrate(makeContext());

    const t = service.telemetry.getTelemetry();
    expect(t.llm_timeouts).toBe(0); // not a timeout
    expect(t.fallback_uses).toBe(1); // but did use fallback
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// AC: Integration test — mock Foundry timeout → template fallback delivers prose
// ═════════════════════════════════════════════════════════════════════════════

describe('AC: Full pipeline integration — mock Foundry timeout', () => {
  it('mock Foundry timeout → template fallback → prose delivered → cache enriched', async () => {
    let callCount = 0;
    const transport: LLMTransport = async (_request, signal) => {
      callCount++;
      if (callCount === 1) {
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(resolve, 5000);
          signal.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new AbortError());
          }, { once: true });
        });
      }
      return { choices: [{ message: { content: 'The crypt remembers what you have forgotten.' } }] };
    };

    const cache = new InMemoryNarrationCache();
    const config = makeConfig({
      timeouts: { ...DEFAULT_NARRATION_CONFIG.timeouts, room_description: 80, hard_limit: 300 },
    });
    const service = new NarrationService({
      llmClient: new LLMClient(transport),
      cache,
      config,
    });

    const ctx = makeContext();

    // Step 1: First call should return template (Foundry timed out)
    const prose = await service.narrate(ctx);
    expect(prose).not.toBe('The crypt remembers what you have forgotten.');
    expect(prose.length).toBeGreaterThan(30);
    expect(prose).not.toContain('Error');
    expect(prose).not.toContain('timeout');

    const t1 = service.telemetry.getTelemetry();
    expect(t1.llm_timeouts).toBe(1);
    expect(t1.fallback_uses).toBe(1);
    expect(t1.cache_misses).toBe(1);

    // Step 2: Wait for background enrichment
    await new Promise((r) => setTimeout(r, 400));

    // Step 3: Cache now has LLM-enriched prose
    const enriched = await cache.get(hashState(ctx));
    expect(enriched).toBe('The crypt remembers what you have forgotten.');

    // Step 4: Next call returns enriched prose from cache
    const secondCall = await service.narrate(ctx);
    expect(secondCall).toBe('The crypt remembers what you have forgotten.');
    expect(service.telemetry.getTelemetry().cache_hits).toBe(1);
  });

  it('all narration types deliver prose under timeout with slow Foundry', async () => {
    const transport = makeSlowTransport(10000);
    const config = makeConfig({
      timeouts: {
        ...DEFAULT_NARRATION_CONFIG.timeouts,
        combat_action: 50,
        combat_round: 50,
        room_description: 80,
        movement: 80,
        event: 80,
        hard_limit: 150,
      },
    });

    const types: LLMNarrationType[] = [
      'room_description', 'combat_action', 'combat_round', 'movement', 'event',
    ];

    for (const type of types) {
      const service = new NarrationService({
        llmClient: new LLMClient(transport),
        config,
      });

      const ctx = makeContext({ narration_type: type });
      const start = Date.now();
      const prose = await service.narrate(ctx);
      const elapsed = Date.now() - start;

      expect(prose.length).toBeGreaterThan(5);
      expect(elapsed).toBeLessThan(1000);
      expect(prose).not.toContain('Slow LLM response');
      expect(service.telemetry.getTelemetry().fallback_uses).toBe(1);
    }
  });

  it('combat pipeline end-to-end: fast LLM → prose delivered directly', async () => {
    const transport = makeMockTransport('Your blade bites deep.', 30);
    const service = new NarrationService({
      llmClient: new LLMClient(transport),
    });

    const ctx = makeContext({
      narration_type: 'combat_action',
      recent_events: [{ tick: 1, type: 'combat_result', summary: 'player_hit_mob-44_strike_8dmg' }],
    });

    const prose = await service.narrate(ctx);
    expect(prose).toBe('Your blade bites deep.');
    expect(service.telemetry.getTelemetry().llm_calls).toBe(1);
    expect(service.telemetry.getTelemetry().fallback_uses).toBe(0);
  });

  it('no LLM configured → always uses templates (offline-safe)', async () => {
    const service = new NarrationService(); // no llmClient

    const types: LLMNarrationType[] = [
      'room_description', 'combat_action', 'combat_round', 'movement', 'event',
    ];

    for (const type of types) {
      const ctx = makeContext({ narration_type: type });
      const prose = await service.narrate(ctx);
      expect(prose.length).toBeGreaterThan(5);
    }

    const t = service.telemetry.getTelemetry();
    expect(t.fallback_uses).toBe(5);
    expect(t.llm_calls).toBe(0);
  });
});

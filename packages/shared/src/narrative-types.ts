/**
 * Narrative system types — shared between server and client.
 *
 * These types define the contract for the LLM narration pipeline (GDD §4).
 * The LLM describes; the server decides.
 */

// ─── Narration Types ─────────────────────────────────────────────────────────

/** The kind of narration being requested. */
export type LLMNarrationType =
  | 'room_description'
  | 'combat_action'
  | 'combat_round'
  | 'movement'
  | 'event'
  | 'sound_narration'
  | 'trace_narration'
  | 'awareness_narration';

// ─── State Snapshot (GDD §4.3 Input Schema) ─────────────────────────────────

/** A visible item in the room. */
export interface NarrationItem {
  id: string;
  type: string;
  name: string;
  quality: number;
}

/** A creature present in the room. */
export interface NarrationCreature {
  id: string;
  type: string;
  state: string;
  hp_pct: number;
  disposition: string;
}

/** An environmental trace. */
export interface NarrationTrace {
  type: string;
  age_seconds?: number;
  direction?: string;
  source?: string;
  description?: string;
  intensity?: number;
}

/** Room state as the LLM sees it. */
export interface NarrationRoom {
  id: string;
  biome: string;
  light_level: number;
  exits: string[];
  features: string[];
  items_visible: NarrationItem[];
  creatures: NarrationCreature[];
  hazards: string[];
  traces: NarrationTrace[];
  shard_stability: number;
}

/** Player state visible to the narration layer. */
export interface NarrationPlayer {
  hp_pct: number;
  statuses: string[];
  stance: string;
  awareness_level: number;
  visited_before: boolean;
}

/** A recent game event for narrative context. */
export interface NarrationEvent {
  tick: number;
  type: string;
  summary: string;
}

/** Narrative directives controlling LLM tone and constraints. */
export interface NarrativeDirectives {
  tone: string;
  verbosity: 'terse' | 'standard' | 'verbose';
  forbidden: string[];
}

/**
 * Full narration context — the structured input to the narration pipeline.
 * Maps directly to GDD §4.3 Input Schema.
 */
export interface NarrationContext {
  narration_type: LLMNarrationType;
  room: NarrationRoom;
  player: NarrationPlayer;
  recent_events: NarrationEvent[];
  narrative_directives: NarrativeDirectives;
}

// ─── Configuration ───────────────────────────────────────────────────────────

/** Timeout budgets per narration type (GDD §4.5). */
export interface NarrationTimeoutConfig {
  combat_action: number;
  combat_round: number;
  room_description: number;
  movement: number;
  event: number;
  sound_narration: number;
  trace_narration: number;
  awareness_narration: number;
  hard_limit: number;
}

/** LLM generation parameters per narration type. */
export interface NarrationModelConfig {
  max_tokens: number;
  temperature: number;
}

/** Full narration configuration. */
export interface NarrationConfig {
  timeouts: NarrationTimeoutConfig;
  model: Record<LLMNarrationType, NarrationModelConfig>;
  cache_ttl: {
    combat: number;
    exploration: number;
  };
}

/** Default narration configuration per GDD §4.5. */
export const DEFAULT_NARRATION_CONFIG: NarrationConfig = {
  timeouts: {
    combat_action: 800,
    combat_round: 800,
    room_description: 2000,
    movement: 2000,
    event: 2000,
    sound_narration: 500,
    trace_narration: 600,
    awareness_narration: 500,
    hard_limit: 3000,
  },
  model: {
    combat_action: { max_tokens: 80, temperature: 0.7 },
    combat_round: { max_tokens: 80, temperature: 0.7 },
    room_description: { max_tokens: 200, temperature: 0.8 },
    movement: { max_tokens: 150, temperature: 0.8 },
    event: { max_tokens: 120, temperature: 0.7 },
    sound_narration: { max_tokens: 40, temperature: 0.7 },
    trace_narration: { max_tokens: 60, temperature: 0.75 },
    awareness_narration: { max_tokens: 50, temperature: 0.7 },
  },
  cache_ttl: {
    combat: 30_000,
    exploration: 300_000,
  },
};

// ─── Telemetry ───────────────────────────────────────────────────────────────

/** Narration telemetry snapshot. */
export interface NarrationTelemetry {
  cache_hits: number;
  cache_misses: number;
  llm_calls: number;
  llm_timeouts: number;
  fallback_uses: number;
  llm_latencies: number[];
  avg_llm_latency_ms: number;
  cache_hit_ratio: number;
  fallback_rate: number;
}

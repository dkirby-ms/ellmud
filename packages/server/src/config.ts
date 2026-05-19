/**
 * Centralized server configuration — env vars with sensible defaults.
 *
 * Persistent zones default to 100 max players (shared world).
 * Procedural instances use GDD tier-based limits (3/4/6).
 * MAX_PLAYERS_PER_ZONE env var overrides everything (ops knob).
 */

import type { ZoneTier } from '@ellmud/shared';

export interface ServerConfig {
  /** Max concurrent players allowed in a single zone room. Env override via MAX_PLAYERS_PER_ZONE. */
  maxPlayersPerZone: number;

  /** Fake localhost WebSocket load generator configuration. */
  loadSimulator: {
    enabled: boolean;
    targetConnections: number;
  };

  /** Max Container Apps replicas. Phase 2 = 4 (KEDA auto-scaling). */
  maxReplicas: number;

  /** Matchmaker mode. 'in-process' = Colyseus default built-in matchmaker. */
  matchmakerMode: 'in-process';

  /** Redis configuration — shared connection for cache + presence. */
  redis: {
    /** Enable Redis-backed presence for multi-replica scaling. */
    enabled: boolean;
    /** Redis connection string. */
    connectionString: string;
    /** Enable Redis-backed narration cache (falls back to in-memory when false). */
    cacheEnabled: boolean;
    /** Enable Redis-backed matchmaker driver for multi-replica coordination. */
    driverEnabled: boolean;
  };

  /** Server listen port. */
  port: number;

  /** Whether auth is required to join rooms. */
  authRequired: boolean;

  /** WebSocket reconnection timeout in seconds (30-60s recommended). */
  reconnectionTimeoutS: number;

  /** Behavior when reconnection timeout expires: 'kill' or 'safe-room'. */
  reconnectDeathBehavior: 'kill' | 'safe-room';

  /** Enable /peaceful command for dev exploration (per-player creature aggro bypass). */
  devModeEnabled: boolean;

  /** Enable procedural zone generation (GDD §10 — future complement to hand-crafted zones). */
  enableProceduralGeneration: boolean;

  /** Corpse persistence duration in seconds. GDD §6.8. */
  corpseTTLSeconds: number;

  /** OpenAI-compatible LLM endpoint for narration (OpenAI, Azure OpenAI, LM Studio, Ollama, etc.). */
  openaiLLM?: {
    endpoint: string;
    apiKey: string;
    model: string;
  };

  /** Explicit toggle for LLM narration. When false, template-only mode is used even if LLM credentials are configured. */
  enableLLMNarration: boolean;

  /** Permadeath mode configuration — server-wide permanent death enforcement. */
  permadeath: {
    /** Enable permadeath mode (server-wide). When true, all characters are reset on death. */
    enabled: boolean;
  };
}

/**
 * GDD-defined player capacity per zone tier (GDD §10.1) — for procedural instances.
 *   Tier 1 (Shallow): 1–3 players
 *   Tier 2 (Deep):    2–4 players
 *   Tier 3 (Abyssal): 3–6 players
 */
export const TIER_MAX_PLAYERS: Record<number, number> = {
  1: 3,
  2: 4,
  3: 6,
};

/** Default max players for persistent shared zones (non-procedural). */
export const ZONE_DEFAULT_MAX_PLAYERS = 100;

/** Default number of fake WebSocket clients when load simulation is toggled on. */
export const LOAD_SIMULATOR_DEFAULT_TARGET_CONNECTIONS = 50;

/**
 * Get tier-specific max players for procedural instances.
 * Respects MAX_PLAYERS_PER_ZONE env override if set.
 */
export function getMaxPlayersForTier(tier: ZoneTier, config: ServerConfig): number {
  // If env override is set, use it for all tiers
  if (process.env.MAX_PLAYERS_PER_ZONE) {
    return config.maxPlayersPerZone;
  }
  
  // GDD tier-based defaults (procedural instances)
  return TIER_MAX_PLAYERS[tier] ?? 4;
}

/**
 * Get max players for a persistent zone room.
 * Priority: env override > per-zone DB value > ZONE_DEFAULT_MAX_PLAYERS (100).
 */
export function getMaxPlayersForZone(config: ServerConfig, dbMaxPlayers?: number): number {
  // Env override trumps everything (ops/testing knob)
  if (process.env.MAX_PLAYERS_PER_ZONE) {
    return config.maxPlayersPerZone;
  }
  // Per-zone DB override (some zones may cap lower, e.g. 20 for a small dungeon)
  if (dbMaxPlayers !== undefined && dbMaxPlayers > 0) {
    return dbMaxPlayers;
  }
  return ZONE_DEFAULT_MAX_PLAYERS;
}

function envInt(key: string, fallback: number): number {
  const val = process.env[key];
  if (val === undefined) return fallback;
  const parsed = parseInt(val, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function envBool(key: string, fallback: boolean): boolean {
  const val = process.env[key];
  if (val === undefined) return fallback;
  return val === 'true' || val === '1';
}

function envStr(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function envLoadSimulator(): ServerConfig['loadSimulator'] {
  const raw = process.env['SIMULATE_LOAD'];
  if (raw === undefined) {
    return {
      enabled: false,
      targetConnections: LOAD_SIMULATOR_DEFAULT_TARGET_CONNECTIONS,
    };
  }

  const normalized = raw.trim().toLowerCase();
  if (normalized === '' || normalized === 'false' || normalized === '0' || normalized === 'off' || normalized === 'no') {
    return {
      enabled: false,
      targetConnections: 0,
    };
  }

  if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on') {
    return {
      enabled: true,
      targetConnections: LOAD_SIMULATOR_DEFAULT_TARGET_CONNECTIONS,
    };
  }

  const numeric = Number.parseInt(normalized, 10);
  if (!Number.isNaN(numeric)) {
    const targetConnections = Math.max(0, numeric);
    return {
      enabled: targetConnections > 0,
      targetConnections,
    };
  }

  return {
    enabled: true,
    targetConnections: LOAD_SIMULATOR_DEFAULT_TARGET_CONNECTIONS,
  };
}

export function loadConfig(): ServerConfig {
  const openaiEndpoint = process.env.OPENAI_LLM_ENDPOINT;
  const openaiKey = process.env.OPENAI_LLM_KEY;

  return {
    maxPlayersPerZone: envInt('MAX_PLAYERS_PER_ZONE', 4),
    loadSimulator: envLoadSimulator(),
    matchmakerMode: 'in-process', // Only mode supported — Colyseus built-in
    redis: {
      enabled: envBool('REDIS_PRESENCE_ENABLED', false),
      connectionString: envStr(
        'REDIS_CONNECTION_STRING',
        envStr(
          'REDIS_CONNECTIONSTRING', // ACA service-bind injected name (no underscore)
          envStr(
            'REDIS_URL',
            process.env.REDIS_HOST
              ? `redis://${process.env.REDIS_PASSWORD ? `:${process.env.REDIS_PASSWORD}@` : ''}${process.env.REDIS_HOST}:${process.env.REDIS_PORT || '6379'}`
              : 'redis://localhost:6379'
          )
        )
      ),
      cacheEnabled: envBool('REDIS_CACHE_ENABLED', false),
      driverEnabled: envBool('REDIS_DRIVER_ENABLED', false),
    },
    port: envInt('PORT', 2567),
    authRequired: envBool('AUTH_REQUIRED', true),
    reconnectionTimeoutS: envInt('RECONNECTION_TIMEOUT_S', 30),
    reconnectDeathBehavior: (envStr('RECONNECT_DEATH_BEHAVIOR', 'kill') === 'safe-room' ? 'safe-room' : 'kill') as 'kill' | 'safe-room',
    devModeEnabled: envBool('DEV_MODE_ENABLED', false),
    enableProceduralGeneration: envBool('ENABLE_PROCEDURAL_GENERATION', false),
    corpseTTLSeconds: envInt('CORPSE_TTL_SECONDS', 43200), // 12 hours default (#409)
    openaiLLM: openaiEndpoint && openaiKey ? {
      endpoint: openaiEndpoint,
      apiKey: openaiKey,
      model: process.env.OPENAI_LLM_MODEL ?? 'gpt-4o',
    } : undefined,
    enableLLMNarration: envBool('ENABLE_LLM_NARRATION', true),
    permadeath: {
      enabled: envBool('PERMADEATH_ENABLED', false),
    },
  };
}

/** Singleton config instance. Reload-safe for tests via `resetConfig()`. */
let _config: ServerConfig | null = null;

export function getConfig(): ServerConfig {
  if (!_config) _config = loadConfig();
  return _config;
}

/** Reset cached config — for testing with different env vars. */
export function resetConfig(): void {
  _config = null;
}

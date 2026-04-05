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

  /** Azure AI Foundry configuration for LLM narration. */
  azureAI?: {
    endpoint: string;
    apiKey: string;
    deploymentName: string;
    apiVersion: string;
  };

  /** OpenAI-compatible LLM endpoint (OpenAI, LM Studio, Ollama, Mistral, etc.). */
  openaiLLM?: {
    endpoint: string;
    apiKey: string;
    model: string;
  };

  /** Explicit toggle for LLM narration. When false, template-only mode is used even if Azure credentials are configured. */
  enableLLMNarration: boolean;
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

export function loadConfig(): ServerConfig {
  const azureEndpoint = process.env.AZURE_AI_ENDPOINT;
  const azureKey = process.env.AZURE_AI_KEY;
  const azureDeployment = process.env.AZURE_AI_DEPLOYMENT ?? 'gpt-4o-mini';
  const azureApiVersion = process.env.AZURE_AI_API_VERSION ?? '2024-08-01-preview';

  const openaiEndpoint = process.env.OPENAI_LLM_ENDPOINT;
  const openaiKey = process.env.OPENAI_LLM_KEY;

  return {
    maxPlayersPerZone: envInt('MAX_PLAYERS_PER_ZONE', 4),
    maxReplicas: envInt('MAX_REPLICAS', 4),
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
    corpseTTLSeconds: envInt('CORPSE_TTL_SECONDS', 600), // 10 minutes default
    azureAI: azureEndpoint && azureKey ? {
      endpoint: azureEndpoint,
      apiKey: azureKey,
      deploymentName: azureDeployment,
      apiVersion: azureApiVersion,
    } : undefined,
    openaiLLM: openaiEndpoint && openaiKey ? {
      endpoint: openaiEndpoint,
      apiKey: openaiKey,
      model: process.env.OPENAI_LLM_MODEL ?? 'gpt-4o',
    } : undefined,
    enableLLMNarration: envBool('ENABLE_LLM_NARRATION', true),
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

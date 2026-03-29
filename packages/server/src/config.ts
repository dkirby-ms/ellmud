/**
 * Centralized server configuration — env vars with sensible defaults.
 *
 * Phase 1: Solo play only. One player per shard, one replica, in-process matchmaker.
 * Phase 2: Multi-player shards (2-6 players), Redis presence, KEDA auto-scaling.
 */

import type { ShardTier } from '@ellmud/shared';

export interface ServerConfig {
  /** Max concurrent players allowed in a single shard room. Phase 2 = 4 (default). */
  maxPlayersPerShard: number;

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
}

/**
 * GDD-defined player capacity per shard tier (GDD §10.1).
 *   Tier 1 (Shallow): 1–3 players
 *   Tier 2 (Deep):    2–4 players
 *   Tier 3 (Abyssal): 3–6 players
 */
export const TIER_MAX_PLAYERS: Record<number, number> = {
  1: 3,
  2: 4,
  3: 6,
};

/**
 * Get tier-specific max players. Uses GDD tier table by default.
 * Respects MAX_PLAYERS_PER_SHARD env override if set.
 */
export function getMaxPlayersForTier(tier: ShardTier, config: ServerConfig): number {
  // If env override is set, use it for all tiers
  if (process.env.MAX_PLAYERS_PER_SHARD) {
    return config.maxPlayersPerShard;
  }
  
  // GDD tier-based defaults
  return TIER_MAX_PLAYERS[tier] ?? 4;
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
  return {
    maxPlayersPerShard: envInt('MAX_PLAYERS_PER_SHARD', 4),
    maxReplicas: envInt('MAX_REPLICAS', 4),
    matchmakerMode: 'in-process', // Only mode supported — Colyseus built-in
    redis: {
      enabled: envBool('REDIS_PRESENCE_ENABLED', false),
      connectionString: envStr(
        'REDIS_CONNECTION_STRING',
        envStr(
          'REDIS_URL',
          process.env.REDIS_HOST
            ? `redis://${process.env.REDIS_PASSWORD ? `:${process.env.REDIS_PASSWORD}@` : ''}${process.env.REDIS_HOST}:${process.env.REDIS_PORT || '6379'}`
            : 'redis://localhost:6379'
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

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
}

/**
 * Get tier-specific max players. Tier 1/2 = 4 players, Tier 3 = 6 players.
 * Respects MAX_PLAYERS_PER_SHARD env override if set.
 */
export function getMaxPlayersForTier(tier: ShardTier, config: ServerConfig): number {
  // If env override is set, use it for all tiers
  if (process.env.MAX_PLAYERS_PER_SHARD) {
    return config.maxPlayersPerShard;
  }
  
  // Tier-based defaults
  return tier === 3 ? 6 : 4;
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
      connectionString: envStr('REDIS_CONNECTION_STRING', envStr('REDIS_URL', 'redis://localhost:6379')),
      cacheEnabled: envBool('REDIS_CACHE_ENABLED', false),
      driverEnabled: envBool('REDIS_DRIVER_ENABLED', false),
    },
    port: envInt('PORT', 2567),
    authRequired: envBool('AUTH_REQUIRED', false),
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

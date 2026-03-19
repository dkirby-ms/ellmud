/**
 * Centralized server configuration — env vars with sensible defaults.
 *
 * Phase 1: Solo play only. One player per shard, one replica, in-process matchmaker.
 * Phase 2: Flip MAX_PLAYERS_PER_SHARD, enable Redis presence, scale replicas.
 */

export interface ServerConfig {
  /** Max concurrent players allowed in a single shard room. Phase 1 = 1 (solo). */
  maxPlayersPerShard: number;

  /** Max Container Apps replicas. Phase 1 = 1 (no scale-out). */
  maxReplicas: number;

  /** Matchmaker mode. 'in-process' = Colyseus default built-in matchmaker. */
  matchmakerMode: 'in-process';

  /** Redis presence configuration (wired but unused in Phase 1). */
  redis: {
    /** Enable Redis-backed presence for multi-replica scaling. */
    enabled: boolean;
    /** Redis connection string (used when enabled = true). */
    connectionString: string;
  };

  /** Server listen port. */
  port: number;

  /** Whether auth is required to join rooms. */
  authRequired: boolean;
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
    maxPlayersPerShard: envInt('MAX_PLAYERS_PER_SHARD', 1),
    maxReplicas: envInt('MAX_REPLICAS', 1),
    matchmakerMode: 'in-process', // Only mode supported — Colyseus built-in
    redis: {
      enabled: envBool('REDIS_PRESENCE_ENABLED', false),
      connectionString: envStr('REDIS_CONNECTION_STRING', 'redis://localhost:6379'),
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

/**
 * Shard-Sickness Debuff System — stat penalties for dying in the shard.
 *
 * When a player dies and returns to Refuge, they receive shard-sickness.
 * Repeated deaths intensify the debuff with diminishing returns.
 *
 * Formula: stat_multiplier = 1 - (MAX_PENALTY * (1 - e^(-STACK_RATE * deathCount)))
 *   - 1 death:  ~9.1% reduction
 *   - 2 deaths: ~16.5% reduction
 *   - 3 deaths: ~22.6% reduction
 *   - 5 deaths: ~31.6% reduction
 *   - asymptote: 50% max reduction
 *
 * Shard-sickness persists across shard runs. The persistence layer is abstracted
 * behind ShardSicknessStore — callers provide the death count, this module does math.
 *
 * Pure game logic — no Colyseus or DB dependency.
 */

// ─── Constants ───────────────────────────────────────────────────────────────

/** Maximum stat reduction (50% at infinite deaths). */
export const MAX_PENALTY = 0.5;

/**
 * Rate at which penalties stack. Higher = faster approach to MAX_PENALTY.
 * At 0.2: 1 death ≈ 9.1%, 3 deaths ≈ 22.6%, 5 deaths ≈ 31.6%.
 */
export const STACK_RATE = 0.2;

/** Duration of shard-sickness in seconds (30 minutes). */
export const SHARD_SICKNESS_DURATION_S = 1800;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ShardSicknessDebuff {
  /** Number of consecutive/recent deaths contributing to sickness. */
  deathCount: number;
  /** Multiplier applied to all combat stats (0.5–1.0). 1.0 = no penalty. */
  statMultiplier: number;
  /** Penalty as a percentage (0–50). */
  penaltyPercent: number;
  /** Whether the player is currently afflicted. */
  active: boolean;
}

export interface CombatStatModifiers {
  maxHp: number;
  attack: number;
  defence: number;
  armour: number;
}

/**
 * Persistence interface for shard-sickness data.
 * Implementations can be in-memory (testing), PostgreSQL (production), etc.
 */
export interface ShardSicknessStore {
  /** Get the current death count for a player. */
  getDeathCount(playerId: string): Promise<number>;
  /** Increment and return the new death count. */
  incrementDeathCount(playerId: string): Promise<number>;
  /** Reset death count (e.g., after enough time passes or manual recovery). */
  resetDeathCount(playerId: string): Promise<void>;
  /** Get the timestamp of the last death, or null. */
  getLastDeathTime(playerId: string): Promise<number | null>;
  /** Set the last death timestamp. */
  setLastDeathTime(playerId: string, timestamp: number): Promise<void>;
}

// ─── Calculations (pure functions) ───────────────────────────────────────────

/**
 * Calculate the stat multiplier for a given death count.
 * Returns a value between (1 - MAX_PENALTY) and 1.0.
 *   0 deaths → 1.0 (no penalty)
 *   ∞ deaths → 0.5 (maximum penalty)
 */
export function calculateStatMultiplier(deathCount: number): number {
  if (deathCount <= 0) return 1.0;
  const penalty = MAX_PENALTY * (1 - Math.exp(-STACK_RATE * deathCount));
  return 1.0 - penalty;
}

/**
 * Get the full debuff information for a given death count.
 */
export function getShardSicknessDebuff(deathCount: number): ShardSicknessDebuff {
  const multiplier = calculateStatMultiplier(deathCount);
  return {
    deathCount,
    statMultiplier: multiplier,
    penaltyPercent: Math.round((1 - multiplier) * 100),
    active: deathCount > 0,
  };
}

/**
 * Apply shard-sickness to combat stats.
 * Floors each stat to at least 1 (never fully zeroes a stat).
 */
export function applyShardSickness(
  stats: CombatStatModifiers,
  deathCount: number,
): CombatStatModifiers {
  const multiplier = calculateStatMultiplier(deathCount);
  return {
    maxHp: Math.max(1, Math.floor(stats.maxHp * multiplier)),
    attack: Math.max(1, Math.floor(stats.attack * multiplier)),
    defence: Math.max(1, Math.floor(stats.defence * multiplier)),
    armour: Math.max(1, Math.floor(stats.armour * multiplier)),
  };
}

/**
 * Check if shard-sickness has expired based on last death timestamp.
 * Returns true if the sickness should still be active.
 */
export function isShardSicknessActive(lastDeathTime: number | null, now: number = Date.now()): boolean {
  if (lastDeathTime === null) return false;
  return (now - lastDeathTime) < SHARD_SICKNESS_DURATION_S * 1000;
}

// ─── In-Memory Store (for testing / Phase 1) ────────────────────────────────

export class InMemoryShardSicknessStore implements ShardSicknessStore {
  private deaths = new Map<string, number>();
  private lastDeathTimes = new Map<string, number>();

  async getDeathCount(playerId: string): Promise<number> {
    return this.deaths.get(playerId) ?? 0;
  }

  async incrementDeathCount(playerId: string): Promise<number> {
    const current = (this.deaths.get(playerId) ?? 0) + 1;
    this.deaths.set(playerId, current);
    return current;
  }

  async resetDeathCount(playerId: string): Promise<void> {
    this.deaths.delete(playerId);
  }

  async getLastDeathTime(playerId: string): Promise<number | null> {
    return this.lastDeathTimes.get(playerId) ?? null;
  }

  async setLastDeathTime(playerId: string, timestamp: number): Promise<void> {
    this.lastDeathTimes.set(playerId, timestamp);
  }
}

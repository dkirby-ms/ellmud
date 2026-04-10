/**
 * MetricsService — records gameplay events to PostgreSQL.
 *
 * All writes are fire-and-forget: callers use recordX() without awaiting,
 * so metrics never block the game tick. Errors are logged, never thrown.
 */

import { query } from '../db/index.js';

// ─── Event Types ────────────────────────────────────────────────────────────

export type MetricEventType =
  | 'death'
  | 'kill'
  | 'loot_pickup'
  | 'combat_stats';

export interface DeathMetadata {
  roomId: string;
  killerIds?: string[];
  isPvP: boolean;
  itemsLost: number;
}

export interface KillMetadata {
  victimId: string;
  victimName: string;
  roomId: string;
  isCreature: boolean;
  /** Damage the killer dealt to the victim this encounter. */
  damageDealt?: number;
}

export interface LootPickupMetadata {
  itemId: string;
  itemName: string;
  roomId: string;
  source: 'room' | 'corpse';
}

export interface CombatStatsMetadata {
  encounterId?: string;
  roomId: string;
  damageDealt: number;
  damageTaken: number;
  hits: number;
  misses: number;
}

// ─── Service ────────────────────────────────────────────────────────────────

export class MetricsService {
  /**
   * Insert a metric event. Fire-and-forget — never throws.
   * Returns the promise for testing, but callers should not await.
   */
  private record(playerId: string, eventType: MetricEventType, metadata: Record<string, unknown>): Promise<void> {
    return query(
      `INSERT INTO game_metrics (player_id, event_type, metadata) VALUES ($1, $2, $3)`,
      [playerId, eventType, JSON.stringify(metadata)],
    ).then(() => undefined).catch((err) => {
      console.error(`[metrics] Failed to record ${eventType} for ${playerId}:`, err);
    });
  }

  /** Record a player death. */
  recordDeath(playerId: string, meta: DeathMetadata): void {
    void this.record(playerId, 'death', meta as unknown as Record<string, unknown>);
  }

  /** Record a kill attributed to a player. */
  recordKill(playerId: string, meta: KillMetadata): void {
    void this.record(playerId, 'kill', meta as unknown as Record<string, unknown>);
  }

  /** Record a loot/item pickup. */
  recordLootPickup(playerId: string, meta: LootPickupMetadata): void {
    void this.record(playerId, 'loot_pickup', meta as unknown as Record<string, unknown>);
  }

  /** Record aggregate combat stats for an encounter tick batch. */
  recordCombatStats(playerId: string, meta: CombatStatsMetadata): void {
    void this.record(playerId, 'combat_stats', meta as unknown as Record<string, unknown>);
  }
}

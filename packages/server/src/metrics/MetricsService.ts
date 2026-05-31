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
  | 'combat_stats'
  | 'room_join'
  | 'room_leave'
  | 'chat_message'
  | 'room_snapshot';

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

export interface RoomMetricMetadata {
  roomId: string;
  roomName: string;
  zoneSlug?: string;
}

export interface RoomJoinMetadata extends RoomMetricMetadata {
  playerCount: number;
}

export type RoomLeaveReason = 'disconnect' | 'transfer' | 'kicked';

export interface RoomLeaveMetadata extends RoomMetricMetadata {
  playerCount: number;
  reason: RoomLeaveReason;
}

export type ChatChannelType = 'say' | 'emote' | 'whisper' | 'group';

export interface ChatMessageMetadata extends RoomMetricMetadata {
  channelType?: ChatChannelType;
}

export interface RoomSnapshotMetadata extends RoomMetricMetadata {
  playerCount: number;
  uptimeSeconds: number;
}

// ─── Service ────────────────────────────────────────────────────────────────

export class MetricsService {
  /**
   * Insert a metric event. Fire-and-forget — never throws.
   * Returns the promise for testing, but callers should not await.
   */
  private record(playerId: string | null, eventType: MetricEventType, metadata: Record<string, unknown>): Promise<void> {
    return query(
      `INSERT INTO game_metrics (player_id, event_type, metadata) VALUES ($1, $2, $3)`,
      [playerId, eventType, JSON.stringify(metadata)],
    ).then(() => undefined).catch((err) => {
      const scope = playerId ?? 'room-scope';
      console.error(`[metrics] Failed to record ${eventType} for ${scope}:`, err);
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

  /** Record a player joining a room instance. */
  recordRoomJoin(playerId: string, meta: RoomJoinMetadata): void {
    void this.record(playerId, 'room_join', meta as unknown as Record<string, unknown>);
  }

  /** Record a player leaving a room instance. */
  recordRoomLeave(playerId: string, meta: RoomLeaveMetadata): void {
    void this.record(playerId, 'room_leave', meta as unknown as Record<string, unknown>);
  }

  /** Record a chat message sent within a room instance. */
  recordChatMessage(playerId: string, meta: ChatMessageMetadata): void {
    void this.record(playerId, 'chat_message', meta as unknown as Record<string, unknown>);
  }

  /** Record a periodic room snapshot for operational dashboards. */
  recordRoomSnapshot(meta: RoomSnapshotMetadata): void {
    void this.record(null, 'room_snapshot', meta as unknown as Record<string, unknown>);
  }
}

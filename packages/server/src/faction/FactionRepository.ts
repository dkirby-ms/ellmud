/**
 * FactionRepository — Persistent faction membership data.
 *
 * Saves/loads faction standing for each player.
 * Follows the Interface + InMemory + Pg pattern used by PlayerProfileRepository.
 *
 * The Pg implementation reads/writes the `faction_membership` table (migration 004).
 */

import type { FactionMembership } from '../db/types.js';

// ─── Interface ──────────────────────────────────────────────────────────────

export interface FactionRepository {
  /** Load the player's faction membership. Returns null if unaffiliated. */
  getPlayerFactions(playerId: string): Promise<FactionMembership[]>;

  /** Set or update a player's faction standing (reputation/rank). */
  updateFaction(
    playerId: string,
    factionId: string,
    standing: { reputation: number; rank: number },
  ): Promise<void>;
}

// ─── In-Memory Implementation ───────────────────────────────────────────────

export class InMemoryFactionRepository implements FactionRepository {
  private memberships = new Map<string, FactionMembership>();

  async getPlayerFactions(playerId: string): Promise<FactionMembership[]> {
    const m = this.memberships.get(playerId);
    if (!m) return [];
    return [structuredClone(m)];
  }

  async updateFaction(
    playerId: string,
    factionId: string,
    standing: { reputation: number; rank: number },
  ): Promise<void> {
    const existing = this.memberships.get(playerId);
    if (existing) {
      existing.faction_id = factionId;
      existing.reputation = standing.reputation;
      existing.rank = standing.rank;
      existing.updated_at = new Date();
    } else {
      this.memberships.set(playerId, {
        id: crypto.randomUUID(),
        player_id: playerId,
        faction_id: factionId,
        reputation: standing.reputation,
        rank: standing.rank,
        joined_at: new Date(),
        updated_at: new Date(),
      });
    }
  }
}

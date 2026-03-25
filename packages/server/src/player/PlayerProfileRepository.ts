/**
 * PlayerProfileRepository — Persistent player progression data.
 *
 * Saves/loads player skills, stats, and equipment across sessions.
 * Follows the Interface + InMemory + Pg pattern used by StashRepository.
 *
 * The Pg implementation reads/writes the `player_skills` table (migration 003).
 */

import type { VisibleEquipment } from '@ellmud/shared';
import type { PlayerSkills } from '../state/PlayerState.js';

// ─── Types ──────────────────────────────────────────────────────────────────

/** Persisted player profile — the data that survives across shard sessions. */
export interface PlayerProfile {
  skills: PlayerSkills;
  maxCarryWeight: number;
  equipment?: VisibleEquipment;
}

/** Default profile for new players (matches PlayerState defaults). */
export const DEFAULT_PROFILE: PlayerProfile = {
  skills: { stealth: 5, awareness: 5 },
  maxCarryWeight: 20,
};

// ─── Interface ──────────────────────────────────────────────────────────────

export interface PlayerProfileRepository {
  /** Load saved profile. Returns null for new players. */
  load(playerId: string): Promise<PlayerProfile | null>;

  /** Upsert player profile (skills, stats, equipment). */
  save(playerId: string, profile: PlayerProfile): Promise<void>;
}

// ─── In-Memory Implementation ───────────────────────────────────────────────

export class InMemoryPlayerProfileRepository implements PlayerProfileRepository {
  private profiles = new Map<string, PlayerProfile>();

  async load(playerId: string): Promise<PlayerProfile | null> {
    const profile = this.profiles.get(playerId);
    if (!profile) return null;
    // Return a deep copy to prevent external mutation
    return structuredClone(profile);
  }

  async save(playerId: string, profile: PlayerProfile): Promise<void> {
    this.profiles.set(playerId, structuredClone(profile));
  }
}

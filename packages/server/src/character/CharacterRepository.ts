/**
 * CharacterRepository — Interface for character persistence.
 */

import type { CharacterSummary } from '@ellmud/shared';

/** Player combat stats persisted in the characters table (Phase 1). */
export interface PlayerCombatStats {
  maxHp: number;
  unarmed: number;
  oneHanded: number;
  twoHanded: number;
  ranged: number;
  shieldBlock: number;
  dodge: number;
  armour: number;
}

export const DEFAULT_PLAYER_COMBAT_STATS: PlayerCombatStats = {
  maxHp: 100,
  unarmed: 5,
  oneHanded: 5,
  twoHanded: 5,
  ranged: 5,
  shieldBlock: 5,
  dodge: 5,
  armour: 2,
};

/** Raw character row from the database. */
export interface CharacterRow {
  id: string;
  playerId: string;
  name: string;
  startingZoneSlug: string;
  factionSlug: string | null;
  isActive: boolean;
  createdAt: Date;
  lastPlayedAt: Date | null;
  deletedAt: Date | null;
  combatStats: PlayerCombatStats;
}

export interface CharacterRepository {
  /** List all non-deleted characters for a player. */
  list(playerId: string): Promise<CharacterSummary[]>;

  /** Create a new character. Returns the new character row. */
  create(playerId: string, name: string, startingZoneSlug: string): Promise<CharacterRow>;

  /** Get a character by ID (returns null if not found or soft-deleted). */
  getById(id: string): Promise<CharacterRow | null>;

  /** Set a character as the active character for its account. Deactivates others. */
  setActive(playerId: string, characterId: string): Promise<void>;

  /** Soft-delete a character. */
  softDelete(characterId: string): Promise<void>;

  /** Get the currently active character for a player. */
  getActive(playerId: string): Promise<CharacterRow | null>;

  /** Persist the last inn location for respawn. */
  saveLastInn(characterId: string, zoneSlug: string, roomSlug: string): Promise<void>;

  /** Get the last inn location for a character. */
  getLastInn(characterId: string): Promise<{ zoneSlug: string; roomSlug: string } | null>;

  /** Persist the character's current posture (#371). */
  savePosture(characterId: string, posture: string): Promise<void>;

  /** Load the character's persisted posture (#371). Returns 'standing' if unset. */
  loadPosture(characterId: string): Promise<string>;

  /** Check whether the starter kit has been granted to this character. */
  isStarterKitGranted(characterId: string): Promise<boolean>;

  /** Mark the starter kit as granted for this character. */
  markStarterKitGranted(characterId: string): Promise<void>;

  /** Reset the starter kit flag (permadeath use case). */
  resetStarterKitFlag(characterId: string): Promise<void>;

  /** Get the persisted combat stats for a character (Phase 1). */
  getBaseStats(characterId: string): Promise<PlayerCombatStats>;

  /** Persist updated combat stats for a character (Phase 1). */
  saveBaseStats(characterId: string, stats: PlayerCombatStats): Promise<void>;

  /** Get the number of banked stat points available for training (#457). */
  getStatPointsAvailable(characterId: string): Promise<number>;

  /** Set the number of banked stat points (#457). */
  saveStatPointsAvailable(characterId: string, points: number): Promise<void>;
}

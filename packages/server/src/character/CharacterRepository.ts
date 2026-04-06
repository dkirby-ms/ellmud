/**
 * CharacterRepository — Interface for character persistence.
 */

import type { CharacterSummary } from '@ellmud/shared';

/** Raw character row from the database. */
export interface CharacterRow {
  id: string;
  playerId: string;
  name: string;
  factionSlug: string;
  isActive: boolean;
  createdAt: Date;
  lastPlayedAt: Date | null;
  deletedAt: Date | null;
}

export interface CharacterRepository {
  /** List all non-deleted characters for a player. */
  list(playerId: string): Promise<CharacterSummary[]>;

  /** Create a new character. Returns the new character row. */
  create(playerId: string, name: string, factionSlug: string): Promise<CharacterRow>;

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
}

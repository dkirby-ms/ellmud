/**
 * InMemoryCharacterRepository — In-memory implementation for tests and no-DB mode.
 */

import type { CharacterSummary } from '@ellmud/shared';
import type { CharacterRepository, CharacterRow } from './CharacterRepository.js';
import crypto from 'crypto';

export class InMemoryCharacterRepository implements CharacterRepository {
  private characters = new Map<string, CharacterRow>();

  async list(playerId: string): Promise<CharacterSummary[]> {
    const chars: CharacterSummary[] = [];
    for (const row of this.characters.values()) {
      if (row.playerId === playerId && row.deletedAt === null) {
        chars.push(this.toSummary(row));
      }
    }
    return chars;
  }

  async create(playerId: string, name: string, factionSlug: string): Promise<CharacterRow> {
    // Check uniqueness among non-deleted characters
    for (const row of this.characters.values()) {
      if (
        row.playerId === playerId &&
        row.name.toLowerCase() === name.toLowerCase() &&
        row.deletedAt === null
      ) {
        throw new Error(`Character name "${name}" already in use`);
      }
    }

    const row: CharacterRow = {
      id: crypto.randomUUID(),
      playerId,
      name,
      factionSlug,
      isActive: false,
      createdAt: new Date(),
      lastPlayedAt: null,
      deletedAt: null,
    };
    this.characters.set(row.id, row);
    return structuredClone(row);
  }

  async getById(id: string): Promise<CharacterRow | null> {
    const row = this.characters.get(id);
    if (!row || row.deletedAt !== null) return null;
    return structuredClone(row);
  }

  async setActive(playerId: string, characterId: string): Promise<void> {
    // Deactivate all characters for the player
    for (const row of this.characters.values()) {
      if (row.playerId === playerId && row.deletedAt === null) {
        row.isActive = false;
      }
    }
    // Activate the target
    const target = this.characters.get(characterId);
    if (!target || target.playerId !== playerId || target.deletedAt !== null) {
      throw new Error('Character not found');
    }
    target.isActive = true;
  }

  async softDelete(characterId: string): Promise<void> {
    const row = this.characters.get(characterId);
    if (!row || row.deletedAt !== null) {
      throw new Error('Character not found');
    }
    row.deletedAt = new Date();
    row.isActive = false;
  }

  async getActive(playerId: string): Promise<CharacterRow | null> {
    for (const row of this.characters.values()) {
      if (row.playerId === playerId && row.isActive && row.deletedAt === null) {
        return structuredClone(row);
      }
    }
    return null;
  }

  private toSummary(row: CharacterRow): CharacterSummary {
    const factionNames: Record<string, string> = {
      ironwright: 'Ironwright Compact',
      veil: 'Veil Cartographers',
      scarlet: 'Scarlet Ledger',
    };
    return {
      id: row.id,
      name: row.name,
      factionSlug: row.factionSlug,
      factionName: factionNames[row.factionSlug] ?? row.factionSlug,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      lastPlayedAt: row.lastPlayedAt?.toISOString() ?? null,
      topSkills: [],
      totalRuns: 0,
    };
  }
}

/**
 * InMemoryCharacterRepository — In-memory implementation for tests and no-DB mode.
 */

import type { CharacterSummary } from '@ellmud/shared';
import type { CharacterRepository, CharacterRow } from './CharacterRepository.js';
import crypto from 'crypto';

export class InMemoryCharacterRepository implements CharacterRepository {
  private characters = new Map<string, CharacterRow>();
  private lastInns = new Map<string, { zoneSlug: string; roomSlug: string }>();

  async list(playerId: string): Promise<CharacterSummary[]> {
    const chars: CharacterSummary[] = [];
    for (const row of this.characters.values()) {
      if (row.playerId === playerId && row.deletedAt === null) {
        chars.push(this.toSummary(row));
      }
    }
    return chars;
  }

  async create(playerId: string, name: string, startingZoneSlug: string): Promise<CharacterRow> {
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
      startingZoneSlug,
      factionSlug: null,
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

  async saveLastInn(characterId: string, zoneSlug: string, roomSlug: string): Promise<void> {
    this.lastInns.set(characterId, { zoneSlug, roomSlug });
  }

  async getLastInn(characterId: string): Promise<{ zoneSlug: string; roomSlug: string } | null> {
    return this.lastInns.get(characterId) ?? null;
  }

  private toSummary(row: CharacterRow): CharacterSummary {
    const factionNames: Record<string, string> = {
      kindari: 'The Kindari',
      'bloom-tenders': 'The Bloom Tenders',
      'krewe-calliope': 'Krewe Calliope',
    };
    const zoneDisplayNames: Record<string, string> = {
      'the-reliquary': 'The Reliquary',
      'the-bloom-observatory': 'The Bloom Observatory',
      'the-carrion-court': 'The Carrion Court',
    };
    return {
      id: row.id,
      name: row.name,
      startingZoneSlug: row.startingZoneSlug,
      startingZoneName: zoneDisplayNames[row.startingZoneSlug] ?? row.startingZoneSlug,
      factionSlug: row.factionSlug,
      factionName: row.factionSlug ? (factionNames[row.factionSlug] ?? row.factionSlug) : null,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      lastPlayedAt: row.lastPlayedAt?.toISOString() ?? null,
      topSkills: [],
      totalRuns: 0,
    };
  }
}

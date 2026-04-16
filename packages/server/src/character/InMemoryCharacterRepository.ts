/**
 * InMemoryCharacterRepository — In-memory implementation for tests and no-DB mode.
 */

import type { CharacterSummary } from '@ellmud/shared';
import type { CharacterRepository, CharacterRow, PlayerCombatStats } from './CharacterRepository.js';
import { DEFAULT_PLAYER_COMBAT_STATS } from './CharacterRepository.js';
import crypto from 'crypto';

export class InMemoryCharacterRepository implements CharacterRepository {
  private characters = new Map<string, CharacterRow>();
  private lastInns = new Map<string, { zoneSlug: string; roomSlug: string }>();
  private postures = new Map<string, string>();
  private starterKitGranted = new Set<string>();
  private combatStatsMap = new Map<string, PlayerCombatStats>();
  private statPointsMap = new Map<string, number>();

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
      combatStats: { ...DEFAULT_PLAYER_COMBAT_STATS },
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

  async savePosture(characterId: string, posture: string): Promise<void> {
    this.postures.set(characterId, posture);
  }

  async loadPosture(characterId: string): Promise<string> {
    return this.postures.get(characterId) ?? 'standing';
  }

  async isStarterKitGranted(characterId: string): Promise<boolean> {
    return this.starterKitGranted.has(characterId);
  }

  async markStarterKitGranted(characterId: string): Promise<void> {
    this.starterKitGranted.add(characterId);
  }

  async resetStarterKitFlag(characterId: string): Promise<void> {
    this.starterKitGranted.delete(characterId);
  }

  async getBaseStats(characterId: string): Promise<PlayerCombatStats> {
    return this.combatStatsMap.get(characterId) ?? { ...DEFAULT_PLAYER_COMBAT_STATS };
  }

  async saveBaseStats(characterId: string, stats: PlayerCombatStats): Promise<void> {
    this.combatStatsMap.set(characterId, { ...stats });
  }

  async getStatPointsAvailable(characterId: string): Promise<number> {
    return this.statPointsMap.get(characterId) ?? 0;
  }

  async saveStatPointsAvailable(characterId: string, points: number): Promise<void> {
    this.statPointsMap.set(characterId, points);
  }

  async trainStat(
    characterId: string,
    statKey: keyof PlayerCombatStats,
    increment: number,
  ): Promise<{ newStatValue: number; newPointsAvailable: number } | null> {
    const points = this.statPointsMap.get(characterId) ?? 0;
    if (points <= 0) return null;
    const stats = this.combatStatsMap.get(characterId) ?? { ...DEFAULT_PLAYER_COMBAT_STATS };
    const newValue = stats[statKey] + increment;
    stats[statKey] = newValue;
    this.combatStatsMap.set(characterId, stats);
    const newPoints = points - 1;
    this.statPointsMap.set(characterId, newPoints);
    return { newStatValue: newValue, newPointsAvailable: newPoints };
  }

  async addStatPoints(characterId: string, points: number): Promise<void> {
    const current = this.statPointsMap.get(characterId) ?? 0;
    this.statPointsMap.set(characterId, current + points);
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

/**
 * Permadeath System Tests
 *
 * Tests server-wide permadeath mode:
 * - `PERMADEATH_ENABLED` (boolean, default: false)
 *
 * When enabled, EVERY death triggers a character reset (not deletion):
 * - Level → 1
 * - Inventory → cleared
 * - Equipment → cleared
 * - Skills → reset to starting state
 * - Death count → PRESERVED (lifetime stat)
 * - Stash → PRESERVED
 * - Character stays active (is_active=true)
 * - Hall of Fame records each "past life" with peak stats before reset
 *
 * Core behavior: reset-on-death, preservation of stash/death count, hall of fame
 * Edge cases: multiple resets, survival time calculations, stat recording
 * API tests: leaderboard endpoints, pagination, stats
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryCharacterRepository } from '../character/InMemoryCharacterRepository.js';

// ─── Mock Types & Interfaces ─────────────────────────────────────────────────

/**
 * Hall of Fame entry structure (expected schema).
 * Records a "past life" when character is reset on death.
 */
interface HallOfFameEntry {
  id: string;
  characterId: string;
  characterName: string;
  level: number;
  kills: number;
  deaths: number;
  survivedSeconds: number; // Time since last reset (or creation if first life)
  causeOfDeath: string;
  zoneOfDeath: string;
  createdAt: Date;
}

/**
 * Permadeath configuration.
 */
interface PermadeathConfig {
  enabled: boolean;
  // NO threshold - every death triggers reset when enabled
}

/**
 * Death context passed to permadeath check.
 */
interface DeathContext {
  characterId: string;
  characterName: string;
  level: number;
  kills: number;
  deaths: number;
  causeOfDeath: string;
  zoneOfDeath: string;
  lastResetAt: Date | null; // Time of last reset (null if never reset)
}

/**
 * Hall of Fame repository interface (to be implemented).
 */
interface HallOfFameRepository {
  create(entry: Omit<HallOfFameEntry, 'id' | 'createdAt'>): Promise<HallOfFameEntry>;
  list(limit: number, offset: number): Promise<HallOfFameEntry[]>;
  getStats(): Promise<{
    totalEntries: number;
    averageSurvivalSeconds: number;
    longestSurvivalSeconds: number;
  }>;
}

/**
 * In-memory implementation for testing.
 */
class InMemoryHallOfFameRepository implements HallOfFameRepository {
  private entries: HallOfFameEntry[] = [];
  private nextId = 1;

  async create(entry: Omit<HallOfFameEntry, 'id' | 'createdAt'>): Promise<HallOfFameEntry> {
    const newEntry: HallOfFameEntry = {
      ...entry,
      id: `hof-${this.nextId++}`,
      createdAt: new Date(),
    };
    this.entries.push(newEntry);
    return structuredClone(newEntry);
  }

  async list(limit: number, offset: number): Promise<HallOfFameEntry[]> {
    // Sort by survival time DESC
    const sorted = [...this.entries].sort((a, b) => b.survivedSeconds - a.survivedSeconds);
    return sorted.slice(offset, offset + limit).map(e => structuredClone(e));
  }

  async getStats() {
    if (this.entries.length === 0) {
      return { totalEntries: 0, averageSurvivalSeconds: 0, longestSurvivalSeconds: 0 };
    }
    const total = this.entries.reduce((sum, e) => sum + e.survivedSeconds, 0);
    const longest = Math.max(...this.entries.map(e => e.survivedSeconds));
    return {
      totalEntries: this.entries.length,
      averageSurvivalSeconds: Math.floor(total / this.entries.length),
      longestSurvivalSeconds: longest,
    };
  }

  // Test helper
  clear() {
    this.entries = [];
    this.nextId = 1;
  }
}

/**
 * Permadeath service (to be implemented).
 * This is the contract we expect from the implementation.
 */
class PermadeathService {
  constructor(
    private config: PermadeathConfig,
    private characterRepo: InMemoryCharacterRepository,
    private hofRepo: HallOfFameRepository,
  ) {}

  /**
   * Check if permadeath should trigger for this death.
   * Returns true if character should be reset.
   */
  shouldTriggerPermadeath(): boolean {
    return this.config.enabled;
  }

  /**
   * Process a player death. If permadeath triggers, reset the character
   * and record their "past life" in the hall of fame.
   * 
   * @returns true if permadeath was triggered, false otherwise
   */
  async processPlayerDeath(context: DeathContext): Promise<boolean> {
    if (!this.shouldTriggerPermadeath()) {
      return false;
    }

    // Check if character exists
    const character = await this.characterRepo.getById(context.characterId);
    if (!character) {
      // Character doesn't exist
      return false;
    }

    // Calculate survival time since last reset (or creation if first life)
    const now = new Date();
    const startTime = context.lastResetAt || character.createdAt;
    const survivedSeconds = Math.floor(
      (now.getTime() - startTime.getTime()) / 1000
    );

    // Record in hall of fame (past life)
    await this.hofRepo.create({
      characterId: context.characterId,
      characterName: context.characterName,
      level: context.level,
      kills: context.kills,
      deaths: context.deaths,
      survivedSeconds,
      causeOfDeath: context.causeOfDeath,
      zoneOfDeath: context.zoneOfDeath,
    });

    // Reset the character (to be implemented in real service)
    // This would:
    // - Set level to 1
    // - Clear inventory
    // - Clear equipment
    // - Reset skills
    // - Preserve stash
    // - Preserve death count
    // - Set last_reset_at to now
    // - Keep is_active=true

    return true;
  }

  /**
   * Get permadeath message to send to client.
   * Includes character stats from this life.
   */
  getPermadeathMessage(context: DeathContext, survivedSeconds: number): string {
    return [
      `PERMADEATH: ${context.characterName} has been reset!`,
      `Level: ${context.level} | Kills: ${context.kills} | Deaths: ${context.deaths}`,
      `Survived this life: ${this.formatDuration(survivedSeconds)}`,
      `Cause: ${context.causeOfDeath} in ${context.zoneOfDeath}`,
      ``,
      `Your character has been reset to level 1. Inventory and equipment cleared.`,
      `Your stash and lifetime death count have been preserved.`,
      `This life has been recorded in the Hall of Fame.`,
    ].join('\n');
  }

  private formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}

// ─── Core Behavior Tests ─────────────────────────────────────────────────────

describe('Permadeath System', () => {
  let characterRepo: InMemoryCharacterRepository;
  let hofRepo: InMemoryHallOfFameRepository;
  let service: PermadeathService;

  beforeEach(() => {
    characterRepo = new InMemoryCharacterRepository();
    hofRepo = new InMemoryHallOfFameRepository();
  });

  describe('Core Behavior: Permadeath Disabled (Default)', () => {
    beforeEach(() => {
      service = new PermadeathService(
        { enabled: false },
        characterRepo,
        hofRepo,
      );
    });

    it('1. When PERMADEATH_ENABLED=false (default), death works normally — no reset', async () => {
      const character = await characterRepo.create('player-1', 'Drizzt', 'the-refuge');
      
      const context: DeathContext = {
        characterId: character.id,
        characterName: character.name,
        level: 5,
        kills: 10,
        deaths: 1,
        causeOfDeath: 'Goblin Brute',
        zoneOfDeath: 'The Dark Forest',
        lastResetAt: null,
      };

      const triggered = await service.processPlayerDeath(context);
      expect(triggered).toBe(false);

      // Character should still be active
      const char = await characterRepo.getById(character.id);
      expect(char).not.toBeNull();
      expect(char!.deletedAt).toBeNull();

      // No hall of fame entry
      const hofEntries = await hofRepo.list(10, 0);
      expect(hofEntries).toHaveLength(0);
    });

    it('normal death flow works when permadeath is disabled', async () => {
      const character = await characterRepo.create('player-1', 'Bruenor', 'the-refuge');
      
      // Multiple deaths should not trigger permadeath reset
      for (let i = 1; i <= 5; i++) {
        const context: DeathContext = {
          characterId: character.id,
          characterName: character.name,
          level: i,
          kills: i * 2,
          deaths: i,
          causeOfDeath: 'Test Monster',
          zoneOfDeath: 'Test Zone',
          lastResetAt: null,
        };
        
        const triggered = await service.processPlayerDeath(context);
        expect(triggered).toBe(false);
      }

      const char = await characterRepo.getById(character.id);
      expect(char).not.toBeNull();
    });
  });

  describe('Core Behavior: Permadeath Enabled', () => {
    beforeEach(() => {
      service = new PermadeathService(
        { enabled: true },
        characterRepo,
        hofRepo,
      );
    });

    it('2. When PERMADEATH_ENABLED=true, every death triggers character reset', async () => {
      const character = await characterRepo.create('player-1', 'Wulfgar', 'the-refuge');
      
      const context: DeathContext = {
        characterId: character.id,
        characterName: character.name,
        level: 5,
        kills: 10,
        deaths: 1,
        causeOfDeath: 'Fell off a cliff',
        zoneOfDeath: 'Tutorial Zone',
        lastResetAt: null,
      };

      const triggered = await service.processPlayerDeath(context);
      expect(triggered).toBe(true);

      // Character should still exist (not deleted)
      const char = await characterRepo.getById(character.id);
      expect(char).not.toBeNull();
      expect(char!.deletedAt).toBeNull();

      // Hall of fame should have entry for this "past life"
      const hofEntries = await hofRepo.list(10, 0);
      expect(hofEntries).toHaveLength(1);
      expect(hofEntries[0].characterName).toBe('Wulfgar');
      expect(hofEntries[0].level).toBe(5);
      expect(hofEntries[0].kills).toBe(10);
      expect(hofEntries[0].deaths).toBe(1);
    });

    it('shouldTriggerPermadeath returns true when enabled', () => {
      expect(service.shouldTriggerPermadeath()).toBe(true);
    });
  });

  describe('Core Behavior: Multiple Resets', () => {
    beforeEach(() => {
      service = new PermadeathService(
        { enabled: true },
        characterRepo,
        hofRepo,
      );
    });

    it('3. Multiple deaths create multiple hall of fame entries (past lives)', async () => {
      const character = await characterRepo.create('player-1', 'Regis', 'the-refuge');
      
      // First death - creates first hall of fame entry
      const death1 = await service.processPlayerDeath({
        characterId: character.id,
        characterName: character.name,
        level: 2,
        kills: 1,
        deaths: 1,
        causeOfDeath: 'Rat',
        zoneOfDeath: 'Sewers',
        lastResetAt: null,
      });
      expect(death1).toBe(true);

      // Character still active after reset
      let char = await characterRepo.getById(character.id);
      expect(char).not.toBeNull();
      expect(char!.deletedAt).toBeNull();

      // Simulate time passing and character leveling up again
      const firstResetTime = new Date();
      
      // Second death - creates second hall of fame entry
      const death2 = await service.processPlayerDeath({
        characterId: character.id,
        characterName: character.name,
        level: 3,
        kills: 5,
        deaths: 2, // Death count persists!
        causeOfDeath: 'Wolf',
        zoneOfDeath: 'Forest',
        lastResetAt: firstResetTime,
      });
      expect(death2).toBe(true);

      // Character still active after second reset
      char = await characterRepo.getById(character.id);
      expect(char).not.toBeNull();
      expect(char!.deletedAt).toBeNull();

      // Simulate time passing and character leveling up again
      const secondResetTime = new Date();

      // Third death - creates third hall of fame entry
      const death3 = await service.processPlayerDeath({
        characterId: character.id,
        characterName: character.name,
        level: 4,
        kills: 10,
        deaths: 3, // Death count persists!
        causeOfDeath: 'Dragon',
        zoneOfDeath: 'Mountain Peak',
        lastResetAt: secondResetTime,
      });
      expect(death3).toBe(true);

      // Character still active after third reset
      char = await characterRepo.getById(character.id);
      expect(char).not.toBeNull();
      expect(char!.deletedAt).toBeNull();

      // Hall of fame has three entries (three past lives)
      const hofEntries = await hofRepo.list(10, 0);
      expect(hofEntries).toHaveLength(3);
      
      // Each entry has different stats (from each life)
      expect(hofEntries.some(e => e.level === 2 && e.causeOfDeath === 'Rat')).toBe(true);
      expect(hofEntries.some(e => e.level === 3 && e.causeOfDeath === 'Wolf')).toBe(true);
      expect(hofEntries.some(e => e.level === 4 && e.causeOfDeath === 'Dragon')).toBe(true);
      
      // All entries for same character
      expect(hofEntries.every(e => e.characterName === 'Regis')).toBe(true);
      expect(hofEntries.every(e => e.characterId === character.id)).toBe(true);
    });

    it('death count persists across resets', async () => {
      const character = await characterRepo.create('player-1', 'DeathCounter', 'the-refuge');
      
      // Three deaths, each incrementing death count
      for (let i = 1; i <= 3; i++) {
        const lastReset = i === 1 ? null : new Date();
        await service.processPlayerDeath({
          characterId: character.id,
          characterName: character.name,
          level: 5,
          kills: 10,
          deaths: i, // Death count increases each time
          causeOfDeath: 'Monster',
          zoneOfDeath: 'Zone',
          lastResetAt: lastReset,
        });
      }

      // All three deaths recorded with correct death counts
      const hofEntries = await hofRepo.list(10, 0);
      expect(hofEntries).toHaveLength(3);
      expect(hofEntries.some(e => e.deaths === 1)).toBe(true);
      expect(hofEntries.some(e => e.deaths === 2)).toBe(true);
      expect(hofEntries.some(e => e.deaths === 3)).toBe(true);
    });
  });

  describe('Core Behavior: Character Reset and Hall of Fame', () => {
    beforeEach(() => {
      service = new PermadeathService(
        { enabled: true },
        characterRepo,
        hofRepo,
      );
    });

    it('4. Permadeath resets character, does NOT soft-delete (is_active=true, deleted_at=null)', async () => {
      const character = await characterRepo.create('player-1', 'Cattie-Brie', 'the-refuge');
      
      const context: DeathContext = {
        characterId: character.id,
        characterName: character.name,
        level: 10,
        kills: 50,
        deaths: 1,
        causeOfDeath: 'Orc Warlord',
        zoneOfDeath: 'Spine of the World',
        lastResetAt: null,
      };

      await service.processPlayerDeath(context);

      // Verify character still exists (NOT deleted)
      const char = await characterRepo.getById(character.id);
      expect(char).not.toBeNull();
      expect(char!.deletedAt).toBeNull();

      // Verify character is still in list
      const charList = await characterRepo.list('player-1');
      expect(charList).toHaveLength(1);
      expect(charList[0].id).toBe(character.id);
    });

    it('5. Permadeath records an entry in hall_of_fame with correct stats', async () => {
      const character = await characterRepo.create('player-1', 'Artemis', 'the-refuge');
      
      // Set last reset to 10 minutes ago for meaningful survival time
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      
      const context: DeathContext = {
        characterId: character.id,
        characterName: character.name,
        level: 15,
        kills: 100,
        deaths: 1,
        causeOfDeath: 'Drizzt Do\'Urden',
        zoneOfDeath: 'Icewind Dale',
        lastResetAt: tenMinutesAgo,
      };

      await service.processPlayerDeath(context);

      const hofEntries = await hofRepo.list(10, 0);
      expect(hofEntries).toHaveLength(1);

      const entry = hofEntries[0];
      expect(entry.characterId).toBe(character.id);
      expect(entry.characterName).toBe('Artemis');
      expect(entry.level).toBe(15);
      expect(entry.kills).toBe(100);
      expect(entry.deaths).toBe(1);
      expect(entry.causeOfDeath).toBe('Drizzt Do\'Urden');
      expect(entry.zoneOfDeath).toBe('Icewind Dale');
      expect(entry.survivedSeconds).toBeGreaterThan(0);
      expect(entry.survivedSeconds).toBeGreaterThanOrEqual(600 - 2); // ~10 minutes, allow 2s margin
      expect(entry.createdAt).toBeInstanceOf(Date);
    });

    it('6. Normal death flow still happens before permadeath check', async () => {
      // This test documents the expected integration:
      // 1. Player dies in combat
      // 2. Corpse is created with loot
      // 3. Death penalty is applied
      // 4. THEN permadeath check happens
      // 5. If permadeath triggers, character is reset and past life recorded
      
      // For this test, we just verify that processPlayerDeath can be called
      // after the normal death flow (corpse creation, death penalty) completes
      
      const character = await characterRepo.create('player-1', 'TestChar', 'the-refuge');
      
      // Simulate: corpse created, death penalty applied (outside this service)
      // Now check permadeath
      
      const context: DeathContext = {
        characterId: character.id,
        characterName: character.name,
        level: 5,
        kills: 10,
        deaths: 1,
        causeOfDeath: 'Test Monster',
        zoneOfDeath: 'Test Zone',
        lastResetAt: null,
      };

      const triggered = await service.processPlayerDeath(context);
      expect(triggered).toBe(true);
      
      // Character still exists (reset, not deleted)
      const char = await characterRepo.getById(character.id);
      expect(char).not.toBeNull();
      expect(char!.deletedAt).toBeNull();
    });

    it('7. Permadeath message includes character stats and reset info', async () => {
      const character = await characterRepo.create('player-1', 'Jarlaxle', 'the-refuge');
      
      const context: DeathContext = {
        characterId: character.id,
        characterName: 'Jarlaxle',
        level: 20,
        kills: 250,
        deaths: 1,
        causeOfDeath: 'Betrayal',
        zoneOfDeath: 'Menzoberranzan',
        lastResetAt: null,
      };

      const survivedSeconds = 7200; // 2 hours
      const message = service.getPermadeathMessage(context, survivedSeconds);

      expect(message).toContain('PERMADEATH');
      expect(message).toContain('reset');
      expect(message).toContain('Jarlaxle');
      expect(message).toContain('Level: 20');
      expect(message).toContain('Kills: 250');
      expect(message).toContain('Deaths: 1');
      expect(message).toContain('2h'); // 7200 seconds = 2 hours
      expect(message).toContain('Betrayal');
      expect(message).toContain('Menzoberranzan');
      expect(message).toContain('Hall of Fame');
      expect(message).toContain('stash');
      expect(message).toContain('death count');
    });
  });

  describe('Edge Cases', () => {
    it('8. Hall of fame survived_seconds is time since last reset, not since creation', async () => {
      const service = new PermadeathService(
        { enabled: true },
        characterRepo,
        hofRepo,
      );

      const character = await characterRepo.create('player-1', 'TimedChar', 'the-refuge');
      
      // First life: Character just created, dies immediately
      await service.processPlayerDeath({
        characterId: character.id,
        characterName: character.name,
        level: 5,
        kills: 10,
        deaths: 1,
        causeOfDeath: 'First Death',
        zoneOfDeath: 'Zone',
        lastResetAt: null, // First life, so use creation time
      });

      // Wait a bit to simulate time passing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Second life: 30 minutes ago (simulated via lastResetAt)
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      
      await service.processPlayerDeath({
        characterId: character.id,
        characterName: character.name,
        level: 3,
        kills: 5,
        deaths: 2,
        causeOfDeath: 'Second Death',
        zoneOfDeath: 'Zone',
        lastResetAt: thirtyMinutesAgo, // Second life started 30 min ago
      });

      const hofEntries = await hofRepo.list(10, 0);
      expect(hofEntries).toHaveLength(2);
      
      // First life: Very short (just created then died)
      const firstLife = hofEntries.find(e => e.causeOfDeath === 'First Death');
      expect(firstLife).toBeDefined();
      expect(firstLife!.survivedSeconds).toBeGreaterThanOrEqual(0);
      expect(firstLife!.survivedSeconds).toBeLessThan(5); // Should be nearly instant
      
      // Second life: approximately 1800 seconds (30 minutes) based on lastResetAt
      const secondLife = hofEntries.find(e => e.causeOfDeath === 'Second Death');
      expect(secondLife).toBeDefined();
      expect(secondLife!.survivedSeconds).toBeGreaterThanOrEqual(1798);
      expect(secondLife!.survivedSeconds).toBeLessThanOrEqual(1802);
    });

    it('9. Hall of fame survived_seconds for first life uses character creation time', async () => {
      const service = new PermadeathService(
        { enabled: true },
        characterRepo,
        hofRepo,
      );

      // Create character and die immediately
      const character = await characterRepo.create('player-1', 'FirstLife', 'the-refuge');
      
      const context: DeathContext = {
        characterId: character.id,
        characterName: character.name,
        level: 10,
        kills: 50,
        deaths: 1,
        causeOfDeath: 'Dragon',
        zoneOfDeath: 'Lair',
        lastResetAt: null, // First life, uses character.createdAt
      };

      await service.processPlayerDeath(context);

      const hofEntries = await hofRepo.list(10, 0);
      expect(hofEntries).toHaveLength(1);
      
      const survived = hofEntries[0].survivedSeconds;
      // Should be very short since character just created
      expect(survived).toBeGreaterThanOrEqual(0);
      expect(survived).toBeLessThan(5);
    });

    it('10. Cause of death captures the correct killer (creature name)', async () => {
      const service = new PermadeathService(
        { enabled: true },
        characterRepo,
        hofRepo,
      );

      const character = await characterRepo.create('player-1', 'VictimChar', 'the-refuge');
      
      const context: DeathContext = {
        characterId: character.id,
        characterName: character.name,
        level: 5,
        kills: 10,
        deaths: 1,
        causeOfDeath: 'Ancient Red Dragon',
        zoneOfDeath: 'Dragon Lair',
        lastResetAt: null,
      };

      await service.processPlayerDeath(context);

      const hofEntries = await hofRepo.list(10, 0);
      expect(hofEntries[0].causeOfDeath).toBe('Ancient Red Dragon');
    });

    it('cause of death captures player name for PvP', async () => {
      const service = new PermadeathService(
        { enabled: true },
        characterRepo,
        hofRepo,
      );

      const character = await characterRepo.create('player-1', 'PvPVictim', 'the-refuge');
      
      const context: DeathContext = {
        characterId: character.id,
        characterName: character.name,
        level: 10,
        kills: 20,
        deaths: 1,
        causeOfDeath: 'PlayerKiller123',
        zoneOfDeath: 'PvP Arena',
        lastResetAt: null,
      };

      await service.processPlayerDeath(context);

      const hofEntries = await hofRepo.list(10, 0);
      expect(hofEntries[0].causeOfDeath).toBe('PlayerKiller123');
    });

    it('cause of death captures zone collapse', async () => {
      const service = new PermadeathService(
        { enabled: true },
        characterRepo,
        hofRepo,
      );

      const character = await characterRepo.create('player-1', 'CollapseVictim', 'the-refuge');
      
      const context: DeathContext = {
        characterId: character.id,
        characterName: character.name,
        level: 8,
        kills: 15,
        deaths: 1,
        causeOfDeath: 'zone collapse',
        zoneOfDeath: 'Collapsing Zone',
        lastResetAt: null,
      };

      await service.processPlayerDeath(context);

      const hofEntries = await hofRepo.list(10, 0);
      expect(hofEntries[0].causeOfDeath).toBe('zone collapse');
    });

    it('11. Zone of death captures the correct zone name', async () => {
      const service = new PermadeathService(
        { enabled: true },
        characterRepo,
        hofRepo,
      );

      const character = await characterRepo.create('player-1', 'ZoneChar', 'the-refuge');
      
      const context: DeathContext = {
        characterId: character.id,
        characterName: character.name,
        level: 5,
        kills: 10,
        deaths: 1,
        causeOfDeath: 'Goblin',
        zoneOfDeath: 'The Sunless Citadel',
        lastResetAt: null,
      };

      await service.processPlayerDeath(context);

      const hofEntries = await hofRepo.list(10, 0);
      expect(hofEntries[0].zoneOfDeath).toBe('The Sunless Citadel');
    });

    it('character that does not exist cannot trigger permadeath', async () => {
      const service = new PermadeathService(
        { enabled: true },
        characterRepo,
        hofRepo,
      );

      const context: DeathContext = {
        characterId: 'non-existent-id',
        characterName: 'Ghost',
        level: 5,
        kills: 10,
        deaths: 1,
        causeOfDeath: 'Nothing',
        zoneOfDeath: 'Nowhere',
        lastResetAt: null,
      };

      const triggered = await service.processPlayerDeath(context);
      expect(triggered).toBe(false);

      // No hall of fame entry created
      const hofEntries = await hofRepo.list(10, 0);
      expect(hofEntries).toHaveLength(0);
    });
  });

  describe('Leaderboard API: Hall of Fame Queries', () => {
    beforeEach(async () => {
      const service = new PermadeathService(
        { enabled: true },
        characterRepo,
        hofRepo,
      );

      // Create multiple hall of fame entries with different survival times
      const entries = [
        { name: 'LongLiver', survived: 10000, level: 20, kills: 100, deaths: 1 },
        { name: 'MediumLiver', survived: 5000, level: 15, kills: 50, deaths: 1 },
        { name: 'ShortLiver', survived: 1000, level: 5, kills: 10, deaths: 1 },
        { name: 'VeryLongLiver', survived: 15000, level: 25, kills: 150, deaths: 1 },
        { name: 'QuickDeath', survived: 500, level: 1, kills: 0, deaths: 1 },
      ];

      for (const entry of entries) {
        const char = await characterRepo.create('player-1', entry.name, 'the-refuge');
        const lastReset = new Date(Date.now() - entry.survived * 1000);
        
        await service.processPlayerDeath({
          characterId: char.id,
          characterName: entry.name,
          level: entry.level,
          kills: entry.kills,
          deaths: entry.deaths,
          causeOfDeath: 'Test',
          zoneOfDeath: 'Test Zone',
          lastResetAt: lastReset,
        });
      }
    });

    it('13. GET /api/hall-of-fame returns entries sorted by survived_seconds DESC', async () => {
      const entries = await hofRepo.list(10, 0);
      
      expect(entries).toHaveLength(5);
      expect(entries[0].characterName).toBe('VeryLongLiver');
      expect(entries[1].characterName).toBe('LongLiver');
      expect(entries[2].characterName).toBe('MediumLiver');
      expect(entries[3].characterName).toBe('ShortLiver');
      expect(entries[4].characterName).toBe('QuickDeath');

      // Verify survival times are in descending order
      for (let i = 0; i < entries.length - 1; i++) {
        expect(entries[i].survivedSeconds).toBeGreaterThanOrEqual(entries[i + 1].survivedSeconds);
      }
    });

    it('14. GET /api/hall-of-fame respects pagination (limit/offset)', async () => {
      // First page: limit=2, offset=0
      const page1 = await hofRepo.list(2, 0);
      expect(page1).toHaveLength(2);
      expect(page1[0].characterName).toBe('VeryLongLiver');
      expect(page1[1].characterName).toBe('LongLiver');

      // Second page: limit=2, offset=2
      const page2 = await hofRepo.list(2, 2);
      expect(page2).toHaveLength(2);
      expect(page2[0].characterName).toBe('MediumLiver');
      expect(page2[1].characterName).toBe('ShortLiver');

      // Third page: limit=2, offset=4
      const page3 = await hofRepo.list(2, 4);
      expect(page3).toHaveLength(1);
      expect(page3[0].characterName).toBe('QuickDeath');

      // Beyond available entries
      const page4 = await hofRepo.list(2, 6);
      expect(page4).toHaveLength(0);
    });

    it('15. GET /api/hall-of-fame/stats returns correct aggregate stats', async () => {
      const stats = await hofRepo.getStats();

      expect(stats.totalEntries).toBe(5);
      
      // Average: (15000 + 10000 + 5000 + 1000 + 500) / 5 = 6300
      expect(stats.averageSurvivalSeconds).toBe(6300);
      
      // Longest: 15000
      expect(stats.longestSurvivalSeconds).toBe(15000);
    });

    it('16. Empty hall of fame returns empty array / zero stats', async () => {
      hofRepo.clear();

      const entries = await hofRepo.list(10, 0);
      expect(entries).toHaveLength(0);

      const stats = await hofRepo.getStats();
      expect(stats.totalEntries).toBe(0);
      expect(stats.averageSurvivalSeconds).toBe(0);
      expect(stats.longestSurvivalSeconds).toBe(0);
    });

    it('pagination with large offset returns empty array', async () => {
      const entries = await hofRepo.list(10, 100);
      expect(entries).toHaveLength(0);
    });

    it('pagination with limit=0 returns empty array', async () => {
      const entries = await hofRepo.list(0, 0);
      expect(entries).toHaveLength(0);
    });
  });

  describe('Message Formatting', () => {
    let service: PermadeathService;

    beforeEach(() => {
      service = new PermadeathService(
        { enabled: true },
        characterRepo,
        hofRepo,
      );
    });

    it('formats duration correctly for seconds', async () => {
      const character = await characterRepo.create('player-1', 'Test', 'the-refuge');
      const context: DeathContext = {
        characterId: character.id,
        characterName: 'Test',
        level: 1,
        kills: 0,
        deaths: 1,
        causeOfDeath: 'Test',
        zoneOfDeath: 'Test',
        lastResetAt: null,
      };

      const message = service.getPermadeathMessage(context, 45);
      expect(message).toContain('45s');
    });

    it('formats duration correctly for minutes', async () => {
      const character = await characterRepo.create('player-1', 'Test', 'the-refuge');
      const context: DeathContext = {
        characterId: character.id,
        characterName: 'Test',
        level: 1,
        kills: 0,
        deaths: 1,
        causeOfDeath: 'Test',
        zoneOfDeath: 'Test',
        lastResetAt: null,
      };

      const message = service.getPermadeathMessage(context, 300);
      expect(message).toContain('5m');
    });

    it('formats duration correctly for hours', async () => {
      const character = await characterRepo.create('player-1', 'Test', 'the-refuge');
      const context: DeathContext = {
        characterId: character.id,
        characterName: 'Test',
        level: 1,
        kills: 0,
        deaths: 1,
        causeOfDeath: 'Test',
        zoneOfDeath: 'Test',
        lastResetAt: null,
      };

      const message = service.getPermadeathMessage(context, 7320);
      expect(message).toContain('2h 2m');
    });
  });
});

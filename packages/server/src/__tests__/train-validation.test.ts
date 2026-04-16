/**
 * Train validation unit tests — pure function tests for the train command (#457).
 *
 * Tests the exported validation/formatting logic independently of ZoneRoom async wiring.
 */

import { describe, it, expect } from 'vitest';
import {
  resolveStatName,
  validateTrain,
  formatTrainOverview,
  buildTrainSuccessResult,
  buildTrainOverviewResult,
  buildTrainErrorResult,
  TRAINABLE_STATS,
  STAT_DISPLAY_NAMES,
  DEFAULT_SOFT_CAPS,
} from '../commands/handlers/train.js';
import { DEFAULT_PLAYER_COMBAT_STATS, type PlayerCombatStats } from '../character/CharacterRepository.js';

describe('train command — pure validation (#457)', () => {
  // ─── resolveStatName ──────────────────────────────────────────────────

  describe('resolveStatName', () => {
    it('resolves canonical stat names', () => {
      expect(resolveStatName('dodge')).toBe('dodge');
      expect(resolveStatName('armour')).toBe('armour');
      expect(resolveStatName('unarmed')).toBe('unarmed');
      expect(resolveStatName('ranged')).toBe('ranged');
    });

    it('resolves aliases', () => {
      expect(resolveStatName('armor')).toBe('armour');
      expect(resolveStatName('hp')).toBe('maxHp');
      expect(resolveStatName('maxhp')).toBe('maxHp');
      expect(resolveStatName('shield')).toBe('shieldBlock');
      expect(resolveStatName('one-handed')).toBe('oneHanded');
      expect(resolveStatName('two-handed')).toBe('twoHanded');
      expect(resolveStatName('onehanded')).toBe('oneHanded');
      expect(resolveStatName('twohanded')).toBe('twoHanded');
      expect(resolveStatName('shield-block')).toBe('shieldBlock');
      expect(resolveStatName('shieldblock')).toBe('shieldBlock');
    });

    it('is case-insensitive', () => {
      expect(resolveStatName('Dodge')).toBe('dodge');
      expect(resolveStatName('ARMOUR')).toBe('armour');
      expect(resolveStatName('MaxHP')).toBe('maxHp');
    });

    it('returns undefined for invalid stat names', () => {
      expect(resolveStatName('charisma')).toBeUndefined();
      expect(resolveStatName('strength')).toBeUndefined();
      expect(resolveStatName('')).toBeUndefined();
    });
  });

  // ─── validateTrain ────────────────────────────────────────────────────

  describe('validateTrain', () => {
    const baseStats = { ...DEFAULT_PLAYER_COMBAT_STATS };

    it('succeeds when player has points and stat is below cap', () => {
      const result = validateTrain('dodge', baseStats, 3);
      expect(result.valid).toBe(true);
      expect(result.statKey).toBe('dodge');
    });

    it('fails when no stat points available', () => {
      const result = validateTrain('dodge', baseStats, 0);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('no stat points');
    });

    it('fails with unknown stat name', () => {
      const result = validateTrain('charisma', baseStats, 3);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unknown stat');
      expect(result.error).toContain('charisma');
    });

    it('fails when stat is at soft cap', () => {
      const capped: PlayerCombatStats = { ...baseStats, dodge: DEFAULT_SOFT_CAPS.dodge };
      const result = validateTrain('dodge', capped, 5);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('soft cap');
    });

    it('succeeds when stat is one below soft cap', () => {
      const nearCap: PlayerCombatStats = { ...baseStats, dodge: DEFAULT_SOFT_CAPS.dodge - 1 };
      const result = validateTrain('dodge', nearCap, 1);
      expect(result.valid).toBe(true);
      expect(result.statKey).toBe('dodge');
    });

    it('accepts stat aliases', () => {
      const result = validateTrain('armor', baseStats, 1);
      expect(result.valid).toBe(true);
      expect(result.statKey).toBe('armour');
    });
  });

  // ─── formatTrainOverview ──────────────────────────────────────────────

  describe('formatTrainOverview', () => {
    it('includes stat points available', () => {
      const output = formatTrainOverview(DEFAULT_PLAYER_COMBAT_STATS, 7);
      expect(output).toContain('7');
      expect(output).toContain('Stat points available');
    });

    it('includes all stat names', () => {
      const output = formatTrainOverview(DEFAULT_PLAYER_COMBAT_STATS, 0);
      for (const name of Object.values(STAT_DISPLAY_NAMES)) {
        expect(output).toContain(name);
      }
    });

    it('marks capped stats', () => {
      const capped: PlayerCombatStats = { ...DEFAULT_PLAYER_COMBAT_STATS, dodge: DEFAULT_SOFT_CAPS.dodge };
      const output = formatTrainOverview(capped, 5);
      expect(output).toContain('(capped)');
    });

    it('includes usage hint', () => {
      const output = formatTrainOverview(DEFAULT_PLAYER_COMBAT_STATS, 0);
      expect(output).toContain('train <stat>');
    });
  });

  // ─── Result builders ──────────────────────────────────────────────────

  describe('buildTrainSuccessResult', () => {
    it('includes stat name, old and new values, and remaining points', () => {
      const result = buildTrainSuccessResult('dodge', 5, 6, 2);
      expect(result.narrations).toHaveLength(1);
      expect(result.narrations[0]!.text).toContain('Dodge');
      expect(result.narrations[0]!.text).toContain('5');
      expect(result.narrations[0]!.text).toContain('6');
      expect(result.narrations[0]!.text).toContain('2 points remaining');
    });

    it('uses singular "point" when 1 remaining', () => {
      const result = buildTrainSuccessResult('armour', 2, 3, 1);
      expect(result.narrations[0]!.text).toContain('1 point remaining');
    });
  });

  describe('buildTrainOverviewResult', () => {
    it('returns narration with info type', () => {
      const result = buildTrainOverviewResult(DEFAULT_PLAYER_COMBAT_STATS, 3);
      expect(result.narrations).toHaveLength(1);
      expect(result.narrations[0]!.type).toBe('info');
    });
  });

  describe('buildTrainErrorResult', () => {
    it('returns narration with system type', () => {
      const result = buildTrainErrorResult('Something went wrong.');
      expect(result.narrations).toHaveLength(1);
      expect(result.narrations[0]!.text).toBe('Something went wrong.');
      expect(result.narrations[0]!.type).toBe('system');
    });
  });

  // ─── TRAINABLE_STATS coverage ─────────────────────────────────────────

  describe('all PlayerCombatStats keys are trainable', () => {
    const allKeys: Array<keyof PlayerCombatStats> = [
      'maxHp', 'unarmed', 'oneHanded', 'twoHanded', 'ranged',
      'shieldBlock', 'dodge', 'armour',
    ];

    it.each(allKeys)('%s is resolvable via at least one alias', (key) => {
      const found = Object.entries(TRAINABLE_STATS).some(([, v]) => v === key);
      expect(found).toBe(true);
    });

    it.each(allKeys)('%s has a display name', (key) => {
      expect(STAT_DISPLAY_NAMES[key]).toBeDefined();
      expect(STAT_DISPLAY_NAMES[key].length).toBeGreaterThan(0);
    });

    it.each(allKeys)('%s has a default soft cap', (key) => {
      expect(DEFAULT_SOFT_CAPS[key]).toBeGreaterThan(0);
    });
  });
});

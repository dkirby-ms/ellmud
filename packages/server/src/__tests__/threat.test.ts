import { describe, it, expect, beforeEach } from 'vitest';
import { ThreatTable } from '../combat/ThreatTable.js';

describe('ThreatTable', () => {
  let table: ThreatTable;

  beforeEach(() => {
    table = new ThreatTable();
  });

  describe('Basic threat tracking', () => {
    it('should start empty', () => {
      expect(table.isEmpty()).toBe(true);
      expect(table.getAllThreat().size).toBe(0);
    });

    it('should add base threat correctly', () => {
      table.addBaseThreat('player1');
      expect(table.getThreat('player1')).toBe(10);
      expect(table.isEmpty()).toBe(false);
    });

    it('should add damage threat correctly', () => {
      table.addDamageThreat('player1', 25);
      expect(table.getThreat('player1')).toBe(25);
    });

    it('should accumulate base threat on multiple calls', () => {
      table.addBaseThreat('player1');
      table.addBaseThreat('player1');
      expect(table.getThreat('player1')).toBe(20);
    });

    it('should accumulate damage threat on multiple calls', () => {
      table.addDamageThreat('player1', 15);
      table.addDamageThreat('player1', 10);
      expect(table.getThreat('player1')).toBe(25);
    });

    it('should combine base and damage threat', () => {
      table.addBaseThreat('player1');
      table.addDamageThreat('player1', 30);
      expect(table.getThreat('player1')).toBe(40);
    });
  });

  describe('Multi-source threat', () => {
    it('should track multiple players independently', () => {
      table.addBaseThreat('player1');
      table.addBaseThreat('player2');
      table.addDamageThreat('player1', 20);
      table.addDamageThreat('player2', 35);

      expect(table.getThreat('player1')).toBe(30);
      expect(table.getThreat('player2')).toBe(45);
    });

    it('should return 0 for unknown players', () => {
      table.addBaseThreat('player1');
      expect(table.getThreat('player2')).toBe(0);
    });
  });

  describe('Target selection', () => {
    it('should return null when no threats exist', () => {
      const target = table.getHighestThreatTarget(['player1', 'player2']);
      expect(target).toBeNull();
    });

    it('should return null when reachable list is empty', () => {
      table.addBaseThreat('player1');
      const target = table.getHighestThreatTarget([]);
      expect(target).toBeNull();
    });

    it('should select highest threat target from reachable players', () => {
      table.addDamageThreat('player1', 20);
      table.addDamageThreat('player2', 50);
      table.addDamageThreat('player3', 35);

      const target = table.getHighestThreatTarget(['player1', 'player2', 'player3']);
      expect(target).toBe('player2');
    });

    it('should only consider reachable players', () => {
      table.addDamageThreat('player1', 20);
      table.addDamageThreat('player2', 100);
      table.addDamageThreat('player3', 35);

      const target = table.getHighestThreatTarget(['player1', 'player3']);
      expect(target).toBe('player3');
    });

    it('should return first player when tied threat', () => {
      table.addDamageThreat('player1', 50);
      table.addDamageThreat('player2', 50);

      const target = table.getHighestThreatTarget(['player1', 'player2']);
      expect(target).toBe('player1');
    });

    it('should handle single reachable player', () => {
      table.addDamageThreat('player1', 30);
      const target = table.getHighestThreatTarget(['player1']);
      expect(target).toBe('player1');
    });

    it('should ignore unreachable players with high threat', () => {
      table.addDamageThreat('player1', 100);
      table.addDamageThreat('player2', 10);

      const target = table.getHighestThreatTarget(['player2']);
      expect(target).toBe('player2');
    });
  });

  describe('Cleanup operations', () => {
    it('should remove specific player threat', () => {
      table.addDamageThreat('player1', 30);
      table.addDamageThreat('player2', 40);

      table.removePlayer('player1');

      expect(table.getThreat('player1')).toBe(0);
      expect(table.getThreat('player2')).toBe(40);
    });

    it('should handle removing non-existent player', () => {
      table.addDamageThreat('player1', 30);
      table.removePlayer('player2');
      expect(table.getThreat('player1')).toBe(30);
    });

    it('should clear all threat', () => {
      table.addDamageThreat('player1', 30);
      table.addDamageThreat('player2', 40);
      table.addDamageThreat('player3', 50);

      table.clear();

      expect(table.isEmpty()).toBe(true);
      expect(table.getThreat('player1')).toBe(0);
      expect(table.getThreat('player2')).toBe(0);
      expect(table.getThreat('player3')).toBe(0);
    });

    it('should update isEmpty after removal', () => {
      table.addBaseThreat('player1');
      expect(table.isEmpty()).toBe(false);

      table.removePlayer('player1');
      expect(table.isEmpty()).toBe(true);
    });
  });

  describe('getAllThreat', () => {
    it('should return copy of threat map', () => {
      table.addDamageThreat('player1', 30);
      table.addDamageThreat('player2', 40);

      const allThreat = table.getAllThreat();

      expect(allThreat.get('player1')).toBe(30);
      expect(allThreat.get('player2')).toBe(40);
      expect(allThreat.size).toBe(2);
    });

    it('should return independent copy (mutations do not affect table)', () => {
      table.addDamageThreat('player1', 30);

      const allThreat = table.getAllThreat();
      allThreat.set('player1', 999);
      allThreat.set('player2', 100);

      expect(table.getThreat('player1')).toBe(30);
      expect(table.getThreat('player2')).toBe(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle zero damage threat', () => {
      table.addDamageThreat('player1', 0);
      expect(table.getThreat('player1')).toBe(0);
    });

    it('should handle large threat values', () => {
      table.addDamageThreat('player1', 999999);
      expect(table.getThreat('player1')).toBe(999999);
    });

    it('should select correct target after removal', () => {
      table.addDamageThreat('player1', 100);
      table.addDamageThreat('player2', 50);
      table.addDamageThreat('player3', 75);

      table.removePlayer('player1');

      const target = table.getHighestThreatTarget(['player1', 'player2', 'player3']);
      expect(target).toBe('player3');
    });

    it('should handle rapid add/remove cycles', () => {
      table.addBaseThreat('player1');
      table.removePlayer('player1');
      table.addDamageThreat('player1', 50);
      expect(table.getThreat('player1')).toBe(50);
    });
  });

  describe('Stub methods', () => {
    it('should have addHealingThreat stub (no-op)', () => {
      table.addHealingThreat('player1', 100, 20);
      expect(table.getThreat('player1')).toBe(0);
    });

    it('should have applyTaunt stub (no-op)', () => {
      table.addDamageThreat('player1', 50);
      table.applyTaunt('player2');
      expect(table.getThreat('player2')).toBe(0);
    });
  });
});

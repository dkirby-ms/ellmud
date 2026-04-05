/**
 * Room positioning system tests — GDD §6.11 + Threat Integration §6.10.
 *
 * Tests:
 * - Threat table integration with position reachability
 * - Creature targeting based on threat + position
 * - Melee creatures cannot reach Rear players
 * - Boss and ranged creatures can reach all positions
 * - Skirmisher repositioning (aggressive behavior)
 * - Steady creature behavior (melee/ranged)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CombatSystem } from '../combat/CombatSystem.js';
import { createCombatant, REPOSITION_COOLDOWN_TICKS } from '../combat/CombatState.js';

describe('Threat + Reachability Integration (GDD §6.10-6.11)', () => {
  let combat: CombatSystem;

  beforeEach(() => {
    combat = new CombatSystem(() => ['room-2'], () => 1); // Always fail dodge
  });

  describe('Melee Creature Targeting', () => {
    it('should target highest-threat reachable player (Front/Flank), ignore Rear', () => {
      const p1 = createCombatant('p1', 'FrontTank', 'room-1', true, { maxHp: 100, attack: 10, defence: 0, armour: 0, agility: 0 });
      const p2 = createCombatant('p2', 'RearHealer', 'room-1', true, { maxHp: 100, attack: 50, defence: 0, armour: 0, agility: 0 });
      const e1 = createCombatant('e1', 'MeleeEnemy', 'room-1', false, { maxHp: 1000, attack: 10, defence: 0, armour: 0, agility: 0 });
      
      p1.position = 'front';
      p2.position = 'rear';
      
      combat.registerCombatant(p1);
      combat.registerCombatant(p2);
      combat.registerCombatant(e1, 'melee'); // Melee creature at front
      
      // Initiate combat - add both players to the encounter
      combat.initiateCombat('p1', 'e1');
      combat.initiateCombat('p2', 'e1'); // Join p2 to same encounter
      
      // Reset enemy's target so it picks based on threat on next tick
      const enemy = combat.getCombatant('e1');
      if (enemy) enemy.currentTarget = undefined;
      
      // First tick: p1 attacks (low damage), p2 attacks (high damage from rear)
      combat.submitAction('p1', 'strike', 'e1');
      combat.submitAction('p2', 'strike', 'e1');
      combat.resolveTick();
      
      // Second tick: enemy should target p1 (highest threat REACHABLE)
      // even though p2 dealt more damage (but is at rear, unreachable)
      const result = combat.resolveTick();
      
      // Enemy auto-attacks p1 (not p2 who is unreachable)
      const enemyStrike = result.events.find(e => e.actorId === 'e1' && e.type === 'strike');
      expect(enemyStrike).toBeDefined();
      expect(enemyStrike!.targetId).toBe('p1'); // Targets front tank, not rear healer
    });

    it('should attack highest-threat reachable player when all high-threat players are at Rear', () => {
      const p1 = createCombatant('p1', 'FlankDPS', 'room-1', true, { maxHp: 100, attack: 5, defence: 0, armour: 0, agility: 0 });
      const p2 = createCombatant('p2', 'RearNuke', 'room-1', true, { maxHp: 100, attack: 100, defence: 0, armour: 0, agility: 0 });
      const e1 = createCombatant('e1', 'MeleeEnemy', 'room-1', false, { maxHp: 1000, attack: 10, defence: 0, armour: 0, agility: 0 });
      
      p1.position = 'flank';
      p2.position = 'rear';
      
      combat.registerCombatant(p1);
      combat.registerCombatant(p2);
      combat.registerCombatant(e1, 'melee');
      
      combat.initiateCombat('p1', 'e1');
      combat.initiateCombat('p2', 'e1'); // Join p2 to same encounter
      
      // Reset enemy's target so it picks based on threat
      const enemy = combat.getCombatant('e1');
      if (enemy) enemy.currentTarget = undefined;
      
      // p2 deals massive damage from rear (high threat but unreachable)
      // p1 deals low damage from flank (low threat but reachable)
      combat.submitAction('p1', 'strike', 'e1');
      combat.submitAction('p2', 'strike', 'e1');
      combat.resolveTick();
      
      // Enemy should attack p1 (only reachable target with threat)
      const result = combat.resolveTick();
      const enemyStrike = result.events.find(e => e.actorId === 'e1' && e.type === 'strike');
      expect(enemyStrike).toBeDefined();
      expect(enemyStrike!.targetId).toBe('p1');
    });
  });

  describe('Skirmisher Repositioning (Aggressive Behavior)', () => {
    it('should reposition toward unreachable high-threat target', () => {
      const p1 = createCombatant('p1', 'FrontTank', 'room-1', true, { maxHp: 100, attack: 5, defence: 0, armour: 0, agility: 0 });
      const p2 = createCombatant('p2', 'RearNuke', 'room-1', true, { maxHp: 100, attack: 100, defence: 0, armour: 0, agility: 0 });
      const e1 = createCombatant('e1', 'Skirmisher', 'room-1', false, { maxHp: 1000, attack: 10, defence: 0, armour: 0, agility: 0 });
      
      p1.position = 'front';
      p2.position = 'rear';
      
      combat.registerCombatant(p1);
      combat.registerCombatant(p2);
      combat.registerCombatant(e1, 'skirmisher'); // Aggressive behavior
      
      combat.initiateCombat('p1', 'e1');
      combat.initiateCombat('p2', 'e1'); // Join p2 to same encounter
      
      // Reset enemy's target so it picks based on threat
      let skirmisher = combat.getCombatant('e1');
      if (skirmisher) skirmisher.currentTarget = undefined;
      
      // p2 deals massive damage from rear
      combat.submitAction('p1', 'strike', 'e1');
      combat.submitAction('p2', 'strike', 'e1');
      combat.resolveTick();
      
      // Skirmisher should reposition to rear (toward p2)
      const result = combat.resolveTick();
      skirmisher = combat.getCombatant('e1');
      expect(skirmisher?.position).toBe('rear'); // Repositioned
      expect(skirmisher?.positionCooldown).toBe(REPOSITION_COOLDOWN_TICKS);
      
      // Should NOT have attacked this tick (repositioning costs action)
      const enemyStrike = result.events.find(e => e.actorId === 'e1' && e.type === 'strike');
      expect(enemyStrike).toBeUndefined();
    });

    it('should not reposition when on cooldown, attack reachable instead', () => {
      const p1 = createCombatant('p1', 'FrontTank', 'room-1', true, { maxHp: 100, attack: 5, defence: 0, armour: 0, agility: 0 });
      const p2 = createCombatant('p2', 'RearNuke', 'room-1', true, { maxHp: 100, attack: 100, defence: 0, armour: 0, agility: 0 });
      const e1 = createCombatant('e1', 'Skirmisher', 'room-1', false, { maxHp: 1000, attack: 10, defence: 0, armour: 0, agility: 0 });
      
      p1.position = 'front';
      p2.position = 'rear';
      e1.positionCooldown = 2; // On cooldown
      
      combat.registerCombatant(p1);
      combat.registerCombatant(p2);
      combat.registerCombatant(e1, 'skirmisher');
      
      combat.initiateCombat('p1', 'e1');
      combat.initiateCombat('p2', 'e1'); // Join p2 to same encounter
      
      // Reset enemy's target so it picks based on threat
      const skirmisher = combat.getCombatant('e1');
      if (skirmisher) skirmisher.currentTarget = undefined;
      
      combat.submitAction('p1', 'strike', 'e1');
      combat.submitAction('p2', 'strike', 'e1');
      combat.resolveTick();
      
      // Should attack p1 instead of repositioning
      const result = combat.resolveTick();
      const enemyStrike = result.events.find(e => e.actorId === 'e1' && e.type === 'strike');
      expect(enemyStrike).toBeDefined();
      expect(enemyStrike!.targetId).toBe('p1');
    });
  });

  describe('Steady Creature Behavior (Melee)', () => {
    it('should NOT reposition, attack highest-threat reachable instead', () => {
      const p1 = createCombatant('p1', 'FrontTank', 'room-1', true, { maxHp: 100, attack: 5, defence: 0, armour: 0, agility: 0 });
      const p2 = createCombatant('p2', 'RearNuke', 'room-1', true, { maxHp: 100, attack: 100, defence: 0, armour: 0, agility: 0 });
      const e1 = createCombatant('e1', 'MeleeEnemy', 'room-1', false, { maxHp: 1000, attack: 10, defence: 0, armour: 0, agility: 0 });
      
      p1.position = 'front';
      p2.position = 'rear';
      
      combat.registerCombatant(p1);
      combat.registerCombatant(p2);
      combat.registerCombatant(e1, 'melee'); // Steady behavior
      
      combat.initiateCombat('p1', 'e1');
      combat.initiateCombat('p2', 'e1'); // Join p2 to same encounter
      
      // Reset enemy's target so it picks based on threat
      let enemy = combat.getCombatant('e1');
      if (enemy) enemy.currentTarget = undefined;
      
      // p2 deals massive damage from rear (high threat, unreachable)
      combat.submitAction('p1', 'strike', 'e1');
      combat.submitAction('p2', 'strike', 'e1');
      combat.resolveTick();
      
      // Melee enemy should stay at front and attack p1
      const result = combat.resolveTick();
      enemy = combat.getCombatant('e1');
      expect(enemy?.position).toBe('front'); // Did NOT reposition
      
      const enemyStrike = result.events.find(e => e.actorId === 'e1' && e.type === 'strike');
      expect(enemyStrike).toBeDefined();
      expect(enemyStrike!.targetId).toBe('p1'); // Attacks reachable target
    });
  });

  describe('Boss Creature Targeting', () => {
    it('should target highest-threat player regardless of position', () => {
      const p1 = createCombatant('p1', 'FrontTank', 'room-1', true, { maxHp: 100, attack: 5, defence: 0, armour: 0, agility: 0 });
      const p2 = createCombatant('p2', 'RearNuke', 'room-1', true, { maxHp: 100, attack: 100, defence: 0, armour: 0, agility: 0 });
      const boss = createCombatant('boss', 'BossEnemy', 'room-1', false, { maxHp: 2000, attack: 50, defence: 0, armour: 0, agility: 0 });
      
      p1.position = 'front';
      p2.position = 'rear';
      
      combat.registerCombatant(p1);
      combat.registerCombatant(p2);
      combat.registerCombatant(boss, 'boss'); // Boss can reach all
      
      combat.initiateCombat('p1', 'boss');
      combat.initiateCombat('p2', 'boss'); // Join p2 to same encounter
      
      // p2 deals massive damage from rear
      combat.submitAction('p1', 'strike', 'boss');
      combat.submitAction('p2', 'strike', 'boss');
      combat.resolveTick();
      
      // Boss should target p2 (highest threat, even at rear)
      const result = combat.resolveTick();
      const bossStrike = result.events.find(e => e.actorId === 'boss' && e.type === 'strike');
      expect(bossStrike).toBeDefined();
      expect(bossStrike!.targetId).toBe('p2'); // Targets rear player with high threat
    });
  });

  describe('Ranged Creature Targeting', () => {
    it('should target highest-threat player from rear position', () => {
      const p1 = createCombatant('p1', 'FrontTank', 'room-1', true, { maxHp: 100, attack: 5, defence: 0, armour: 0, agility: 0 });
      const p2 = createCombatant('p2', 'FlankDPS', 'room-1', true, { maxHp: 100, attack: 50, defence: 0, armour: 0, agility: 0 });
      const p3 = createCombatant('p3', 'RearSupport', 'room-1', true, { maxHp: 100, attack: 100, defence: 0, armour: 0, agility: 0 });
      const archer = createCombatant('archer', 'RangedEnemy', 'room-1', false, { maxHp: 500, attack: 30, defence: 0, armour: 0, agility: 0 });
      
      p1.position = 'front';
      p2.position = 'flank';
      p3.position = 'rear';
      
      combat.registerCombatant(p1);
      combat.registerCombatant(p2);
      combat.registerCombatant(p3);
      combat.registerCombatant(archer, 'ranged'); // Ranged can reach all
      
      combat.initiateCombat('p1', 'archer');
      combat.initiateCombat('p2', 'archer'); // Join p2 to same encounter
      combat.initiateCombat('p3', 'archer'); // Join p3 to same encounter
      
      // p3 deals most damage from rear
      combat.submitAction('p1', 'strike', 'archer');
      combat.submitAction('p2', 'strike', 'archer');
      combat.submitAction('p3', 'strike', 'archer');
      combat.resolveTick();
      
      // Ranged enemy should target p3 (highest threat)
      const result = combat.resolveTick();
      const archerStrike = result.events.find(e => e.actorId === 'archer' && e.type === 'strike');
      expect(archerStrike).toBeDefined();
      expect(archerStrike!.targetId).toBe('p3');
    });
  });

  describe('Fallback Targeting (No Threat Data)', () => {
    it('should fall back to first reachable player when no threat data exists', () => {
      const p1 = createCombatant('p1', 'FrontTank', 'room-1', true);
      const e1 = createCombatant('e1', 'MeleeEnemy', 'room-1', false);
      
      combat.registerCombatant(p1);
      combat.registerCombatant(e1, 'melee');
      
      // Initiate combat but don't attack yet (no threat generated)
      combat.initiateCombat('p1', 'e1');
      
      // Enemy should attack p1 (fallback to first reachable)
      const result = combat.resolveTick();
      const enemyStrike = result.events.find(e => e.actorId === 'e1' && e.type === 'strike');
      expect(enemyStrike).toBeDefined();
      expect(enemyStrike!.targetId).toBe('p1');
    });
  });

  describe('Threat Table Updates', () => {
    it('should accumulate threat when player deals damage to creature', () => {
      const p1 = createCombatant('p1', 'Player', 'room-1', true, { maxHp: 100, attack: 10, defence: 0, armour: 0, agility: 0 });
      const e1 = createCombatant('e1', 'Enemy', 'room-1', false, { maxHp: 1000, attack: 10, defence: 0, armour: 0, agility: 0 });
      
      combat.registerCombatant(p1);
      combat.registerCombatant(e1, 'melee');
      
      combat.initiateCombat('p1', 'e1');
      
      // p1 attacks twice, accumulating threat
      combat.submitAction('p1', 'strike', 'e1');
      const result1 = combat.resolveTick();
      
      combat.submitAction('p1', 'strike', 'e1');
      const result2 = combat.resolveTick();
      
      // Both attacks should hit (damage should accumulate as threat)
      const strike1 = result1.events.find(e => e.actorId === 'p1' && e.type === 'strike');
      const strike2 = result2.events.find(e => e.actorId === 'p1' && e.type === 'strike');
      
      expect(strike1?.damage).toBeGreaterThan(0);
      expect(strike2?.damage).toBeGreaterThan(0);
      
      // Enemy should still target p1 on next tick (highest/only threat)
      const result3 = combat.resolveTick();
      const enemyStrike = result3.events.find(e => e.actorId === 'e1' && e.type === 'strike');
      expect(enemyStrike?.targetId).toBe('p1');
    });
  });
});

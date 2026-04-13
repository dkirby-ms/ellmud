/**
 * Ability system tests — GDD §6.3
 *
 * Tests ability cooldowns, stamina consumption, and fallback to auto-attack.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  CombatSystem,
  createCombatant,
  DEFAULT_PLAYER_STATS,
  type Combatant,
} from '../combat/index.js';

describe('Ability System (GDD §6.3)', () => {
  let combatSystem: CombatSystem;
  let player: Combatant;
  let creature: Combatant;

  beforeEach(() => {
    // Always fail dodge for deterministic tests
    combatSystem = new CombatSystem(() => [], () => 1);

    player = createCombatant('p1', 'Alice', 'room1', true, DEFAULT_PLAYER_STATS);
    creature = createCombatant('c1', 'Goblin', 'room1', false, {
      ...DEFAULT_PLAYER_STATS,
      maxHp: 50,
      attack: 8,
    });

    combatSystem.registerCombatant(player);
    combatSystem.registerCombatant(creature);
    combatSystem.initiateCombat('p1', 'c1');
  });

  describe('Heavy Strike', () => {
    it('should deal 1.5x damage', () => {
      // Submit heavy_strike action
      combatSystem.submitAction('p1', 'heavy_strike', 'c1');

      const result = combatSystem.resolveTick();

      // Heavy Strike should deal 1.5x damage: 10 * 1.5 = 15, minus 2 armour = 13
      const strikeEvent = result.events.find(
        (e) => e.type === 'strike' && e.actorId === 'p1',
      );
      expect(strikeEvent).toBeDefined();
      expect(strikeEvent!.damage).toBe(13); // 15 - 2 armour
      expect(creature.hp).toBe(50 - 13);
    });

    it('should consume stamina', () => {
      const initialStamina = player.stamina!;

      combatSystem.submitAction('p1', 'heavy_strike', 'c1');
      combatSystem.resolveTick();

      expect(player.stamina).toBe(initialStamina - 15); // Heavy Strike costs 15
    });

    it('should trigger cooldown', () => {
      combatSystem.submitAction('p1', 'heavy_strike', 'c1');
      combatSystem.resolveTick();

      expect(player.abilityCooldowns?.get('heavy_strike')).toBe(3);
    });

    it('should fallback to auto-attack when on cooldown', () => {
      // First use
      combatSystem.submitAction('p1', 'heavy_strike', 'c1');
      combatSystem.resolveTick();

      // Second attempt should fallback
      combatSystem.submitAction('p1', 'heavy_strike', 'c1');
      const result = combatSystem.resolveTick();

      // Should be normal strike damage: 10 - 2 = 8
      const strikeEvent = result.events.find(
        (e) => e.type === 'strike' && e.actorId === 'p1',
      );
      expect(strikeEvent!.damage).toBe(8);
    });

    it('should fallback to auto-attack when insufficient stamina', () => {
      player.stamina = 10; // Not enough for Heavy Strike (15)

      combatSystem.submitAction('p1', 'heavy_strike', 'c1');
      const result = combatSystem.resolveTick();

      // Should fallback to auto-attack
      const strikeEvent = result.events.find(
        (e) => e.type === 'strike' && e.actorId === 'p1',
      );
      expect(strikeEvent!.damage).toBe(8); // Normal strike
      expect(player.stamina).toBe(10); // Stamina not consumed
    });
  });

  describe('Block', () => {
    it('should reduce incoming damage by 5', () => {
      // Player blocks, creature attacks
      combatSystem.submitAction('p1', 'block');
      combatSystem.submitAction('c1', 'strike', 'p1');

      const result = combatSystem.resolveTick();

      // Creature attack: 8 - (2 armour + 5 block) = 1 (minimum)
      const strikeEvent = result.events.find(
        (e) => e.type === 'strike' && e.actorId === 'c1',
      );
      expect(strikeEvent!.damage).toBe(1);
    });

    it('should consume stamina', () => {
      const initialStamina = player.stamina!;

      combatSystem.submitAction('p1', 'block');
      combatSystem.resolveTick();

      expect(player.stamina).toBe(initialStamina - 10); // Block costs 10
    });

    it('should trigger cooldown', () => {
      combatSystem.submitAction('p1', 'block');
      combatSystem.resolveTick();

      expect(player.abilityCooldowns?.get('block')).toBe(2);
    });

    it('should generate block narration', () => {
      combatSystem.submitAction('p1', 'block');
      const result = combatSystem.resolveTick();

      const blockEvent = result.events.find(
        (e) => e.actorId === 'p1' && e.narration.includes('blocking'),
      );
      expect(blockEvent).toBeDefined();
    });
  });

  describe('Observe', () => {
    it('should reveal creature stats', () => {
      combatSystem.submitAction('p1', 'observe', 'c1');
      const result = combatSystem.resolveTick();

      const observeEvent = result.events.find(
        (e) => e.actorId === 'p1' && e.narration.includes('observes'),
      );
      expect(observeEvent).toBeDefined();
      expect(observeEvent!.narration).toContain('50/50 HP'); // Creature HP
      expect(observeEvent!.narration).toContain('Attack: 8');
    });

    it('should consume stamina', () => {
      const initialStamina = player.stamina!;

      combatSystem.submitAction('p1', 'observe', 'c1');
      combatSystem.resolveTick();

      expect(player.stamina).toBe(initialStamina - 5); // Observe costs 5
    });

    it('should have no cooldown', () => {
      combatSystem.submitAction('p1', 'observe', 'c1');
      combatSystem.resolveTick();

      expect(player.abilityCooldowns?.has('observe')).toBe(false);
    });
  });

  describe('Cooldown Management', () => {
    it('should decrement cooldowns each tick', () => {
      combatSystem.submitAction('p1', 'heavy_strike', 'c1');
      combatSystem.resolveTick();

      expect(player.abilityCooldowns?.get('heavy_strike')).toBe(3);

      // Tick with auto-attack
      combatSystem.resolveTick();
      expect(player.abilityCooldowns?.get('heavy_strike')).toBe(2);

      combatSystem.resolveTick();
      expect(player.abilityCooldowns?.get('heavy_strike')).toBe(1);

      combatSystem.resolveTick();
      expect(player.abilityCooldowns?.has('heavy_strike')).toBe(false);
    });

    it('should allow ability use after cooldown expires', () => {
      // First use
      combatSystem.submitAction('p1', 'heavy_strike', 'c1');
      combatSystem.resolveTick();

      // Wait for cooldown
      combatSystem.resolveTick();
      combatSystem.resolveTick();
      combatSystem.resolveTick();

      // Should be usable again
      combatSystem.submitAction('p1', 'heavy_strike', 'c1');
      const result = combatSystem.resolveTick();

      const strikeEvent = result.events.find(
        (e) => e.type === 'strike' && e.actorId === 'p1',
      );
      expect(strikeEvent!.damage).toBe(13); // Heavy Strike damage
    });
  });

  describe('Stamina Edge Cases', () => {
    it('should not allow negative stamina', () => {
      player.stamina = 10;

      combatSystem.submitAction('p1', 'heavy_strike', 'c1');
      combatSystem.resolveTick();

      // Should fallback, stamina stays at 10
      expect(player.stamina).toBe(10);
      expect(player.stamina).toBeGreaterThanOrEqual(0);
    });

    it('should handle exact stamina cost', () => {
      player.stamina = 15;

      combatSystem.submitAction('p1', 'heavy_strike', 'c1');
      combatSystem.resolveTick();

      expect(player.stamina).toBe(0);
    });
  });

  describe('Auto-attack Fallback', () => {
    it('should fallback to auto-attack when ability fails validation', () => {
      player.stamina = 5; // Not enough for block (10)

      combatSystem.submitAction('p1', 'block');
      const result = combatSystem.resolveTick();

      // Should auto-attack instead
      const strikeEvent = result.events.find(
        (e) => e.type === 'strike' && e.actorId === 'p1',
      );
      expect(strikeEvent).toBeDefined();
      expect(strikeEvent!.targetId).toBe('c1');
    });

    it('should fallback to strike if no valid target', () => {
      player.stamina = 5;
      player.currentTarget = undefined;

      combatSystem.submitAction('p1', 'heavy_strike');
      const result = combatSystem.resolveTick();

      const p1Action = result.events.find((e) => e.actorId === 'p1');
      expect(p1Action).toBeDefined();
      expect(p1Action!.type).toBe('strike');
    });
  });
});

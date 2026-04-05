import { describe, it, expect, beforeEach } from 'vitest';
import { CombatSystem } from '../combat/CombatSystem.js';
import {
  createCombatant,
  DEFAULT_PLAYER_STATS,
  type Combatant,
  type CombatStats,
  type WindUpState,
} from '../combat/CombatState.js';
import type { CreatureAbility } from '../creatures/types.js';

// ─── Test Helpers ─────────────────────────────────────────────────────────

const TEST_ROOM = 'room-1';

function testExitResolver(_roomId: string): string[] {
  return [];
}

function makePlayer(id: string, roomId = TEST_ROOM, stats?: Partial<CombatStats>): Combatant {
  const merged = { ...DEFAULT_PLAYER_STATS, ...stats };
  return createCombatant(id, id, roomId, true, merged);
}

function makeCreature(id: string, roomId = TEST_ROOM, stats?: Partial<CombatStats>): Combatant {
  const merged = { ...DEFAULT_PLAYER_STATS, ...stats };
  return createCombatant(id, id, roomId, false, merged);
}

// ─── Telegraph System Tests ───────────────────────────────────────────────

describe('Enemy Telegraph System (GDD §6.5)', () => {
  let combat: CombatSystem;
  let player: Combatant;
  let creature: Combatant;

  const testAbility: CreatureAbility = {
    id: 'crushing_blow',
    name: 'Crushing Blow',
    damage: 18,
    windUpTicks: 3,
    telegraphText: 'The revenant raises its corroded blade overhead...',
  };

  beforeEach(() => {
    combat = new CombatSystem(testExitResolver);
    player = makePlayer('player-1', TEST_ROOM);
    creature = makeCreature('creature-1', TEST_ROOM, { attack: 10 });
    combat.registerCombatant(player);
    combat.registerCombatant(creature);
    combat.initiateCombat(creature.id, player.id);
  });

  describe('queueTelegraph', () => {
    it('initiates wind-up state on combatant', () => {
      const success = combat.queueTelegraph(creature.id, player.id, testAbility);
      expect(success).toBe(true);

      const combatant = combat.getCombatant(creature.id);
      expect(combatant?.windUp).toBeDefined();
      expect(combatant?.windUp?.abilityId).toBe('crushing_blow');
      expect(combatant?.windUp?.abilityName).toBe('Crushing Blow');
      expect(combatant?.windUp?.damage).toBe(18);
      expect(combatant?.windUp?.remainingTicks).toBe(3);
      expect(combatant?.windUp?.targetId).toBe(player.id);
      expect(combatant?.windUp?.telegraphText).toBe(testAbility.telegraphText);
    });

    it('rejects queueing telegraph if combatant not in combat', () => {
      const outsider = makeCreature('outsider', TEST_ROOM);
      combat.registerCombatant(outsider);

      const success = combat.queueTelegraph(outsider.id, player.id, testAbility);
      expect(success).toBe(false);

      const combatant = combat.getCombatant(outsider.id);
      expect(combatant?.windUp).toBeUndefined();
    });

    it('rejects queueing telegraph if already winding up', () => {
      combat.queueTelegraph(creature.id, player.id, testAbility);

      const secondAbility: CreatureAbility = {
        id: 'second_ability',
        name: 'Second Ability',
        damage: 10,
        windUpTicks: 2,
        telegraphText: 'Another attack...',
      };

      const success = combat.queueTelegraph(creature.id, player.id, secondAbility);
      expect(success).toBe(false);

      // Still has original wind-up
      const combatant = combat.getCombatant(creature.id);
      expect(combatant?.windUp?.abilityId).toBe('crushing_blow');
    });
  });

  describe('wind-up countdown', () => {
    it('decrements remainingTicks each tick until expiry', () => {
      combat.queueTelegraph(creature.id, player.id, testAbility);

      // Tick 1: countdown 3 → 2
      let result = combat.resolveTick();
      expect(result.telegraphs).toHaveLength(1);
      expect(result.telegraphs?.[0].remainingTicks).toBe(2);

      // Tick 2: countdown 2 → 1
      result = combat.resolveTick();
      expect(result.telegraphs).toHaveLength(1);
      expect(result.telegraphs?.[0].remainingTicks).toBe(1);

      // Tick 3: countdown 1 → 0, ability fires
      result = combat.resolveTick();
      expect(result.telegraphs).toHaveLength(0); // No more telegraphs

      // Check that damage was applied (18 damage from ability - 2 armour = 16)
      const playerAfter = combat.getCombatant(player.id);
      const expectedHp = 100 - 16; // Initial HP 100 minus ability damage
      expect(playerAfter?.hp).toBe(expectedHp);
    });

    it('broadcasts telegraph on each countdown tick', () => {
      combat.queueTelegraph(creature.id, player.id, testAbility);

      const result = combat.resolveTick();
      expect(result.telegraphs).toHaveLength(1);
      expect(result.telegraphs?.[0].creatureId).toBe(creature.id);
      expect(result.telegraphs?.[0].creatureName).toBe(creature.name);
      expect(result.telegraphs?.[0].abilityName).toBe('Crushing Blow');
      expect(result.telegraphs?.[0].targetId).toBe(player.id);
      expect(result.telegraphs?.[0].telegraphText).toBe(testAbility.telegraphText);
    });

    it('clears wind-up state after ability executes', () => {
      combat.queueTelegraph(creature.id, player.id, testAbility);

      // Advance 3 ticks
      combat.resolveTick();
      combat.resolveTick();
      combat.resolveTick();

      const combatant = combat.getCombatant(creature.id);
      expect(combatant?.windUp).toBeUndefined();
    });
  });

  describe('telegraphed ability damage', () => {
    it('applies ability damage instead of base attack', () => {
      const playerInitialHp = player.hp;
      combat.queueTelegraph(creature.id, player.id, testAbility);

      // Advance to ability execution (3 ticks)
      combat.resolveTick();
      combat.resolveTick();
      combat.resolveTick();

      const playerAfter = combat.getCombatant(player.id);
      const expectedDamage = testAbility.damage - player.armour; // 18 - 2 = 16
      expect(playerAfter?.hp).toBe(playerInitialHp - expectedDamage);
    });

    it('block mitigates telegraphed ability damage (GDD §6.5)', () => {
      const playerInitialHp = player.hp;
      combat.queueTelegraph(creature.id, player.id, testAbility);

      // Player blocks on tick 3
      combat.resolveTick();
      combat.resolveTick();
      combat.submitAction(player.id, 'dodge'); // dodge mitigates
      combat.resolveTick();

      const playerAfter = combat.getCombatant(player.id);
      // Dodge halves damage: (18 * 0.5) - 2 = 9 - 2 = 7
      const expectedDamage = Math.floor(testAbility.damage * 0.5) - player.armour;
      expect(playerAfter?.hp).toBe(playerInitialHp - expectedDamage);
    });
  });

  describe('creature behavior integration', () => {
    it('creature does not queue actions while winding up', () => {
      combat.queueTelegraph(creature.id, player.id, testAbility);

      // Resolve tick — creature should not auto-attack while winding up
      const result = combat.resolveTick();

      // Only telegraph, no strike events
      const strikeEvents = result.events.filter(e => e.type === 'strike' && e.actorId === creature.id);
      expect(strikeEvents).toHaveLength(0);
    });

    it('creature returns to normal attacks after telegraph completes', () => {
      combat.queueTelegraph(creature.id, player.id, testAbility);

      // Execute telegraph
      combat.resolveTick();
      combat.resolveTick();
      combat.resolveTick();

      // Next tick: creature should auto-attack normally
      const result = combat.resolveTick();
      const strikeEvents = result.events.filter(e => e.type === 'strike' && e.actorId === creature.id);
      expect(strikeEvents.length).toBeGreaterThan(0);
    });
  });

  describe('multiple creatures telegraphing', () => {
    it('tracks separate wind-up states for multiple creatures', () => {
      const creature2 = makeCreature('creature-2', TEST_ROOM, { attack: 8 });
      combat.registerCombatant(creature2);
      combat.initiateCombat(creature2.id, player.id);

      const ability2: CreatureAbility = {
        id: 'frenzied_leap',
        name: 'Frenzied Leap',
        damage: 10,
        windUpTicks: 4,
        telegraphText: 'The gutterspawn crouches low...',
      };

      // Both creatures telegraph
      combat.queueTelegraph(creature.id, player.id, testAbility); // 3 ticks
      combat.queueTelegraph(creature2.id, player.id, ability2); // 4 ticks

      // Tick 1: both telegraphing
      let result = combat.resolveTick();
      expect(result.telegraphs).toHaveLength(2);

      // Tick 2: both telegraphing
      result = combat.resolveTick();
      expect(result.telegraphs).toHaveLength(2);

      // Tick 3: creature 1's ability fires, creature 2 still telegraphing
      result = combat.resolveTick();
      expect(result.telegraphs).toHaveLength(1);
      expect(result.telegraphs?.[0].creatureId).toBe(creature2.id);

      // Tick 4: creature 2's ability fires
      result = combat.resolveTick();
      expect(result.telegraphs).toHaveLength(0);
    });
  });
});

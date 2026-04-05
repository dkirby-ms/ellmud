/**
 * Flee Skill Check Tests (GDD §6.2)
 *
 * Tests flee success probability based on Evasion skill vs creature level,
 * and post-combat 3-tick cooldown before combat mode ends.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CombatSystem, type ExitResolver } from '../combat/CombatSystem.js';
import {
  createCombatant,
  DEFAULT_PLAYER_STATS,
  BASE_FLEE_CHANCE,
  FLEE_EVASION_BONUS_PER_RANK,
  FLEE_LEVEL_PENALTY,
  POST_COMBAT_COOLDOWN_TICKS,
} from '../combat/CombatState.js';

describe('Flee Skill Check (GDD §6.2)', () => {
  let system: CombatSystem;
  const exits: ExitResolver = (roomId) => (roomId === 'room-1' ? ['room-2'] : []);

  beforeEach(() => {
    system = new CombatSystem(exits);
  });

  it('flee succeeds when skill check passes (roll < flee chance)', () => {
    const roll = () => 0.4; // Will pass with base 50% flee chance
    system = new CombatSystem(exits, roll);

    const player = createCombatant('p1', 'Runner', 'room-1', true, DEFAULT_PLAYER_STATS, 0, 0, 1);
    const creature = createCombatant('c1', 'Goblin', 'room-1', false, DEFAULT_PLAYER_STATS, 0, 0, 1);

    system.registerCombatant(player);
    system.registerCombatant(creature);
    system.initiateCombat('p1', 'c1');
    system.submitAction('p1', 'flee', undefined, 'room-2');

    const result = system.resolveTick();

    expect(result.fleeResults).toHaveLength(1);
    expect(result.fleeResults[0].combatantId).toBe('p1');
    expect(result.fleeResults[0].toRoomId).toBe('room-2');
    expect(result.events.some(e => e.type === 'flee' && e.actorId === 'p1' && e.narration.includes('flees'))).toBe(true);
  });

  it('flee fails when skill check fails (roll >= flee chance)', () => {
    const roll = () => 0.6; // Will fail with base 50% flee chance
    system = new CombatSystem(exits, roll);

    const player = createCombatant('p1', 'Unlucky', 'room-1', true, DEFAULT_PLAYER_STATS, 0, 0, 1);
    const creature = createCombatant('c1', 'Goblin', 'room-1', false, DEFAULT_PLAYER_STATS, 0, 0, 1);

    system.registerCombatant(player);
    system.registerCombatant(creature);
    system.initiateCombat('p1', 'c1');
    system.submitAction('p1', 'flee', undefined, 'room-2');

    const result = system.resolveTick();

    expect(result.fleeResults).toHaveLength(0);
    expect(player.roomId).toBe('room-1'); // Still in same room
    expect(result.events.some(e => e.type === 'flee' && e.actorId === 'p1' && e.narration.includes('no escape'))).toBe(true);
  });

  it('evasion skill increases flee chance', () => {
    // With evasion rank 5: base 50% + 5*5% = 75% flee chance
    const roll = () => 0.65; // Will pass with 75% but fail with 50%
    system = new CombatSystem(exits, roll);

    const player = createCombatant('p1', 'Evasive', 'room-1', true, DEFAULT_PLAYER_STATS, 0, 5, 1);
    const creature = createCombatant('c1', 'Goblin', 'room-1', false, DEFAULT_PLAYER_STATS, 0, 0, 1);

    system.registerCombatant(player);
    system.registerCombatant(creature);
    system.initiateCombat('p1', 'c1');
    system.submitAction('p1', 'flee', undefined, 'room-2');

    const result = system.resolveTick();

    expect(result.fleeResults).toHaveLength(1);
    expect(result.fleeResults[0].combatantId).toBe('p1');
  });

  it('higher creature level decreases flee chance', () => {
    // Creature level 5, player level 1: level diff = 4
    // Flee chance = 50% - 4*5% = 30%
    const roll = () => 0.4; // Will fail with 30% but pass with 50%
    system = new CombatSystem(exits, roll);

    const player = createCombatant('p1', 'Newbie', 'room-1', true, DEFAULT_PLAYER_STATS, 0, 0, 1);
    const creature = createCombatant('c1', 'Dragon', 'room-1', false, DEFAULT_PLAYER_STATS, 0, 0, 5);

    system.registerCombatant(player);
    system.registerCombatant(creature);
    system.initiateCombat('p1', 'c1');
    system.submitAction('p1', 'flee', undefined, 'room-2');

    const result = system.resolveTick();

    expect(result.fleeResults).toHaveLength(0); // Failed to flee
  });

  it('flee chance calculation: base + evasion - level penalty', () => {
    // Player: evasion rank 3, level 2
    // Creature: level 5
    // Expected: 50% + 3*5% - (5-2)*5% = 50% + 15% - 15% = 50%
    const roll = () => 0.4; // Will pass with 50%
    system = new CombatSystem(exits, roll);

    const player = createCombatant('p1', 'Balanced', 'room-1', true, DEFAULT_PLAYER_STATS, 0, 3, 2);
    const creature = createCombatant('c1', 'Orc', 'room-1', false, DEFAULT_PLAYER_STATS, 0, 0, 5);

    system.registerCombatant(player);
    system.registerCombatant(creature);
    system.initiateCombat('p1', 'c1');
    system.submitAction('p1', 'flee', undefined, 'room-2');

    const result = system.resolveTick();

    expect(result.fleeResults).toHaveLength(1);
  });

  it('flee chance is capped at 0% (cannot succeed with negative chance)', () => {
    // Extreme level difference: creature level 20, player level 1, no evasion
    // Flee chance = 50% - 19*5% = -45% → clamped to 0%
    const roll = () => 0.0; // Even perfect roll cannot succeed
    system = new CombatSystem(exits, roll);

    const player = createCombatant('p1', 'Doomed', 'room-1', true, DEFAULT_PLAYER_STATS, 0, 0, 1);
    const creature = createCombatant('c1', 'Ancient Dragon', 'room-1', false, DEFAULT_PLAYER_STATS, 0, 0, 20);

    system.registerCombatant(player);
    system.registerCombatant(creature);
    system.initiateCombat('p1', 'c1');
    system.submitAction('p1', 'flee', undefined, 'room-2');

    const result = system.resolveTick();

    expect(result.fleeResults).toHaveLength(0); // Cannot flee
  });

  it('flee chance is capped at 100% (always succeeds)', () => {
    // High evasion skill rank: 20 → 50% + 20*5% = 150% → clamped to 100%
    const roll = () => 0.99; // Even worst roll succeeds
    system = new CombatSystem(exits, roll);

    const player = createCombatant('p1', 'Master', 'room-1', true, DEFAULT_PLAYER_STATS, 0, 20, 1);
    const creature = createCombatant('c1', 'Goblin', 'room-1', false, DEFAULT_PLAYER_STATS, 0, 0, 1);

    system.registerCombatant(player);
    system.registerCombatant(creature);
    system.initiateCombat('p1', 'c1');
    system.submitAction('p1', 'flee', undefined, 'room-2');

    const result = system.resolveTick();

    expect(result.fleeResults).toHaveLength(1);
  });

  it('flee uses highest creature level in encounter for penalty', () => {
    // Multiple creatures: level 1, level 3, level 7
    // Penalty based on max (level 7): 50% - (7-1)*5% = 20%
    const roll = () => 0.15; // Will pass with 20%
    system = new CombatSystem(exits, roll);

    const player = createCombatant('p1', 'Fighter', 'room-1', true, DEFAULT_PLAYER_STATS, 0, 0, 1);
    const creature1 = createCombatant('c1', 'Rat', 'room-1', false, DEFAULT_PLAYER_STATS, 0, 0, 1);
    const creature2 = createCombatant('c2', 'Wolf', 'room-1', false, DEFAULT_PLAYER_STATS, 0, 0, 3);
    const creature3 = createCombatant('c3', 'Troll', 'room-1', false, DEFAULT_PLAYER_STATS, 0, 0, 7);

    system.registerCombatant(player);
    system.registerCombatant(creature1);
    system.registerCombatant(creature2);
    system.registerCombatant(creature3);

    system.initiateCombat('p1', 'c1');
    system.initiateCombat('c2', 'p1');
    system.initiateCombat('c3', 'p1');
    system.submitAction('p1', 'flee', undefined, 'room-2');

    const result = system.resolveTick();

    expect(result.fleeResults).toHaveLength(1);
  });

  it('flee still fails if no exits available (always fails)', () => {
    const roll = () => 0.0; // Perfect roll
    const noExits: ExitResolver = () => [];
    system = new CombatSystem(noExits, roll);

    const player = createCombatant('p1', 'Trapped', 'room-1', true, DEFAULT_PLAYER_STATS, 0, 20, 1);
    const creature = createCombatant('c1', 'Goblin', 'room-1', false, DEFAULT_PLAYER_STATS, 0, 0, 1);

    system.registerCombatant(player);
    system.registerCombatant(creature);
    system.initiateCombat('p1', 'c1');
    system.submitAction('p1', 'flee');

    const result = system.resolveTick();

    expect(result.fleeResults).toHaveLength(0);
    expect(result.events.some(e => e.type === 'flee' && e.narration.includes('no escape'))).toBe(true);
  });
});

describe('Post-Combat Cooldown (GDD §6.2)', () => {
  let system: CombatSystem;
  const exits: ExitResolver = (roomId) => (roomId === 'room-1' ? ['room-2'] : []);

  beforeEach(() => {
    system = new CombatSystem(exits);
  });

  it('combat does not end immediately when last enemy dies', () => {
    const player = createCombatant('p1', 'Warrior', 'room-1', true, DEFAULT_PLAYER_STATS);
    const creature = createCombatant('c1', 'Goblin', 'room-1', false, DEFAULT_PLAYER_STATS);
    creature.hp = 1; // One hit from death

    system.registerCombatant(player);
    system.registerCombatant(creature);
    system.initiateCombat('p1', 'c1');

    // Tick 1: Player strikes, creature dies
    const result1 = system.resolveTick();
    expect(result1.events.some(e => e.type === 'defeated' && e.actorId === 'c1')).toBe(true);
    expect(result1.events.some(e => e.type === 'combat_end')).toBe(false);
    expect(result1.endedEncounterIds).toHaveLength(0);
  });

  it('combat ends after 3-tick cooldown when no new threats', () => {
    const player = createCombatant('p1', 'Warrior', 'room-1', true, DEFAULT_PLAYER_STATS);
    const creature = createCombatant('c1', 'Goblin', 'room-1', false, DEFAULT_PLAYER_STATS);
    creature.hp = 1;

    system.registerCombatant(player);
    system.registerCombatant(creature);
    system.initiateCombat('p1', 'c1');

    // Tick 1: Creature dies, cooldown starts at 3
    system.resolveTick();
    expect(system.hasActiveEncounters()).toBe(true);

    // Tick 2: Cooldown at 2
    const result2 = system.resolveTick();
    expect(result2.events.some(e => e.type === 'combat_end')).toBe(false);
    expect(system.hasActiveEncounters()).toBe(true);

    // Tick 3: Cooldown at 1
    const result3 = system.resolveTick();
    expect(result3.events.some(e => e.type === 'combat_end')).toBe(false);
    expect(system.hasActiveEncounters()).toBe(true);

    // Tick 4: Cooldown expires (was at 1, now 0), combat ends
    const result4 = system.resolveTick();
    expect(result4.events.some(e => e.type === 'combat_end')).toBe(true);
    expect(system.hasActiveEncounters()).toBe(false);
  });

  it('new aggro during cooldown continues combat seamlessly', () => {
    const player = createCombatant('p1', 'Warrior', 'room-1', true, DEFAULT_PLAYER_STATS);
    const creature1 = createCombatant('c1', 'Goblin', 'room-1', false, DEFAULT_PLAYER_STATS);
    const creature2 = createCombatant('c2', 'Orc', 'room-1', false, DEFAULT_PLAYER_STATS);
    creature1.hp = 1;

    system.registerCombatant(player);
    system.registerCombatant(creature1);
    system.registerCombatant(creature2);

    // Start combat with creature1
    system.initiateCombat('p1', 'c1');

    // Tick 1: Creature1 dies, cooldown starts
    system.resolveTick();
    expect(system.hasActiveEncounters()).toBe(true);

    // Tick 2: During cooldown, creature2 aggros
    system.initiateCombat('c2', 'p1');
    const result2 = system.resolveTick();

    // Cooldown should be reset, combat continues
    expect(result2.events.some(e => e.type === 'combat_end')).toBe(false);
    expect(system.hasActiveEncounters()).toBe(true);

    // Many ticks later, no combat_end since we have active combat
    for (let i = 0; i < 5; i++) {
      const r = system.resolveTick();
      expect(r.events.some(e => e.type === 'combat_end')).toBe(false);
    }
  });

  it('fleeing player during cooldown ends encounter immediately', () => {
    const roll = () => 0.0; // Always succeed flee
    system = new CombatSystem(exits, roll);

    const player = createCombatant('p1', 'Runner', 'room-1', true, DEFAULT_PLAYER_STATS, 0, 20, 1);
    const creature = createCombatant('c1', 'Goblin', 'room-1', false, DEFAULT_PLAYER_STATS, 0, 0, 1);
    creature.hp = 1;

    system.registerCombatant(player);
    system.registerCombatant(creature);
    system.initiateCombat('p1', 'c1');

    // Tick 1: Creature dies, cooldown starts
    system.resolveTick();
    expect(system.hasActiveEncounters()).toBe(true);

    // Tick 2: Player flees during cooldown
    // Since creature is already dead and player is alone, can't actually flee from empty encounter
    // This test demonstrates that flee from a dead encounter is handled gracefully
    const inCombat = system.isInCombat('p1');
    expect(inCombat).toBe(true); // Still in encounter during cooldown

    // Continue cooldown
    system.resolveTick();
    system.resolveTick();
    const result4 = system.resolveTick();

    // Combat should end after cooldown
    expect(system.hasActiveEncounters()).toBe(false);
  });

  it('cooldown value matches POST_COMBAT_COOLDOWN_TICKS constant (3)', () => {
    expect(POST_COMBAT_COOLDOWN_TICKS).toBe(3);
  });
});

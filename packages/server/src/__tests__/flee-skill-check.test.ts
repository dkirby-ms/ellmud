/**
 * Flee Skill Check Tests (GDD §6.2)
 *
 * Tests flee success probability based on Evasion skill vs creature level,
 * and post-combat 3-tick cooldown before combat mode ends.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CombatSystem, type ExitResolver } from '../combat/CombatSystem.js';
import { createCombatant } from '../combat/CombatState.js';

describe('Flee Skill Check (GDD §6.2)', () => {
  let system: CombatSystem;
  const exits: ExitResolver = (roomId) => (roomId === 'room-1' ? ['room-2'] : []);

  beforeEach(() => {
    system = new CombatSystem(exits);
  });

  it('flee succeeds when skill check passes (roll < flee chance)', () => {
    const roll = () => 0.4; // Will pass with base 50% flee chance
    system = new CombatSystem(exits, roll);

    const player = createCombatant('p1', 'Runner', 'room-1', true);
    const creature = createCombatant('c1', 'Goblin', 'room-1', false);

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

    const player = createCombatant('p1', 'Unlucky', 'room-1', true, { dodge: 0 });
    const creature = createCombatant('c1', 'Goblin', 'room-1', false);

    system.registerCombatant(player);
    system.registerCombatant(creature);
    system.initiateCombat('p1', 'c1');
    system.submitAction('p1', 'flee', undefined, 'room-2');

    const result = system.resolveTick();

    expect(result.fleeResults).toHaveLength(0);
    expect(player.roomId).toBe('room-1'); // Still in same room
    expect(result.events.some(e => e.type === 'flee' && e.actorId === 'p1' && e.narration.includes("can't break free"))).toBe(true);
  });

  it('evasion skill increases flee chance', () => {
    // With evasion rank 5: base 50% + 5*5% = 75% flee chance
    const roll = () => 0.65; // Will pass with 75% but fail with 50%
    system = new CombatSystem(exits, roll);

    const player = createCombatant('p1', 'Evasive', 'room-1', true, { dodge: 5 });
    const creature = createCombatant('c1', 'Goblin', 'room-1', false);

    system.registerCombatant(player);
    system.registerCombatant(creature);
    system.initiateCombat('p1', 'c1');
    system.submitAction('p1', 'flee', undefined, 'room-2');

    const result = system.resolveTick();

    expect(result.fleeResults).toHaveLength(1);
    expect(result.fleeResults[0].combatantId).toBe('p1');
  });

  it('higher creature level decreases flee chance', () => {
    // Creature level 5, player level 1, dodge 0: level diff = 4
    // Flee chance = 50% - 4*5% = 30%
    const roll = () => 0.4; // Will fail with 30% but pass with 50%
    system = new CombatSystem(exits, roll);

    const player = createCombatant('p1', 'Newbie', 'room-1', true, { dodge: 0 });
    const creature = createCombatant('c1', 'Dragon', 'room-1', false, { level: 5 });

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

    const player = createCombatant('p1', 'Balanced', 'room-1', true, { dodge: 3, level: 2 });
    const creature = createCombatant('c1', 'Orc', 'room-1', false, { level: 5 });

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

    const player = createCombatant('p1', 'Doomed', 'room-1', true);
    const creature = createCombatant('c1', 'Ancient Dragon', 'room-1', false, { level: 20 });

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

    const player = createCombatant('p1', 'Master', 'room-1', true, { dodge: 20 });
    const creature = createCombatant('c1', 'Goblin', 'room-1', false);

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

    const player = createCombatant('p1', 'Fighter', 'room-1', true);
    const creature1 = createCombatant('c1', 'Rat', 'room-1', false);
    const creature2 = createCombatant('c2', 'Wolf', 'room-1', false, { level: 3 });
    const creature3 = createCombatant('c3', 'Troll', 'room-1', false, { level: 7 });

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

    const player = createCombatant('p1', 'Trapped', 'room-1', true, { dodge: 20 });
    const creature = createCombatant('c1', 'Goblin', 'room-1', false);

    system.registerCombatant(player);
    system.registerCombatant(creature);
    system.initiateCombat('p1', 'c1');
    system.submitAction('p1', 'flee');

    const result = system.resolveTick();

    expect(result.fleeResults).toHaveLength(0);
    expect(result.events.some(e => e.type === 'flee' && e.narration.includes('no escape'))).toBe(true);
  });
});

describe('Immediate Combat End (no post-combat cooldown)', () => {
  let system: CombatSystem;
  const exits: ExitResolver = (roomId) => (roomId === 'room-1' ? ['room-2'] : []);

  beforeEach(() => {
    system = new CombatSystem(exits);
  });

  it('combat ends immediately when last enemy dies', () => {
    const player = createCombatant('p1', 'Warrior', 'room-1', true);
    const creature = createCombatant('c1', 'Goblin', 'room-1', false);
    creature.hp = 1; // One hit from death

    system.registerCombatant(player);
    system.registerCombatant(creature);
    system.initiateCombat('p1', 'c1');

    // Tick 1: Player strikes, creature dies — combat ends immediately
    const result1 = system.resolveTick();
    expect(result1.events.some(e => e.type === 'defeated' && e.actorId === 'c1')).toBe(true);
    expect(result1.events.some(e => e.type === 'combat_end')).toBe(true);
    expect(result1.endedEncounterIds).toHaveLength(1);
    expect(system.hasActiveEncounters()).toBe(false);
  });

  it('new aggro before combat ends keeps encounter alive', () => {
    const player = createCombatant('p1', 'Warrior', 'room-1', true);
    const creature1 = createCombatant('c1', 'Goblin', 'room-1', false);
    const creature2 = createCombatant('c2', 'Orc', 'room-1', false);
    creature1.hp = 1;

    system.registerCombatant(player);
    system.registerCombatant(creature1);
    system.registerCombatant(creature2);

    // Start combat with both creatures
    system.initiateCombat('p1', 'c1');
    system.initiateCombat('c2', 'p1');

    // Tick 1: Creature1 dies but creature2 is still alive — combat continues
    system.resolveTick();
    expect(system.hasActiveEncounters()).toBe(true);

    // Many ticks later, no combat_end since we have active combat
    for (let i = 0; i < 5; i++) {
      const r = system.resolveTick();
      expect(r.events.some(e => e.type === 'combat_end')).toBe(false);
    }
  });
});

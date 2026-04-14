import { describe, it, expect, beforeEach } from 'vitest';
import { CombatSystem } from '../combat/CombatSystem.js';
import {
  createCombatant,
  DEFAULT_PLAYER_STATS,
  type Combatant,
} from '../combat/CombatState.js';

// ─── Test Helpers ─────────────────────────────────────────────────────────

const TEST_ROOM = 'room-1';
const ADJACENT_ROOM = 'room-2';

function testExitResolver(roomId: string): string[] {
  if (roomId === TEST_ROOM) return [ADJACENT_ROOM];
  if (roomId === ADJACENT_ROOM) return [TEST_ROOM];
  return [];
}

function makePlayer(id: string, roomId = TEST_ROOM): Combatant {
  return createCombatant(id, id, roomId, true, DEFAULT_PLAYER_STATS);
}

function makeCreature(id: string, roomId = TEST_ROOM): Combatant {
  return createCombatant(id, id, roomId, false, DEFAULT_PLAYER_STATS);
}

// ─── Auto-Attack Tests ────────────────────────────────────────────────────

describe('Auto-Attack Baseline (GDD §6.1, §6.2)', () => {
  let system: CombatSystem;

  beforeEach(() => {
    system = new CombatSystem(testExitResolver);
  });

  it('initiates combat and sets attacker target to defender', () => {
    const player = makePlayer('player-1');
    const creature = makeCreature('creature-1');
    system.registerCombatant(player);
    system.registerCombatant(creature);

    const encId = system.initiateCombat(player.id, creature.id);
    expect(encId).toBeTruthy();

    const playerCombatant = system.getCombatant(player.id);
    expect(playerCombatant?.currentTarget).toBe(creature.id);
  });

  it('sets creature target to player when creature aggros', () => {
    const player = makePlayer('player-1');
    const creature = makeCreature('creature-1');
    system.registerCombatant(player);
    system.registerCombatant(creature);

    // Creature initiates combat (aggro)
    const encId = system.initiateCombat(creature.id, player.id);
    expect(encId).toBeTruthy();

    const creatureCombatant = system.getCombatant(creature.id);
    expect(creatureCombatant?.currentTarget).toBe(player.id);
  });

  it('defaults to auto-attack when no action submitted and target is alive', () => {
    const player = makePlayer('player-1');
    const creature = makeCreature('creature-1');
    system.registerCombatant(player);
    system.registerCombatant(creature);

    system.initiateCombat(player.id, creature.id);

    // Don't submit an action — should auto-attack
    const result = system.resolveTick();

    // Should have a strike event from player to creature
    const strikeEvent = result.events.find(
      e => e.type === 'strike' && e.actorId === player.id && e.targetId === creature.id
    );
    expect(strikeEvent).toBeTruthy();
  });

  it('auto-retargets next hostile when current target dies', () => {
    const player = makePlayer('player-1');
    const creature1 = makeCreature('creature-1');
    const creature2 = makeCreature('creature-2');
    system.registerCombatant(player);
    system.registerCombatant(creature1);
    system.registerCombatant(creature2);

    system.initiateCombat(player.id, creature1.id);
    system.initiateCombat(creature2.id, player.id); // Join encounter with second creature

    // First tick to clear initial queued actions
    system.resolveTick();

    // Now kill creature1 (player's current target)
    const creature1Combatant = system.getCombatant(creature1.id);
    if (creature1Combatant) {
      creature1Combatant.hp = 0;
    }

    // Second tick — player should auto-retarget to creature2 and strike
    const result = system.resolveTick();

    // Player should auto-attack creature2 (the remaining hostile)
    const strikeEvent = result.events.find(
      e => e.type === 'strike' && e.actorId === player.id && e.targetId === creature2.id
    );
    expect(strikeEvent).toBeTruthy();
  });

  it('defaults to idle when ALL hostiles are dead (no retarget possible)', () => {
    const player = makePlayer('player-1');
    const creature1 = makeCreature('creature-1');
    system.registerCombatant(player);
    system.registerCombatant(creature1);

    system.initiateCombat(player.id, creature1.id);

    // First tick
    system.resolveTick();

    // Kill the only creature
    const creature1Combatant = system.getCombatant(creature1.id);
    if (creature1Combatant) {
      creature1Combatant.hp = 0;
    }

    // Second tick — no hostiles remain, should idle (no strike target)
    const result = system.resolveTick();

    const strikeEvent = result.events.find(
      e => e.type === 'strike' && e.actorId === player.id
    );
    expect(strikeEvent).toBeFalsy();
  });

  it('auto-retargets when no target is set but hostiles exist', () => {
    const player = makePlayer('player-1');
    const creature = makeCreature('creature-1');
    system.registerCombatant(player);
    system.registerCombatant(creature);

    system.initiateCombat(player.id, creature.id);

    // First tick to clear initial queued actions
    system.resolveTick();

    // Clear the player's target (not the creature's, to keep encounter alive)
    const playerCombatant = system.getCombatant(player.id);
    if (playerCombatant) {
      playerCombatant.currentTarget = undefined;
    }

    // Second tick - should auto-retarget to the creature and strike
    const result = system.resolveTick();

    // Player should auto-retarget and strike the creature
    const strikeEvent = result.events.find(
      e => e.type === 'strike' && e.actorId === player.id && e.targetId === creature.id
    );
    expect(strikeEvent).toBeTruthy();

    // Creature should still auto-attack (it has a target)
    const creatureStrike = result.events.find(
      e => e.type === 'strike' && e.actorId === creature.id
    );
    expect(creatureStrike).toBeTruthy();
  });
});

// ─── Target Management Tests ──────────────────────────────────────────────

describe('Target Management (GDD §6.2)', () => {
  let system: CombatSystem;

  beforeEach(() => {
    system = new CombatSystem(testExitResolver);
  });

  it('setTarget changes current target', () => {
    const player = makePlayer('player-1');
    const creature1 = makeCreature('creature-1');
    const creature2 = makeCreature('creature-2');
    system.registerCombatant(player);
    system.registerCombatant(creature1);
    system.registerCombatant(creature2);

    system.initiateCombat(player.id, creature1.id);
    system.initiateCombat(creature2.id, player.id); // Join encounter

    const playerCombatant = system.getCombatant(player.id);
    expect(playerCombatant?.currentTarget).toBe(creature1.id);

    // Switch target
    const success = system.setTarget(player.id, creature2.id);
    expect(success).toBe(true);

    const updatedCombatant = system.getCombatant(player.id);
    expect(updatedCombatant?.currentTarget).toBe(creature2.id);
  });

  it('setTarget fails if not in combat', () => {
    const player = makePlayer('player-1');
    const creature = makeCreature('creature-1');
    system.registerCombatant(player);
    system.registerCombatant(creature);

    const success = system.setTarget(player.id, creature.id);
    expect(success).toBe(false);
  });

  it('setTarget fails if target not in same encounter', () => {
    const player = makePlayer('player-1');
    const creature1 = makeCreature('creature-1');
    const creature2 = makeCreature('creature-2', ADJACENT_ROOM);
    system.registerCombatant(player);
    system.registerCombatant(creature1);
    system.registerCombatant(creature2);

    system.initiateCombat(player.id, creature1.id);

    // Try to target creature in different room
    const success = system.setTarget(player.id, creature2.id);
    expect(success).toBe(false);
  });

  it('cycleTarget switches to next hostile', () => {
    const player = makePlayer('player-1');
    const creature1 = makeCreature('creature-1');
    const creature2 = makeCreature('creature-2');
    system.registerCombatant(player);
    system.registerCombatant(creature1);
    system.registerCombatant(creature2);

    system.initiateCombat(player.id, creature1.id);
    system.initiateCombat(creature2.id, player.id); // Join encounter

    const playerCombatant = system.getCombatant(player.id);
    expect(playerCombatant?.currentTarget).toBe(creature1.id);

    // Cycle to next
    const newTarget = system.cycleTarget(player.id);
    expect(newTarget).toBe(creature2.id);

    const updatedCombatant = system.getCombatant(player.id);
    expect(updatedCombatant?.currentTarget).toBe(creature2.id);
  });

  it('cycleTarget wraps around to first hostile', () => {
    const player = makePlayer('player-1');
    const creature1 = makeCreature('creature-1');
    const creature2 = makeCreature('creature-2');
    system.registerCombatant(player);
    system.registerCombatant(creature1);
    system.registerCombatant(creature2);

    system.initiateCombat(player.id, creature1.id);
    system.initiateCombat(creature2.id, player.id);

    // Set target to creature2
    system.setTarget(player.id, creature2.id);

    // Cycle from creature2 back to creature1
    const newTarget = system.cycleTarget(player.id);
    expect(newTarget).toBe(creature1.id);
  });

  it('cycleTarget picks first hostile when no current target', () => {
    const player = makePlayer('player-1');
    const creature1 = makeCreature('creature-1');
    system.registerCombatant(player);
    system.registerCombatant(creature1);

    system.initiateCombat(player.id, creature1.id);

    // Clear target
    const playerCombatant = system.getCombatant(player.id);
    if (playerCombatant) {
      playerCombatant.currentTarget = undefined;
    }

    // Cycle should pick first hostile
    const newTarget = system.cycleTarget(player.id);
    expect(newTarget).toBe(creature1.id);
  });

  it('getHostilesInEncounter returns only opposite faction', () => {
    const player = makePlayer('player-1');
    const creature1 = makeCreature('creature-1');
    const creature2 = makeCreature('creature-2');
    system.registerCombatant(player);
    system.registerCombatant(creature1);
    system.registerCombatant(creature2);

    system.initiateCombat(player.id, creature1.id);
    system.initiateCombat(creature2.id, player.id);

    const hostiles = system.getHostilesInEncounter(player.id);
    expect(hostiles.length).toBe(2);
    expect(hostiles.every(h => !h.isPlayer)).toBe(true);
  });

  it('getHostilesInEncounter excludes dead combatants', () => {
    const player = makePlayer('player-1');
    const creature1 = makeCreature('creature-1');
    const creature2 = makeCreature('creature-2');
    system.registerCombatant(player);
    system.registerCombatant(creature1);
    system.registerCombatant(creature2);

    system.initiateCombat(player.id, creature1.id);
    system.initiateCombat(creature2.id, player.id);

    // Kill creature1
    const creature1Combatant = system.getCombatant(creature1.id);
    if (creature1Combatant) {
      creature1Combatant.hp = 0;
    }

    const hostiles = system.getHostilesInEncounter(player.id);
    expect(hostiles.length).toBe(1);
    expect(hostiles[0]?.id).toBe(creature2.id);
  });
});

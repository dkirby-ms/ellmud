/**
 * Post-Death Combat Cleanup Tests — Bug #462
 *
 * When a player dies, the encounter should end if no hostile pairs remain.
 * Previously, resolveEncounterTick deleted dead combatants from the map,
 * then removeCombatant couldn't find the encounter to clean up.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CombatSystem } from '../combat/CombatSystem.js';
import { createCombatant, type Combatant } from '../combat/CombatState.js';

const stubExits = (_roomId: string) => ['room-2'];

function makePlayer(id: string, name: string, hp?: number): Combatant {
  const c = createCombatant(id, name, 'room-1', true, { attack: 5 });
  if (hp !== undefined) c.hp = hp;
  return c;
}

function makeCreature(id: string, name: string, hp?: number): Combatant {
  const c = createCombatant(`creature-${id}`, name, 'room-1', false, { attack: 200 });
  if (hp !== undefined) c.hp = hp;
  return c;
}

describe('Post-Death Combat Cleanup (Bug #462)', () => {
  let combat: CombatSystem;

  beforeEach(() => {
    // High roll = no dodge/block interference
    combat = new CombatSystem(stubExits, () => 0.99);
  });

  it('1v2: player dies → encounter ends immediately', () => {
    const player = makePlayer('player-1', 'Frodo', 1); // 1 HP — will die
    const creature1 = makeCreature('orc1', 'Orc Warrior');
    const creature2 = makeCreature('orc2', 'Orc Archer');

    combat.registerCombatant(player);
    combat.registerCombatant(creature1);
    combat.registerCombatant(creature2);
    combat.initiateCombat(player.id, creature1.id);
    combat.initiateCombat(creature2.id, player.id);

    // All attack each other
    combat.submitAction(creature1.id, { action: 'strike', targetId: player.id });
    combat.submitAction(creature2.id, { action: 'strike', targetId: player.id });
    combat.submitAction(player.id, { action: 'strike', targetId: creature1.id });

    const result = combat.resolveTick();

    // Player should be defeated
    expect(result.events.some(e => e.type === 'defeated' && e.actorId === player.id)).toBe(true);

    // Encounter should have ended — only creatures remain (same team)
    expect(result.endedEncounterIds.length).toBeGreaterThan(0);
    expect(result.events.some(e => e.type === 'combat_end')).toBe(true);

    // After tick, removeCombatant should cleanly handle the player
    // (it was already removed from combatantEncounter during tick)
    combat.removeCombatant(player.id);

    // Encounter should be fully cleaned up — no lingering state
    expect(combat['encounters'].size).toBe(0);
  });

  it('2v1: one player dies → encounter continues for surviving player', () => {
    const player1 = makePlayer('player-1', 'Frodo', 1); // 1 HP — will die
    const player2 = makePlayer('player-2', 'Sam', 500);
    const creature = makeCreature('orc', 'Orc', 500);

    combat.registerCombatant(player1);
    combat.registerCombatant(player2);
    combat.registerCombatant(creature);
    combat.initiateCombat(player1.id, creature.id);
    combat.initiateCombat(player2.id, creature.id);

    combat.submitAction(creature.id, { action: 'strike', targetId: player1.id });
    combat.submitAction(player1.id, { action: 'strike', targetId: creature.id });
    combat.submitAction(player2.id, { action: 'strike', targetId: creature.id });

    const result = combat.resolveTick();

    // Player 1 defeated
    expect(result.events.some(e => e.type === 'defeated' && e.actorId === player1.id)).toBe(true);

    // Encounter should NOT have ended — player2 vs creature still fighting
    expect(result.endedEncounterIds.length).toBe(0);

    // Clean up dead player
    combat.removeCombatant(player1.id);

    // Encounter still exists
    expect(combat['encounters'].size).toBe(1);
  });

  it('simultaneous KO → full cleanup', () => {
    const player = makePlayer('player-1', 'Frodo', 1);
    const creature = makeCreature('orc', 'Orc', 1);

    combat.registerCombatant(player);
    combat.registerCombatant(creature);
    combat.initiateCombat(player.id, creature.id);

    combat.submitAction(player.id, { action: 'strike', targetId: creature.id });
    combat.submitAction(creature.id, { action: 'strike', targetId: player.id });

    const result = combat.resolveTick();

    // Both defeated
    expect(result.events.filter(e => e.type === 'defeated')).toHaveLength(2);
    expect(result.endedEncounterIds.length).toBeGreaterThan(0);

    // Clean up both — should not throw
    combat.removeCombatant(player.id);
    combat.removeCombatant(creature.id);

    expect(combat['encounters'].size).toBe(0);
  });

  it('no more damage events target dead player after death', () => {
    const player = makePlayer('player-1', 'Frodo', 1);
    const creature1 = makeCreature('orc1', 'Orc Warrior');
    const creature2 = makeCreature('orc2', 'Orc Archer');

    combat.registerCombatant(player);
    combat.registerCombatant(creature1);
    combat.registerCombatant(creature2);
    combat.initiateCombat(player.id, creature1.id);
    combat.initiateCombat(creature2.id, player.id);

    // First tick: player dies
    combat.submitAction(creature1.id, { action: 'strike', targetId: player.id });
    combat.submitAction(creature2.id, { action: 'strike', targetId: player.id });
    combat.submitAction(player.id, { action: 'strike', targetId: creature1.id });

    const tick1 = combat.resolveTick();
    expect(tick1.events.some(e => e.type === 'defeated' && e.actorId === player.id)).toBe(true);
    expect(tick1.endedEncounterIds.length).toBeGreaterThan(0);

    // After encounter ends, removeCombatant should work cleanly
    combat.removeCombatant(player.id);

    // No encounter left to tick
    expect(combat['encounters'].size).toBe(0);
  });
});

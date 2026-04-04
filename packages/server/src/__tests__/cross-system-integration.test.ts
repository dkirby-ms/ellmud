/**
 * Cross-System Integration Tests
 *
 * Tests interactions between combat, movement, and the zone lifecycle.
 * These test scenarios that span multiple game systems simultaneously.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CombatSystem, createCombatant, DEFAULT_PLAYER_STATS } from '../combat/index.js';
import type { Combatant, CombatStats } from '../combat/CombatState.js';
import { handleCommand, type CommandContext } from '../commands/index.js';
import { PlayerState } from '../state/PlayerState.js';
import { createTestRoomGraph, type Room } from '../generator/RoomGraph.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

const TEST_ROOM = 'room-1';
const ADJACENT_ROOM = 'room-2';

function testExitResolver(roomId: string): string[] {
  if (roomId === TEST_ROOM) return [ADJACENT_ROOM];
  if (roomId === ADJACENT_ROOM) return [TEST_ROOM];
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

function buildContext(
  player: PlayerState,
  room: Room,
  args: string[],
  overrides: Partial<CommandContext> = {},
): CommandContext {
  const graph = createTestRoomGraph();
  return {
    player,
    room,
    args,
    resolveRoom: (roomId: string) => graph.rooms.get(roomId),
    otherPlayersInRoom: [],
    stability: 0.8,
    ...overrides,
  };
}

// ─── Combat System Edge Cases ───────────────────────────────────────────────

describe('Combat System Edge Cases', () => {
  let combat: CombatSystem;

  beforeEach(() => {
    combat = new CombatSystem(testExitResolver);
  });

  it('cannot initiate combat with unregistered combatants', () => {
    const result = combat.initiateCombat('ghost1', 'ghost2');
    expect(result).toBeNull();
  });

  it('cannot initiate combat between combatants in different rooms', () => {
    const p1 = makePlayer('p1', 'room-1');
    const p2 = makePlayer('p2', 'room-2');
    combat.registerCombatant(p1);
    combat.registerCombatant(p2);

    const result = combat.initiateCombat('p1', 'p2');
    expect(result).toBeNull();
  });

  it('two combatants fleeing simultaneously ends encounter', () => {
    const p1 = makePlayer('p1');
    const p2 = makePlayer('p2');
    combat.registerCombatant(p1);
    combat.registerCombatant(p2);
    combat.initiateCombat('p1', 'p2');

    // Both submit flee
    combat.submitAction('p1', 'flee');
    combat.submitAction('p2', 'flee');

    const result = combat.resolveTick();

    // Both should have fled
    const fleeEvents = result.events.filter((e) => e.type === 'flee');
    expect(fleeEvents.length).toBe(2);

    // Encounter should end
    expect(result.endedEncounterIds.length).toBeGreaterThan(0);
  });

  it('defeated combatant is removed from encounter', () => {
    // Create a very weak defender
    const p1 = makePlayer('p1', TEST_ROOM, { attack: 200 });
    const p2 = makePlayer('p2', TEST_ROOM, { maxHp: 1, armour: 0 });
    p2.hp = 1;
    combat.registerCombatant(p1);
    combat.registerCombatant(p2);
    combat.initiateCombat('p1', 'p2');

    const result = combat.resolveTick();

    // p2 should be defeated
    const defeated = result.events.filter((e) => e.type === 'defeated');
    expect(defeated.length).toBe(1);
    expect(defeated[0]!.actorId).toBe('p2');

    // p2 should no longer be in combat
    expect(combat.isInCombat('p2')).toBe(false);
  });

  it('removeCombatant during active combat ends encounter if only 1 left', () => {
    const p1 = makePlayer('p1');
    const p2 = makePlayer('p2');
    combat.registerCombatant(p1);
    combat.registerCombatant(p2);
    combat.initiateCombat('p1', 'p2');

    expect(combat.hasActiveEncounters()).toBe(true);

    // Simulate disconnect
    combat.removeCombatant('p2');

    expect(combat.isInCombat('p1')).toBe(false);
    expect(combat.hasActiveEncounters()).toBe(false);
  });

  it('submitting action when not in combat returns false', () => {
    const p1 = makePlayer('p1');
    combat.registerCombatant(p1);

    const result = combat.submitAction('p1', 'strike');
    expect(result).toBe(false);
  });

  it('three-way combat resolves simultaneously', () => {
    const p1 = makePlayer('p1');
    const p2 = makePlayer('p2');
    const p3 = makePlayer('p3');
    combat.registerCombatant(p1);
    combat.registerCombatant(p2);
    combat.registerCombatant(p3);

    // p1 attacks p2, p3 joins the encounter
    combat.initiateCombat('p1', 'p2');
    combat.initiateCombat('p3', 'p1');

    // All three should be in combat
    expect(combat.isInCombat('p1')).toBe(true);
    expect(combat.isInCombat('p2')).toBe(true);
    expect(combat.isInCombat('p3')).toBe(true);

    // Resolve a tick — default actions are dodge for those without input
    const result = combat.resolveTick();
    expect(result.events.length).toBeGreaterThan(0);
  });

  it('combat with a creature that has exactly 0 HP remaining is already defeated', () => {
    const player = makePlayer('p1');
    const creature = makeCreature('c1', TEST_ROOM, { maxHp: 8, armour: 0 });
    combat.registerCombatant(player);
    combat.registerCombatant(creature);
    combat.initiateCombat('p1', 'c1');

    // First tick: strike deals damage (creature defaults to dodge)
    // 10 * 0.5 - 0 = 5 damage, creature: 8 - 5 = 3 HP
    combat.resolveTick();
    expect(creature.hp).toBe(3);

    // Next tick: p1 strikes again
    combat.submitAction('p1', 'strike', 'c1');
    const tick2 = combat.resolveTick();
    expect(creature.hp).toBe(0);

    // Creature should be defeated
    const defeated = tick2.events.filter((e) => e.type === 'defeated');
    expect(defeated.length).toBe(1);
  });
});

// ─── Movement + Combat Integration ──────────────────────────────────────────

describe('Movement + Combat Integration', () => {
  it('player in combat can still use go (no combat command lock — documented as known issue)', () => {
    const combat = new CombatSystem(testExitResolver);
    const graph = createTestRoomGraph();
    const entryRoom = graph.rooms.get('entry')!;
    const player = new PlayerState('p1', 'entry');

    // Register player and creature in combat
    const playerCombatant = makePlayer('p1', 'entry');
    const creature = makeCreature('mob1', 'entry');
    combat.registerCombatant(playerCombatant);
    combat.registerCombatant(creature);
    combat.initiateCombat('mob1', 'p1');

    const ctx = buildContext(player, entryRoom, ['north'], {
      combatSystem: combat,
    });

    // Go should work since combat doesn't directly block movement (known issue #1)
    const result = handleCommand('go', ctx);
    expect(result.narrations.length).toBeGreaterThan(0);
  });

  it('circular path navigation (A→B→C→A) works correctly', () => {
    const graph = createTestRoomGraph();
    const player = new PlayerState('p1', 'entry');

    // entry → north → corridor
    const ctx1 = buildContext(player, graph.rooms.get('entry')!, ['north']);
    const result1 = handleCommand('go', ctx1);
    player.currentRoomId = 'corridor';
    expect(result1.narrations.length).toBeGreaterThan(0);

    // corridor → west → crypt
    const ctx2 = buildContext(player, graph.rooms.get('corridor')!, ['west']);
    const result2 = handleCommand('go', ctx2);
    player.currentRoomId = 'crypt';
    expect(result2.narrations.length).toBeGreaterThan(0);

    // crypt → east → corridor → south → entry
    const ctx3 = buildContext(player, graph.rooms.get('crypt')!, ['east']);
    const result3 = handleCommand('go', ctx3);
    player.currentRoomId = 'corridor';
    expect(result3.narrations.length).toBeGreaterThan(0);

    const ctx4 = buildContext(player, graph.rooms.get('corridor')!, ['south']);
    const result4 = handleCommand('go', ctx4);
    player.currentRoomId = 'entry';
    expect(result4.narrations.length).toBeGreaterThan(0);
  });

  it('dead-end room navigation only has one exit', () => {
    const graph = createTestRoomGraph();
    // Shrine is a dead-end (only exit: south → corridor)
    const shrine = graph.rooms.get('shrine')!;
    expect(shrine.exits.size).toBe(1);

    const player = new PlayerState('p1', 'shrine');
    const ctx = buildContext(player, shrine, ['south']);
    const result = handleCommand('go', ctx);
    expect(result.narrations.length).toBeGreaterThan(0);
  });

  it('invalid direction produces error narration', () => {
    const graph = createTestRoomGraph();
    const shrine = graph.rooms.get('shrine')!;
    const player = new PlayerState('p1', 'shrine');

    const ctx = buildContext(player, shrine, ['north']);
    const result = handleCommand('go', ctx);
    expect(result.narrations[0]!.type).toBe('system');
  });
});

// ─── PlayerState Edge Cases ─────────────────────────────────────────────────

describe('PlayerState Edge Cases', () => {
  it('weight exactly at limit allows item pickup', () => {
    const player = new PlayerState('p1', 'entry', 5);
    const item = { id: 'sword', name: 'sword', weight: 5, description: 'A sword' };
    expect(player.canCarry(item)).toBe(true);
    expect(player.addItem(item)).toBe(true);
    expect(player.currentWeight).toBe(5);
  });

  it('weight over limit rejects item pickup', () => {
    const player = new PlayerState('p1', 'entry', 5);
    const item = { id: 'anvil', name: 'anvil', weight: 6, description: 'Too heavy' };
    expect(player.canCarry(item)).toBe(false);
    expect(player.addItem(item)).toBe(false);
  });

  it('multiple small items that exactly reach weight limit', () => {
    const player = new PlayerState('p1', 'entry', 10);
    for (let i = 0; i < 10; i++) {
      const item = { id: `item-${i}`, name: `item ${i}`, weight: 1, description: 'Small' };
      expect(player.addItem(item)).toBe(true);
    }
    expect(player.currentWeight).toBe(10);

    // One more should fail
    const extra = { id: 'extra', name: 'extra', weight: 1, description: 'One too many' };
    expect(player.addItem(extra)).toBe(false);
  });

  it('removing non-existent item returns null', () => {
    const player = new PlayerState('p1', 'entry');
    expect(player.removeItem('nothing')).toBeNull();
  });

  it('findItem returns null for empty inventory', () => {
    const player = new PlayerState('p1', 'entry');
    expect(player.findItem('anything')).toBeNull();
  });

  it('findItem matches by partial name', () => {
    const player = new PlayerState('p1', 'entry');
    const item = { id: 'rusty-sword', name: 'rusty sword', weight: 3, description: 'A rusty sword' };
    player.addItem(item);

    expect(player.findItem('rusty')).not.toBeNull();
    expect(player.findItem('sword')).not.toBeNull();
    expect(player.findItem('RUSTY')).not.toBeNull(); // case-insensitive
  });

  it('stacking items increases quantity, not entries', () => {
    const player = new PlayerState('p1', 'entry', 100);
    const item = { id: 'arrow', name: 'arrow', weight: 0.1, description: 'An arrow' };

    player.addItem(item);
    player.addItem(item);
    player.addItem(item);

    const entry = player.inventory.get('arrow');
    expect(entry).toBeDefined();
    expect(entry!.quantity).toBe(3);
    expect(player.inventory.size).toBe(1);
  });

  it('removing stacked item decreases quantity', () => {
    const player = new PlayerState('p1', 'entry', 100);
    const item = { id: 'arrow', name: 'arrow', weight: 0.1, description: 'An arrow' };
    player.addItem(item);
    player.addItem(item);
    player.addItem(item);

    player.removeItem('arrow');
    expect(player.inventory.get('arrow')!.quantity).toBe(2);

    player.removeItem('arrow');
    expect(player.inventory.get('arrow')!.quantity).toBe(1);

    player.removeItem('arrow');
    expect(player.inventory.has('arrow')).toBe(false);
  });
});

/**
 * combat-state-message.test.ts — Tests for COMBAT_STATE message (Issue #467 Phase A)
 *
 * Validates that CombatSystem can produce a combatant snapshot suitable for
 * broadcasting to clients each tick. The COMBAT_STATE message is unicast per
 * player (not broadcast) per decision log.
 *
 * These tests are written proactively; implementation may require adjustment
 * once Jarlaxle lands the server-side COMBAT_STATE emitter.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CombatSystem } from '../combat/CombatSystem.js';
import {
  createCombatant,
  type Combatant,
} from '../combat/CombatState.js';

// ─── Test Helpers ─────────────────────────────────────────────────────────────

const TEST_ROOM = 'room-1';

function stubExits(_roomId: string): string[] {
  return ['room-2'];
}

function _noExits(_roomId: string): string[] {
  return [];
}

function makePlayer(
  id: string,
  name: string,
  roomId = TEST_ROOM,
  opts?: { maxHp?: number; attack?: number },
): Combatant {
  return createCombatant(id, name, roomId, true, opts);
}

function makeCreature(
  id: string,
  name: string,
  roomId = TEST_ROOM,
  opts?: { maxHp?: number; attack?: number },
): Combatant {
  return createCombatant(id, name, roomId, false, opts);
}

/**
 * Build a COMBAT_STATE snapshot from the CombatSystem for a given player.
 *
 * This helper mirrors the contract Jarlaxle will implement in
 * ZoneRoom.deliverCombatResults(). If the final implementation changes shape,
 * update this helper accordingly.
 */
function buildCombatStateForPlayer(
  combat: CombatSystem,
  playerId: string,
): CombatStateSnapshot | null {
  const encounter = combat.getEncounterForCombatant(playerId);
  if (!encounter) return null;

  const combatants: CombatantEntry[] = [];
  for (const cid of encounter.combatantIds) {
    const c = combat.getCombatant(cid);
    if (!c) continue;
    combatants.push({
      id: c.id,
      name: c.name,
      hp: c.hp,
      maxHp: c.maxHp,
      isPlayer: c.isPlayer,
      status: c.hp <= 0 ? 'dead' : 'alive',
    });
  }

  return { combatants };
}

interface CombatantEntry {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  isPlayer: boolean;
  status: 'alive' | 'dead';
}

interface CombatStateSnapshot {
  combatants: CombatantEntry[];
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('COMBAT_STATE message contract', () => {
  let combat: CombatSystem;

  beforeEach(() => {
    // Default roll () => 1 always fails dodge/block (per team memory)
    combat = new CombatSystem(stubExits);
  });

  // ── Broadcast on combat start ───────────────────────────────────────────

  it('produces a non-null snapshot when combat is active', () => {
    const player = makePlayer('p1', 'Hero');
    const creature = makeCreature('c1', 'Goblin');

    combat.registerCombatant(player);
    combat.registerCombatant(creature);
    combat.initiateCombat('p1', 'c1');

    const snapshot = buildCombatStateForPlayer(combat, 'p1');
    expect(snapshot).toBeDefined();
    expect(snapshot).not.toBeNull();
  });

  it('returns null snapshot when player is not in combat', () => {
    const player = makePlayer('p1', 'Hero');
    combat.registerCombatant(player);

    const snapshot = buildCombatStateForPlayer(combat, 'p1');
    expect(snapshot).toBeNull();
  });

  // ── Correct combatant fields ────────────────────────────────────────────

  it('includes all combatants with correct fields', () => {
    const player = makePlayer('p1', 'Hero', TEST_ROOM, { maxHp: 120 });
    const creature = makeCreature('c1', 'Goblin', TEST_ROOM, { maxHp: 50 });

    combat.registerCombatant(player);
    combat.registerCombatant(creature);
    combat.initiateCombat('p1', 'c1');

    const snapshot = buildCombatStateForPlayer(combat, 'p1');
    expect(snapshot).not.toBeNull();
    expect(snapshot!.combatants).toHaveLength(2);

    const playerEntry = snapshot!.combatants.find((c) => c.id === 'p1');
    expect(playerEntry).toBeDefined();
    expect(playerEntry!.name).toBe('Hero');
    expect(playerEntry!.hp).toBe(120);
    expect(playerEntry!.maxHp).toBe(120);
    expect(playerEntry!.isPlayer).toBe(true);
    expect(playerEntry!.status).toBe('alive');

    const creatureEntry = snapshot!.combatants.find((c) => c.id === 'c1');
    expect(creatureEntry).toBeDefined();
    expect(creatureEntry!.name).toBe('Goblin');
    expect(creatureEntry!.hp).toBe(50);
    expect(creatureEntry!.maxHp).toBe(50);
    expect(creatureEntry!.isPlayer).toBe(false);
    expect(creatureEntry!.status).toBe('alive');
  });

  // ── HP changes reflected each tick ──────────────────────────────────────

  it('reflects HP changes after a combat tick', () => {
    const player = makePlayer('p1', 'Hero', TEST_ROOM, { maxHp: 100 });
    const creature = makeCreature('c1', 'Goblin', TEST_ROOM, { maxHp: 100 });

    combat.registerCombatant(player);
    combat.registerCombatant(creature);
    combat.initiateCombat('p1', 'c1');

    // Snapshot before any tick — both at full HP
    const before = buildCombatStateForPlayer(combat, 'p1');
    expect(before).not.toBeNull();
    const creatureBefore = before!.combatants.find((c) => c.id === 'c1');
    expect(creatureBefore).toBeDefined();
    expect(creatureBefore!.hp).toBe(100);

    // Run a tick — both auto-strike, both take damage
    combat.resolveTick();

    const after = buildCombatStateForPlayer(combat, 'p1');
    expect(after).not.toBeNull();
    const creatureAfter = after!.combatants.find((c) => c.id === 'c1');
    expect(creatureAfter).toBeDefined();
    expect(creatureAfter!.hp).toBeLessThan(100);
  });

  // ── Snapshot stops when combat ends ─────────────────────────────────────

  it('returns null after combat ends (creature defeated)', () => {
    const player = makePlayer('p1', 'Hero', TEST_ROOM, { maxHp: 200, attack: 200 });
    const creature = makeCreature('c1', 'Goblin', TEST_ROOM, { maxHp: 10 });

    combat.registerCombatant(player);
    combat.registerCombatant(creature);
    combat.initiateCombat('p1', 'c1');

    // High attack should kill the creature in one tick
    combat.resolveTick();

    const snapshot = buildCombatStateForPlayer(combat, 'p1');
    expect(snapshot).toBeNull();
  });

  // ── Dead combatants are removed from encounter ──────────────────────────

  it('defeated combatant is removed from the encounter combatant set', () => {
    // NOTE: CombatSystem cleans up defeated combatants from the encounter
    // during tick resolution. The COMBAT_STATE implementation will need to
    // either snapshot BEFORE cleanup or attach defeated info from tick events.
    const player = makePlayer('p1', 'Hero', TEST_ROOM, { maxHp: 200, attack: 200 });
    const c1 = makeCreature('c1', 'Goblin A', TEST_ROOM, { maxHp: 10 });
    const c2 = makeCreature('c2', 'Goblin B', TEST_ROOM, { maxHp: 200 });

    combat.registerCombatant(player);
    combat.registerCombatant(c1);
    combat.registerCombatant(c2);
    combat.initiateCombat('p1', 'c1');
    combat.initiateCombat('c2', 'p1');

    // Player targets c1 (low HP) — should die in one tick
    const result = combat.resolveTick();

    // Encounter should still be active because c2 is alive
    expect(combat.isInCombat('p1')).toBe(true);

    // The tick result includes a 'defeated' event for c1
    const defeatedEvent = result.events.find(
      (e) => e.type === 'defeated' && e.actorId === 'c1',
    );
    expect(defeatedEvent).toBeDefined();

    // After tick, c1 is no longer in the encounter's combatant list
    const snapshot = buildCombatStateForPlayer(combat, 'p1');
    expect(snapshot).not.toBeNull();
    const c1Entry = snapshot!.combatants.find((c) => c.id === 'c1');
    // c1 is absent from the live snapshot — CombatSystem cleaned it up
    expect(c1Entry).toBeUndefined();

    // c2 remains alive in the encounter
    const c2Entry = snapshot!.combatants.find((c) => c.id === 'c2');
    expect(c2Entry).toBeDefined();
    expect(c2Entry!.status).toBe('alive');
  });

  it('COMBAT_STATE implementation should include defeated combatants from tick events', () => {
    // This documents the contract: when building the full COMBAT_STATE message,
    // Jarlaxle should merge defeated combatants from TickResult.events into
    // the snapshot so the client can show death animations / status.
    const player = makePlayer('p1', 'Hero', TEST_ROOM, { maxHp: 200, attack: 200 });
    const c1 = makeCreature('c1', 'Goblin A', TEST_ROOM, { maxHp: 10 });
    const c2 = makeCreature('c2', 'Goblin B', TEST_ROOM, { maxHp: 200 });

    combat.registerCombatant(player);
    combat.registerCombatant(c1);
    combat.registerCombatant(c2);
    combat.initiateCombat('p1', 'c1');
    combat.initiateCombat('c2', 'p1');

    const result = combat.resolveTick();

    // Extract defeated combatant info from tick events
    const defeatedIds = result.events
      .filter((e) => e.type === 'defeated')
      .map((e) => e.actorId);

    expect(defeatedIds).toContain('c1');

    // The real COMBAT_STATE builder should merge these into the snapshot
    // with status: 'dead'. For now, just verify the tick provides the data.
    const defeatedEvent = result.events.find(
      (e) => e.type === 'defeated' && e.actorId === 'c1',
    );
    expect(defeatedEvent).toBeDefined();
    expect(defeatedEvent!.actorName).toBe('Goblin A');
  });

  // ── Mid-fight join ──────────────────────────────────────────────────────

  it('includes combatant that joins mid-fight', () => {
    const player = makePlayer('p1', 'Hero');
    const c1 = makeCreature('c1', 'Goblin A');

    combat.registerCombatant(player);
    combat.registerCombatant(c1);
    combat.initiateCombat('p1', 'c1');

    // Tick once with 2 combatants
    combat.resolveTick();

    let snapshot = buildCombatStateForPlayer(combat, 'p1');
    expect(snapshot).not.toBeNull();
    expect(snapshot!.combatants).toHaveLength(2);

    // New creature joins mid-fight
    const c2 = makeCreature('c2', 'Goblin B');
    combat.registerCombatant(c2);
    combat.initiateCombat('c2', 'p1');

    snapshot = buildCombatStateForPlayer(combat, 'p1');
    expect(snapshot).not.toBeNull();
    expect(snapshot!.combatants).toHaveLength(3);

    const newEntry = snapshot!.combatants.find((c) => c.id === 'c2');
    expect(newEntry).toBeDefined();
    expect(newEntry!.name).toBe('Goblin B');
    expect(newEntry!.status).toBe('alive');
  });

  // ── Multiple players see the same encounter ─────────────────────────────

  it('both players in the same encounter get the full combatant list', () => {
    const p1 = makePlayer('p1', 'Hero');
    const p2 = makePlayer('p2', 'Sidekick');
    const creature = makeCreature('c1', 'Orc');

    combat.registerCombatant(p1);
    combat.registerCombatant(p2);
    combat.registerCombatant(creature);
    combat.initiateCombat('p1', 'c1');
    combat.initiateCombat('p2', 'c1');

    const s1 = buildCombatStateForPlayer(combat, 'p1');
    const s2 = buildCombatStateForPlayer(combat, 'p2');

    expect(s1).not.toBeNull();
    expect(s2).not.toBeNull();
    expect(s1!.combatants).toHaveLength(3);
    expect(s2!.combatants).toHaveLength(3);
  });

  // ── Snapshot is unicast per player (separate encounters) ────────────────

  it('players in separate encounters get isolated snapshots', () => {
    // Two separate rooms, two separate encounters
    const p1 = makePlayer('p1', 'Hero', 'room-1');
    const c1 = makeCreature('c1', 'Goblin', 'room-1');
    const p2 = makePlayer('p2', 'Sidekick', 'room-2');
    const c2 = makeCreature('c2', 'Orc', 'room-2');

    combat.registerCombatant(p1);
    combat.registerCombatant(c1);
    combat.registerCombatant(p2);
    combat.registerCombatant(c2);
    combat.initiateCombat('p1', 'c1');
    combat.initiateCombat('p2', 'c2');

    const s1 = buildCombatStateForPlayer(combat, 'p1');
    const s2 = buildCombatStateForPlayer(combat, 'p2');

    expect(s1).not.toBeNull();
    expect(s2).not.toBeNull();
    expect(s1!.combatants).toHaveLength(2);
    expect(s2!.combatants).toHaveLength(2);

    const s1Ids = s1!.combatants.map((c) => c.id).sort();
    const s2Ids = s2!.combatants.map((c) => c.id).sort();
    expect(s1Ids).toEqual(['c1', 'p1']);
    expect(s2Ids).toEqual(['c2', 'p2']);
  });

  // ── Flee ends snapshot for the fleeing player ───────────────────────────

  it('returns null for player who successfully fled', () => {
    const player = makePlayer('p1', 'Hero');
    const creature = makeCreature('c1', 'Goblin');

    // Use roll=0 so flee always succeeds
    combat = new CombatSystem(stubExits, () => 0);
    combat.registerCombatant(player);
    combat.registerCombatant(creature);
    combat.initiateCombat('p1', 'c1');
    combat.submitAction('p1', 'flee');
    combat.resolveTick();

    const snapshot = buildCombatStateForPlayer(combat, 'p1');
    expect(snapshot).toBeNull();
  });
});

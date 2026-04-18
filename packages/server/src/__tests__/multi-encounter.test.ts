import { describe, test, expect, beforeEach } from 'vitest';
import { CombatSystem } from '../combat/CombatSystem.js';
import {
  createCombatant,
  DEFAULT_PLAYER_STATS,
  COMBAT_TIMEOUT_TICKS,
  type Combatant,
  type CombatStats,
} from '../combat/CombatState.js';

// ─── Multi-Encounter Combat Tests ─────────────────────────────────────────
//
// TDD skeleton for the combat encounter redesign.
// Each test.todo() defines expected behavior for multi-encounter support.
// Implementation makes these pass.
//
// Conventions:
//   - CombatSystem default roll fn is () => 1 (always fails dodge/block)
//   - Use () => 0 to always succeed dodge/block
//   - Never use `!` non-null assertions — use expect chains
//   - Never use conditional guards (if/else) around assertions
//   - Import real implementations, never redefine local stubs with different formulas

// ─── Test Helpers ─────────────────────────────────────────────────────────

const TEST_ROOM = 'room-1';
const ADJACENT_ROOM = 'room-2';

function testExitResolver(roomId: string): string[] {
  if (roomId === TEST_ROOM) return [ADJACENT_ROOM];
  if (roomId === ADJACENT_ROOM) return [TEST_ROOM];
  return [];
}

function noExitResolver(_roomId: string): string[] {
  return [];
}

function makePlayer(id: string, roomId = TEST_ROOM, stats?: Partial<CombatStats>): Combatant {
  const merged = { ...DEFAULT_PLAYER_STATS, ...stats };
  return createCombatant(id, id, roomId, true, {
    attack: merged.unarmed,
    maxHp: merged.maxHp,
    armour: merged.armour,
    shieldBlock: merged.shieldBlock,
    dodge: merged.dodge,
  });
}

function makeCreature(id: string, roomId = TEST_ROOM, stats?: Partial<CombatStats>): Combatant {
  const merged = { ...DEFAULT_PLAYER_STATS, ...stats };
  return createCombatant(id, id, roomId, false, {
    attack: merged.unarmed,
    maxHp: merged.maxHp,
    armour: merged.armour,
    shieldBlock: merged.shieldBlock,
    dodge: merged.dodge,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// A. CORE MULTI-ENCOUNTER
// ═══════════════════════════════════════════════════════════════════════════

describe('Core Multi-Encounter', () => {
  let system: CombatSystem;

  beforeEach(() => {
    system = new CombatSystem(testExitResolver);
  });

  test('two independent fights in same room — P1 vs C1 and P2 vs C2 produce separate encounters', () => {
    const p1 = makePlayer('p1');
    const p2 = makePlayer('p2');
    const c1 = makeCreature('c1');
    const c2 = makeCreature('c2');
    system.registerCombatant(p1);
    system.registerCombatant(p2);
    system.registerCombatant(c1);
    system.registerCombatant(c2);

    const encIdA = system.initiateCombat('p1', 'c1');
    const encIdB = system.initiateCombat('p2', 'c2');

    expect(encIdA).toBeDefined();
    expect(encIdB).toBeDefined();
    expect(encIdA).not.toBe(encIdB);

    // Each combatant is in their own encounter
    const encA = system.getEncounterForCombatant('p1');
    const encB = system.getEncounterForCombatant('p2');
    expect(encA).toBeDefined();
    expect(encB).toBeDefined();
    expect(encA?.id).toBe(encIdA);
    expect(encB?.id).toBe(encIdB);

    // c1 is in encounter A, c2 is in encounter B
    expect(system.getEncounterForCombatant('c1')?.id).toBe(encIdA);
    expect(system.getEncounterForCombatant('c2')?.id).toBe(encIdB);

    // Room should have 2 encounters
    const roomEncounters = system.findEncountersInRoom(TEST_ROOM);
    expect(roomEncounters).toHaveLength(2);
  });

  test('third player joins existing encounter by attacking creature already in it', () => {
    const p1 = makePlayer('p1');
    const p2 = makePlayer('p2');
    const c1 = makeCreature('c1');
    system.registerCombatant(p1);
    system.registerCombatant(p2);
    system.registerCombatant(c1);

    const encIdA = system.initiateCombat('p1', 'c1');
    const encIdB = system.initiateCombat('p2', 'c1');

    // p2 attacked c1 who is already in encounter A → p2 joins encounter A
    expect(encIdB).toBe(encIdA);

    const enc = system.getEncounterForCombatant('p2');
    expect(enc).toBeDefined();
    expect(enc?.id).toBe(encIdA);
    expect(enc?.combatantIds.has('p1')).toBe(true);
    expect(enc?.combatantIds.has('p2')).toBe(true);
    expect(enc?.combatantIds.has('c1')).toBe(true);
  });

  test('player attacks creature in different encounter than groupmate — creates separate encounter', () => {
    const p1 = makePlayer('p1');
    const p2 = makePlayer('p2');
    const c1 = makeCreature('c1');
    const c2 = makeCreature('c2');
    system.registerCombatant(p1);
    system.registerCombatant(p2);
    system.registerCombatant(c1);
    system.registerCombatant(c2);

    const encIdA = system.initiateCombat('p1', 'c1');
    // p2 attacks c2 (not in p1's encounter) → separate encounter
    const encIdB = system.initiateCombat('p2', 'c2');

    expect(encIdA).not.toBe(encIdB);
    expect(system.getEncounterForCombatant('p1')?.id).toBe(encIdA);
    expect(system.getEncounterForCombatant('p2')?.id).toBe(encIdB);
  });

  test('encounter isolation: damage in encounter A does not affect encounter B', () => {
    // High attack to make damage obvious
    const p1 = makePlayer('p1', TEST_ROOM, { unarmed: 20 });
    const c1 = makeCreature('c1', TEST_ROOM, { maxHp: 100 });
    const p2 = makePlayer('p2');
    const c2 = makeCreature('c2', TEST_ROOM, { maxHp: 100 });
    system.registerCombatant(p1);
    system.registerCombatant(c1);
    system.registerCombatant(p2);
    system.registerCombatant(c2);

    system.initiateCombat('p1', 'c1');
    system.initiateCombat('p2', 'c2');

    // Record HP before tick
    const c2HpBefore = c2.hp;

    // p1 auto-attacks c1. p2 auto-attacks c2 with default stats (low damage).
    system.resolveTick();

    // c1 should have taken damage from p1's high attack
    expect(c1.hp).toBeLessThan(100);

    // c2 should only have taken damage from p2 (default stats), not from p1
    // p2 attack=5, c2 armour=2 → 5-2=3 damage (or 0 if auto-attack cooldown)
    // Key assertion: c2 did NOT take p1's high-damage strike
    expect(c2.hp).toBeGreaterThan(c1.hp);
    expect(c2.hp).toBe(c2HpBefore - 3); // default strike: 5 atk - 2 armour = 3
  });

  test('encounter isolation: defeat in encounter A does not end encounter B', () => {
    // c1 has 1 HP — will die immediately
    const p1 = makePlayer('p1', TEST_ROOM, { unarmed: 10 });
    const c1 = makeCreature('c1', TEST_ROOM, { maxHp: 1 });
    const p2 = makePlayer('p2');
    const c2 = makeCreature('c2', TEST_ROOM, { maxHp: 100 });
    system.registerCombatant(p1);
    system.registerCombatant(c1);
    system.registerCombatant(p2);
    system.registerCombatant(c2);

    const encIdA = system.initiateCombat('p1', 'c1');
    const encIdB = system.initiateCombat('p2', 'c2');

    const result = system.resolveTick();

    // Encounter A should have ended (c1 defeated)
    expect(result.endedEncounterIds).toContain(encIdA);

    // Encounter B should still be active
    expect(result.endedEncounterIds).not.toContain(encIdB);
    expect(system.isInCombat('p2')).toBe(true);
    expect(system.isInCombat('c2')).toBe(true);
  });

  test('room has 3+ simultaneous encounters — each ticks independently', () => {
    const p1 = makePlayer('p1');
    const p2 = makePlayer('p2');
    const p3 = makePlayer('p3');
    const c1 = makeCreature('c1', TEST_ROOM, { maxHp: 100 });
    const c2 = makeCreature('c2', TEST_ROOM, { maxHp: 100 });
    const c3 = makeCreature('c3', TEST_ROOM, { maxHp: 100 });
    system.registerCombatant(p1);
    system.registerCombatant(p2);
    system.registerCombatant(p3);
    system.registerCombatant(c1);
    system.registerCombatant(c2);
    system.registerCombatant(c3);

    const encIdA = system.initiateCombat('p1', 'c1');
    const encIdB = system.initiateCombat('p2', 'c2');
    const encIdC = system.initiateCombat('p3', 'c3');

    // All three encounters are distinct
    expect(new Set([encIdA, encIdB, encIdC]).size).toBe(3);

    // Room has 3 encounters
    const roomEncounters = system.findEncountersInRoom(TEST_ROOM);
    expect(roomEncounters).toHaveLength(3);

    // Tick once — all three encounters should advance
    system.resolveTick();

    const encA = system.getEncounterForCombatant('p1');
    const encB = system.getEncounterForCombatant('p2');
    const encC = system.getEncounterForCombatant('p3');
    expect(encA?.tickCount).toBe(1);
    expect(encB?.tickCount).toBe(1);
    expect(encC?.tickCount).toBe(1);

    // Each creature took damage only from its respective player
    expect(c1.hp).toBeLessThan(100);
    expect(c2.hp).toBeLessThan(100);
    expect(c3.hp).toBeLessThan(100);
    // All took the same damage (same default stats)
    expect(c1.hp).toBe(c2.hp);
    expect(c2.hp).toBe(c3.hp);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// B. ENCOUNTER JOINING LOGIC
// ═══════════════════════════════════════════════════════════════════════════

describe('Encounter Joining Logic', () => {
  let system: CombatSystem;

  beforeEach(() => {
    system = new CombatSystem(testExitResolver);
  });

  test('attacker already in encounter → target joins attacker encounter', () => {
    const p1 = makePlayer('p1');
    const c1 = makeCreature('c1');
    const c2 = makeCreature('c2');
    system.registerCombatant(p1);
    system.registerCombatant(c1);
    system.registerCombatant(c2);

    // p1 starts encounter with c1
    const encId = system.initiateCombat('p1', 'c1');
    expect(encId).toBeDefined();

    // p1 (already in encounter) attacks c2 → c2 joins p1's encounter
    const encId2 = system.initiateCombat('p1', 'c2');
    expect(encId2).toBe(encId);

    const enc = system.getEncounterForCombatant('c2');
    expect(enc).toBeDefined();
    expect(enc?.id).toBe(encId);
    expect(enc?.combatantIds.has('p1')).toBe(true);
    expect(enc?.combatantIds.has('c1')).toBe(true);
    expect(enc?.combatantIds.has('c2')).toBe(true);
  });

  test('target already in encounter → attacker joins target encounter', () => {
    const p1 = makePlayer('p1');
    const p2 = makePlayer('p2');
    const c1 = makeCreature('c1');
    system.registerCombatant(p1);
    system.registerCombatant(p2);
    system.registerCombatant(c1);

    // p1 starts encounter with c1
    const encId = system.initiateCombat('p1', 'c1');

    // p2 (not in combat) attacks c1 (already in encounter) → p2 joins c1's encounter
    const encId2 = system.initiateCombat('p2', 'c1');
    expect(encId2).toBe(encId);

    const enc = system.getEncounterForCombatant('p2');
    expect(enc).toBeDefined();
    expect(enc?.id).toBe(encId);
    expect(enc?.combatantIds.has('p1')).toBe(true);
    expect(enc?.combatantIds.has('p2')).toBe(true);
    expect(enc?.combatantIds.has('c1')).toBe(true);
  });

  test('neither in encounter → new encounter created (backward compat)', () => {
    const p1 = makePlayer('p1');
    const c1 = makeCreature('c1');
    system.registerCombatant(p1);
    system.registerCombatant(c1);

    expect(system.isInCombat('p1')).toBe(false);
    expect(system.isInCombat('c1')).toBe(false);

    const encId = system.initiateCombat('p1', 'c1');
    expect(encId).toBeDefined();
    expect(system.isInCombat('p1')).toBe(true);
    expect(system.isInCombat('c1')).toBe(true);

    const enc = system.getEncounterForCombatant('p1');
    expect(enc).toBeDefined();
    expect(enc?.combatantIds.size).toBe(2);
    expect(enc?.combatantIds.has('p1')).toBe(true);
    expect(enc?.combatantIds.has('c1')).toBe(true);
  });

  test('both already in SAME encounter → no change (idempotent)', () => {
    const p1 = makePlayer('p1');
    const c1 = makeCreature('c1');
    system.registerCombatant(p1);
    system.registerCombatant(c1);

    const encId = system.initiateCombat('p1', 'c1');

    // Initiate again between same combatants
    const encId2 = system.initiateCombat('p1', 'c1');
    expect(encId2).toBe(encId);

    // Still only one encounter with the same two members
    const enc = system.getEncounterForCombatant('p1');
    expect(enc).toBeDefined();
    expect(enc?.combatantIds.size).toBe(2);

    const roomEncounters = system.findEncountersInRoom(TEST_ROOM);
    expect(roomEncounters).toHaveLength(1);
  });

  test('both in DIFFERENT encounters → encounters merge into one', () => {
    const p1 = makePlayer('p1');
    const p2 = makePlayer('p2');
    const c1 = makeCreature('c1');
    const c2 = makeCreature('c2');
    system.registerCombatant(p1);
    system.registerCombatant(p2);
    system.registerCombatant(c1);
    system.registerCombatant(c2);

    const encIdA = system.initiateCombat('p1', 'c1');
    const encIdB = system.initiateCombat('p2', 'c2');
    expect(encIdA).not.toBe(encIdB);

    // p1 attacks p2 — both are in different encounters → merge
    const mergedEncId = system.initiateCombat('p1', 'p2');
    expect(mergedEncId).toBeDefined();

    // All four combatants should now be in the same encounter
    const encP1 = system.getEncounterForCombatant('p1');
    const encP2 = system.getEncounterForCombatant('p2');
    const encC1 = system.getEncounterForCombatant('c1');
    const encC2 = system.getEncounterForCombatant('c2');
    expect(encP1?.id).toBe(mergedEncId);
    expect(encP2?.id).toBe(mergedEncId);
    expect(encC1?.id).toBe(mergedEncId);
    expect(encC2?.id).toBe(mergedEncId);

    // Only one encounter in the room now
    const roomEncounters = system.findEncountersInRoom(TEST_ROOM);
    expect(roomEncounters).toHaveLength(1);
    expect(roomEncounters[0]?.combatantIds.size).toBe(4);
  });

  test('merge preserves threat tables from both original encounters', () => {
    const p1 = makePlayer('p1');
    const p2 = makePlayer('p2');
    const c1 = makeCreature('c1', TEST_ROOM, { maxHp: 200 });
    const c2 = makeCreature('c2', TEST_ROOM, { maxHp: 200 });
    system.registerCombatant(p1);
    system.registerCombatant(p2);
    system.registerCombatant(c1);
    system.registerCombatant(c2);

    system.initiateCombat('p1', 'c1');
    system.initiateCombat('p2', 'c2');

    // Tick a few times to build up threat in each encounter
    system.resolveTick();
    system.resolveTick();

    // Record threat values before merge
    const encA = system.getEncounterForCombatant('p1');
    const encB = system.getEncounterForCombatant('p2');
    expect(encA?.threatTables).toBeDefined();
    expect(encB?.threatTables).toBeDefined();
    const c1ThreatOnP1 = encA?.threatTables?.get('c1')?.getThreat('p1') ?? 0;
    const c2ThreatOnP2 = encB?.threatTables?.get('c2')?.getThreat('p2') ?? 0;
    expect(c1ThreatOnP1).toBeGreaterThan(0);
    expect(c2ThreatOnP2).toBeGreaterThan(0);

    // Merge encounters by having p1 attack c2
    system.initiateCombat('p1', 'c2');

    // After merge, the merged encounter should preserve both threat tables
    const merged = system.getEncounterForCombatant('p1');
    expect(merged).toBeDefined();
    expect(merged?.threatTables?.get('c1')?.getThreat('p1')).toBe(c1ThreatOnP1);
    expect(merged?.threatTables?.get('c2')?.getThreat('p2')).toBe(c2ThreatOnP2);
  });

  test('merge uses higher tick count from longer-running encounter', () => {
    const p1 = makePlayer('p1');
    const p2 = makePlayer('p2');
    const c1 = makeCreature('c1', TEST_ROOM, { maxHp: 200 });
    const c2 = makeCreature('c2', TEST_ROOM, { maxHp: 200 });
    system.registerCombatant(p1);
    system.registerCombatant(p2);
    system.registerCombatant(c1);
    system.registerCombatant(c2);

    // Start encounter A first and tick it a few times
    system.initiateCombat('p1', 'c1');
    system.resolveTick(); // tick 1
    system.resolveTick(); // tick 2
    system.resolveTick(); // tick 3

    const encATickCount = system.getEncounterForCombatant('p1')?.tickCount ?? 0;
    expect(encATickCount).toBe(3);

    // Start encounter B (tick count = 0)
    system.initiateCombat('p2', 'c2');
    const encBTickCount = system.getEncounterForCombatant('p2')?.tickCount ?? 0;
    expect(encBTickCount).toBe(0);

    // Merge by having p1 attack c2
    system.initiateCombat('p1', 'c2');

    // Merged encounter should use the higher tick count (3 from encounter A)
    const merged = system.getEncounterForCombatant('p1');
    expect(merged).toBeDefined();
    expect(merged?.tickCount).toBe(Math.max(encATickCount, encBTickCount));
  });

  test('player already in encounter attacks into another → encounters merge (single-encounter-per-player enforced)', () => {
    const p1 = makePlayer('p1');
    const c1 = makeCreature('c1', TEST_ROOM, { maxHp: 200 });
    const c2 = makeCreature('c2', TEST_ROOM, { maxHp: 200 });
    const p2 = makePlayer('p2');
    system.registerCombatant(p1);
    system.registerCombatant(c1);
    system.registerCombatant(c2);
    system.registerCombatant(p2);

    // p1 fights c1, p2 fights c2 — two separate encounters
    const encIdA = system.initiateCombat('p1', 'c1');
    const encIdB = system.initiateCombat('p2', 'c2');
    expect(encIdA).not.toBe(encIdB);

    // p1 (in encounter A) attacks c2 (in encounter B) → encounters merge
    const mergedId = system.initiateCombat('p1', 'c2');

    // All combatants in one encounter now
    expect(system.getEncounterForCombatant('p1')?.id).toBe(mergedId);
    expect(system.getEncounterForCombatant('p2')?.id).toBe(mergedId);
    expect(system.getEncounterForCombatant('c1')?.id).toBe(mergedId);
    expect(system.getEncounterForCombatant('c2')?.id).toBe(mergedId);

    // A player can only be in one encounter
    const roomEncounters = system.findEncountersInRoom(TEST_ROOM);
    expect(roomEncounters).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// C. CREATURE ASSIST
// ═══════════════════════════════════════════════════════════════════════════

describe('Creature Assist', () => {
  let system: CombatSystem;

  beforeEach(() => {
    system = new CombatSystem(testExitResolver);
  });

  test('creature with sameType: true assists when same-type ally attacked', () => {
    const player = makePlayer('p1');
    const creature1 = makeCreature('c1');
    const creature2 = makeCreature('c2');
    system.registerCombatant(player);
    system.registerCombatant(creature1);
    system.registerCombatant(creature2);

    const roomCreatures = [
      { id: 'c1', type: 'gutterspawn', roomId: TEST_ROOM, assist: { mode: 'sameType' as const } },
      { id: 'c2', type: 'gutterspawn', roomId: TEST_ROOM, assist: { mode: 'sameType' as const } },
    ];

    const encounterId = system.initiateCombat('p1', 'c1');
    expect(encounterId).toBeDefined();

    const result = system.resolveAssist('c1', 'p1', roomCreatures);
    
    expect(result).toBeDefined();
    expect(result.length).toBe(1);
    expect(result[0].assistCreatureId).toBe('c2');
    expect(result[0].targetPlayerId).toBe('p1');
  });

  test('creature with all: true assists any creature attacked', () => {
    const player = makePlayer('p1');
    const creature1 = makeCreature('c1');
    const creature2 = makeCreature('c2');
    system.registerCombatant(player);
    system.registerCombatant(creature1);
    system.registerCombatant(creature2);

    const roomCreatures = [
      { id: 'c1', type: 'gutterspawn', roomId: TEST_ROOM },
      { id: 'c2', type: 'drowned_revenant', roomId: TEST_ROOM, assist: { mode: 'all' as const } },
    ];

    const encounterId = system.initiateCombat('p1', 'c1');
    expect(encounterId).toBeDefined();

    const result = system.resolveAssist('c1', 'p1', roomCreatures);
    
    expect(result).toBeDefined();
    expect(result.length).toBe(1);
    expect(result[0].assistCreatureId).toBe('c2');
    expect(result[0].targetPlayerId).toBe('p1');
  });

  test('creature with groupTag assists matching tag', () => {
    const player = makePlayer('p1');
    const creature1 = makeCreature('c1');
    const creature2 = makeCreature('c2');
    system.registerCombatant(player);
    system.registerCombatant(creature1);
    system.registerCombatant(creature2);

    const roomCreatures = [
      { id: 'c1', type: 'gutterspawn', roomId: TEST_ROOM, assist: { mode: 'groupTag' as const, groupTag: 'pack-alpha' } },
      { id: 'c2', type: 'gutterspawn', roomId: TEST_ROOM, assist: { mode: 'groupTag' as const, groupTag: 'pack-alpha' } },
    ];

    const encounterId = system.initiateCombat('p1', 'c1');
    expect(encounterId).toBeDefined();

    const result = system.resolveAssist('c1', 'p1', roomCreatures);
    
    expect(result).toBeDefined();
    expect(result.length).toBe(1);
    expect(result[0].assistCreatureId).toBe('c2');
    expect(result[0].targetPlayerId).toBe('p1');
  });

  test('creature already in combat does NOT assist', () => {
    const player1 = makePlayer('p1');
    const player2 = makePlayer('p2');
    const creature1 = makeCreature('c1');
    const creature2 = makeCreature('c2');
    system.registerCombatant(player1);
    system.registerCombatant(player2);
    system.registerCombatant(creature1);
    system.registerCombatant(creature2);

    const roomCreatures = [
      { id: 'c1', type: 'gutterspawn', roomId: TEST_ROOM, assist: { mode: 'all' as const } },
      { id: 'c2', type: 'gutterspawn', roomId: TEST_ROOM, assist: { mode: 'all' as const } },
    ];

    // Put creature2 in combat first
    const enc1 = system.initiateCombat('p2', 'c2');
    expect(enc1).toBeDefined();

    // Now attack creature1
    const enc2 = system.initiateCombat('p1', 'c1');
    expect(enc2).toBeDefined();

    const result = system.resolveAssist('c1', 'p1', roomCreatures);
    
    expect(result).toBeDefined();
    expect(result.length).toBe(0);
  });

  test('creature with no assist config does NOT assist', () => {
    const player = makePlayer('p1');
    const creature1 = makeCreature('c1');
    const creature2 = makeCreature('c2');
    system.registerCombatant(player);
    system.registerCombatant(creature1);
    system.registerCombatant(creature2);

    const roomCreatures = [
      { id: 'c1', type: 'gutterspawn', roomId: TEST_ROOM },
      { id: 'c2', type: 'gutterspawn', roomId: TEST_ROOM },
    ];

    const encounterId = system.initiateCombat('p1', 'c1');
    expect(encounterId).toBeDefined();

    const result = system.resolveAssist('c1', 'p1', roomCreatures);
    
    expect(result).toBeDefined();
    expect(result.length).toBe(0);
  });

  test('chain assist prevention — A assists B, C does not cascade-assist A', () => {
    const player = makePlayer('p1');
    const creatureA = makeCreature('cA');
    const creatureB = makeCreature('cB');
    const creatureC = makeCreature('cC');
    system.registerCombatant(player);
    system.registerCombatant(creatureA);
    system.registerCombatant(creatureB);
    system.registerCombatant(creatureC);

    const roomCreatures = [
      { id: 'cA', type: 'gutterspawn', roomId: TEST_ROOM, assist: { mode: 'all' as const } },
      { id: 'cB', type: 'gutterspawn', roomId: TEST_ROOM, assist: { mode: 'all' as const } },
      { id: 'cC', type: 'gutterspawn', roomId: TEST_ROOM, assist: { mode: 'all' as const } },
    ];

    // Player attacks B
    const enc1 = system.initiateCombat('p1', 'cB');
    expect(enc1).toBeDefined();

    // Resolve assists - Both A and C should assist B (since both are idle and have assist: all)
    const result1 = system.resolveAssist('cB', 'p1', roomCreatures);
    expect(result1).toBeDefined();
    expect(result1.length).toBe(2);
    
    const assistIds = result1.map(r => r.assistCreatureId).sort();
    expect(assistIds).toEqual(['cA', 'cC']);

    // Now put A and C into combat
    system.initiateCombat('cA', 'p1');
    system.initiateCombat('cC', 'p1');

    // At this point, all three creatures are in combat
    // If we resolve assists again for B, should get EMPTY because A and C are already in combat
    const result2 = system.resolveAssist('cB', 'p1', roomCreatures);
    expect(result2).toBeDefined();
    expect(result2.length).toBe(0);
  });

  test('assist only triggers for idle creatures in same room (not adjacent rooms)', () => {
    const player = makePlayer('p1', TEST_ROOM);
    const creature1 = makeCreature('c1', TEST_ROOM);
    const creature2 = makeCreature('c2', ADJACENT_ROOM);
    system.registerCombatant(player);
    system.registerCombatant(creature1);
    system.registerCombatant(creature2);

    const roomCreatures = [
      { id: 'c1', type: 'gutterspawn', roomId: TEST_ROOM, assist: { mode: 'all' as const } },
      { id: 'c2', type: 'gutterspawn', roomId: ADJACENT_ROOM, assist: { mode: 'all' as const } },
    ];

    const encounterId = system.initiateCombat('p1', 'c1');
    expect(encounterId).toBeDefined();

    const result = system.resolveAssist('c1', 'p1', roomCreatures);
    
    expect(result).toBeDefined();
    expect(result.length).toBe(0);
  });

  test('multiple creatures assist simultaneously when ally attacked', () => {
    const player = makePlayer('p1');
    const creature1 = makeCreature('c1');
    const creature2 = makeCreature('c2');
    const creature3 = makeCreature('c3');
    system.registerCombatant(player);
    system.registerCombatant(creature1);
    system.registerCombatant(creature2);
    system.registerCombatant(creature3);

    const roomCreatures = [
      { id: 'c1', type: 'gutterspawn', roomId: TEST_ROOM, assist: { mode: 'sameType' as const } },
      { id: 'c2', type: 'gutterspawn', roomId: TEST_ROOM, assist: { mode: 'sameType' as const } },
      { id: 'c3', type: 'gutterspawn', roomId: TEST_ROOM, assist: { mode: 'sameType' as const } },
    ];

    const encounterId = system.initiateCombat('p1', 'c1');
    expect(encounterId).toBeDefined();

    const result = system.resolveAssist('c1', 'p1', roomCreatures);
    
    expect(result).toBeDefined();
    expect(result.length).toBe(2);
    
    const assistCreatureIds = result.map(r => r.assistCreatureId).sort();
    expect(assistCreatureIds).toEqual(['c2', 'c3']);
    
    result.forEach(r => {
      expect(r.targetPlayerId).toBe('p1');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// D. AoE ENCOUNTER MERGE
// ═══════════════════════════════════════════════════════════════════════════

describe('AoE Encounter Merge', () => {
  let system: CombatSystem;

  beforeEach(() => {
    system = new CombatSystem(testExitResolver);
  });

  test('AoE hits creatures in caster encounter only → no merge needed', () => {
    const p1 = makePlayer('p1');
    const c1 = makeCreature('c1');
    const c2 = makeCreature('c2');
    system.registerCombatant(p1);
    system.registerCombatant(c1);
    system.registerCombatant(c2);

    // P1 fighting C1 and C2 in same encounter
    const encId = system.initiateCombat('p1', 'c1');
    system.initiateCombat('p1', 'c2');

    expect(system.findEncountersInRoom(TEST_ROOM)).toHaveLength(1);

    // AoE targeting creatures already in same encounter
    const resultEncId = system.resolveAoE('p1', ['c1', 'c2']);

    expect(resultEncId).toBe(encId);
    expect(system.findEncountersInRoom(TEST_ROOM)).toHaveLength(1);
    expect(system.getEncounterForCombatant('p1')?.id).toBe(encId);
    expect(system.getEncounterForCombatant('c1')?.id).toBe(encId);
    expect(system.getEncounterForCombatant('c2')?.id).toBe(encId);
  });

  test('AoE hits creatures in two different encounters → encounters merge', () => {
    const p1 = makePlayer('p1');
    const p2 = makePlayer('p2');
    const c1 = makeCreature('c1');
    const c2 = makeCreature('c2');
    system.registerCombatant(p1);
    system.registerCombatant(p2);
    system.registerCombatant(c1);
    system.registerCombatant(c2);

    // P1 vs C1 (enc-A), P2 vs C2 (enc-B)
    const encA = system.initiateCombat('p1', 'c1');
    const encB = system.initiateCombat('p2', 'c2');
    expect(encA).not.toBe(encB);
    expect(system.findEncountersInRoom(TEST_ROOM)).toHaveLength(2);

    // P1 AoE targets both C1 and C2
    const resultEncId = system.resolveAoE('p1', ['c1', 'c2']);

    expect(resultEncId).toBeDefined();
    expect(system.findEncountersInRoom(TEST_ROOM)).toHaveLength(1);

    // All four combatants in one merged encounter
    const mergedEnc = system.getEncounterForCombatant('p1');
    expect(mergedEnc).toBeDefined();
    expect(mergedEnc?.combatantIds.has('p1')).toBe(true);
    expect(mergedEnc?.combatantIds.has('p2')).toBe(true);
    expect(mergedEnc?.combatantIds.has('c1')).toBe(true);
    expect(mergedEnc?.combatantIds.has('c2')).toBe(true);
  });

  test('AoE hits creature not in any encounter → creature joins caster encounter', () => {
    const p1 = makePlayer('p1');
    const c1 = makeCreature('c1');
    const c2 = makeCreature('c2');
    system.registerCombatant(p1);
    system.registerCombatant(c1);
    system.registerCombatant(c2);

    // P1 vs C1, C2 not in combat
    const encId = system.initiateCombat('p1', 'c1');
    expect(system.getEncounterForCombatant('c2')).toBeUndefined();

    // P1 AoE targets C1 and C2
    const resultEncId = system.resolveAoE('p1', ['c1', 'c2']);

    expect(resultEncId).toBe(encId);
    expect(system.findEncountersInRoom(TEST_ROOM)).toHaveLength(1);

    // C2 joined P1's encounter
    const enc = system.getEncounterForCombatant('c2');
    expect(enc).toBeDefined();
    expect(enc?.id).toBe(encId);
    expect(enc?.combatantIds.has('p1')).toBe(true);
    expect(enc?.combatantIds.has('c1')).toBe(true);
    expect(enc?.combatantIds.has('c2')).toBe(true);
  });

  test('AoE hits mix of encounter and non-encounter targets → all merge into one', () => {
    const p1 = makePlayer('p1');
    const p2 = makePlayer('p2');
    const c1 = makeCreature('c1');
    const c2 = makeCreature('c2');
    const c3 = makeCreature('c3');
    system.registerCombatant(p1);
    system.registerCombatant(p2);
    system.registerCombatant(c1);
    system.registerCombatant(c2);
    system.registerCombatant(c3);

    // P1 vs C1 (enc-A), P2 vs C2 (enc-B), C3 not in combat
    system.initiateCombat('p1', 'c1');
    system.initiateCombat('p2', 'c2');
    expect(system.findEncountersInRoom(TEST_ROOM)).toHaveLength(2);
    expect(system.getEncounterForCombatant('c3')).toBeUndefined();

    // P1 AoE targets all three creatures
    const resultEncId = system.resolveAoE('p1', ['c1', 'c2', 'c3']);

    expect(resultEncId).toBeDefined();
    expect(system.findEncountersInRoom(TEST_ROOM)).toHaveLength(1);

    // All five combatants in one merged encounter
    const mergedEnc = system.getEncounterForCombatant('p1');
    expect(mergedEnc).toBeDefined();
    expect(mergedEnc?.combatantIds.has('p1')).toBe(true);
    expect(mergedEnc?.combatantIds.has('p2')).toBe(true);
    expect(mergedEnc?.combatantIds.has('c1')).toBe(true);
    expect(mergedEnc?.combatantIds.has('c2')).toBe(true);
    expect(mergedEnc?.combatantIds.has('c3')).toBe(true);
  });

  test('AoE merge preserves all threat tables from merged encounters', () => {
    const p1 = makePlayer('p1');
    const p2 = makePlayer('p2');
    const c1 = makeCreature('c1', TEST_ROOM, { maxHp: 200 });
    const c2 = makeCreature('c2', TEST_ROOM, { maxHp: 200 });
    system.registerCombatant(p1);
    system.registerCombatant(p2);
    system.registerCombatant(c1);
    system.registerCombatant(c2);

    // Set up two encounters with threat
    system.initiateCombat('p1', 'c1');
    system.initiateCombat('p2', 'c2');
    system.resolveTick(); // Build up threat

    const encA = system.getEncounterForCombatant('p1');
    const encB = system.getEncounterForCombatant('p2');
    expect(encA?.threatTables).toBeDefined();
    expect(encB?.threatTables).toBeDefined();
    const c1ThreatOnP1 = encA?.threatTables?.get('c1')?.getThreat('p1') ?? 0;
    const c2ThreatOnP2 = encB?.threatTables?.get('c2')?.getThreat('p2') ?? 0;
    expect(c1ThreatOnP1).toBeGreaterThan(0);
    expect(c2ThreatOnP2).toBeGreaterThan(0);

    // AoE merge
    system.resolveAoE('p1', ['c1', 'c2']);

    // Merged encounter preserves both threat tables
    const merged = system.getEncounterForCombatant('p1');
    expect(merged).toBeDefined();
    expect(merged?.threatTables?.get('c1')?.getThreat('p1')).toBe(c1ThreatOnP1);
    expect(merged?.threatTables?.get('c2')?.getThreat('p2')).toBe(c2ThreatOnP2);
  });

  test('AoE merge handles tick count correctly (uses max)', () => {
    const p1 = makePlayer('p1');
    const p2 = makePlayer('p2');
    const c1 = makeCreature('c1', TEST_ROOM, { maxHp: 200 });
    const c2 = makeCreature('c2', TEST_ROOM, { maxHp: 200 });
    system.registerCombatant(p1);
    system.registerCombatant(p2);
    system.registerCombatant(c1);
    system.registerCombatant(c2);

    // Start encounter A first and tick it
    system.initiateCombat('p1', 'c1');
    system.resolveTick(); // tick 1
    system.resolveTick(); // tick 2
    system.resolveTick(); // tick 3

    const encATickCount = system.getEncounterForCombatant('p1')?.tickCount ?? 0;
    expect(encATickCount).toBe(3);

    // Start encounter B (tick count = 0)
    system.initiateCombat('p2', 'c2');
    const encBTickCount = system.getEncounterForCombatant('p2')?.tickCount ?? 0;
    expect(encBTickCount).toBe(0);

    // AoE merge
    system.resolveAoE('p1', ['c1', 'c2']);

    // Merged encounter uses max tick count
    const merged = system.getEncounterForCombatant('p1');
    expect(merged).toBeDefined();
    expect(merged?.tickCount).toBe(Math.max(encATickCount, encBTickCount));
  });

  test('AoE merges all 3 encounters in room into one', () => {
    const p1 = makePlayer('p1');
    const p2 = makePlayer('p2');
    const p3 = makePlayer('p3');
    const c1 = makeCreature('c1');
    const c2 = makeCreature('c2');
    const c3 = makeCreature('c3');
    system.registerCombatant(p1);
    system.registerCombatant(p2);
    system.registerCombatant(p3);
    system.registerCombatant(c1);
    system.registerCombatant(c2);
    system.registerCombatant(c3);

    // P1 vs C1, P2 vs C2, P3 vs C3 (3 separate encounters)
    const encA = system.initiateCombat('p1', 'c1');
    const encB = system.initiateCombat('p2', 'c2');
    const encC = system.initiateCombat('p3', 'c3');
    expect(new Set([encA, encB, encC]).size).toBe(3);
    expect(system.findEncountersInRoom(TEST_ROOM)).toHaveLength(3);

    // P1 AoE targets all three creatures
    const resultEncId = system.resolveAoE('p1', ['c1', 'c2', 'c3']);

    expect(resultEncId).toBeDefined();
    expect(system.findEncountersInRoom(TEST_ROOM)).toHaveLength(1);

    // All six combatants in one merged encounter
    const merged = system.getEncounterForCombatant('p1');
    expect(merged).toBeDefined();
    expect(merged?.combatantIds.size).toBe(6);
    expect(merged?.combatantIds.has('p1')).toBe(true);
    expect(merged?.combatantIds.has('p2')).toBe(true);
    expect(merged?.combatantIds.has('p3')).toBe(true);
    expect(merged?.combatantIds.has('c1')).toBe(true);
    expect(merged?.combatantIds.has('c2')).toBe(true);
    expect(merged?.combatantIds.has('c3')).toBe(true);
  });

  test('AoE from non-encounter player creates encounter with all hit creatures', () => {
    const p1 = makePlayer('p1');
    const c1 = makeCreature('c1');
    const c2 = makeCreature('c2');
    system.registerCombatant(p1);
    system.registerCombatant(c1);
    system.registerCombatant(c2);

    // P1 not in combat, C1 and C2 registered but not in combat
    expect(system.getEncounterForCombatant('p1')).toBeUndefined();
    expect(system.getEncounterForCombatant('c1')).toBeUndefined();
    expect(system.getEncounterForCombatant('c2')).toBeUndefined();

    // P1 AoE targets C1 and C2
    const resultEncId = system.resolveAoE('p1', ['c1', 'c2']);

    expect(resultEncId).toBeDefined();
    expect(system.findEncountersInRoom(TEST_ROOM)).toHaveLength(1);

    // New encounter created with P1, C1, C2
    const enc = system.getEncounterForCombatant('p1');
    expect(enc).toBeDefined();
    expect(enc?.id).toBe(resultEncId);
    expect(enc?.combatantIds.has('p1')).toBe(true);
    expect(enc?.combatantIds.has('c1')).toBe(true);
    expect(enc?.combatantIds.has('c2')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// E. ROOM ENTRY / AGGRO
// ═══════════════════════════════════════════════════════════════════════════

describe('Room Entry / Aggro', () => {
  test.todo('player enters room with aggressive creature in combat → creature aggros but keeps current target');

  test.todo('player enters room with non-aggressive creature → no auto-engage');

  test.todo('player enters room with multiple active encounters → not auto-joined to any');

  test.todo('aggressive creature not in combat aggros entering player → new encounter created');

  test.todo('aggressive creature aggros entering player — adds to threat table but does not switch currentTarget');

  test.todo('creature aggro adds entering player to existing encounter (same encounter as creature)');
});

// ═══════════════════════════════════════════════════════════════════════════
// F. OBSERVER PATTERN
// ═══════════════════════════════════════════════════════════════════════════

describe('Observer Pattern', () => {
  test.todo('observer receives COMBAT_STATE with isParticipant=false');

  test.todo('observer sees combat narration from all encounters in room');

  test.todo('observer joins encounter → transitions to isParticipant=true');

  test.todo('participant sees only their own encounter combatant list');

  test.todo('multiple observers in room with multiple encounters all receive observer state');
});

// ═══════════════════════════════════════════════════════════════════════════
// G. GROUP WIPE / FREED CREATURES
// ═══════════════════════════════════════════════════════════════════════════

describe('Group Wipe / Freed Creatures', () => {
  test.todo('all players in encounter defeated → encounter ends, creatures freed');

  test.todo('freed creatures re-aggro other players in room via behavior tree');

  test.todo('freed creatures create new encounter — not join existing');

  test.todo('freed creature HP persists (not reset to max)');

  test.todo('multiple creatures freed simultaneously after group wipe');
});

// ═══════════════════════════════════════════════════════════════════════════
// H. EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════

describe('Edge Cases', () => {
  test.todo('player flees from one encounter then immediately attacks into another in same room');

  test.todo('creature defeated in encounter A while encounter B is active in same room');

  test.todo('all creatures in encounter die → encounter ends, players exit combat');

  test.todo('disconnect while in multi-encounter room — disconnected player auto-attacks in own encounter only');

  test.todo('room has 3+ simultaneous encounters — all tick independently with no cross-contamination');

  test.todo('player uses AoE that merges all 3 encounters in room');

  test.todo('encounter ends while another encounter tick is resolving — no state corruption');

  test.todo('player attacks player in different encounter (PvP) → encounters merge');
});

// ═══════════════════════════════════════════════════════════════════════════
// I. BACKWARD COMPATIBILITY
// ═══════════════════════════════════════════════════════════════════════════

describe('Backward Compatibility', () => {
  let system: CombatSystem;

  beforeEach(() => {
    system = new CombatSystem(testExitResolver);
  });

  test('solo player attacks creature → identical to current behavior (single encounter)', () => {
    const p1 = makePlayer('p1');
    const c1 = makeCreature('c1', TEST_ROOM, { maxHp: 100 });
    system.registerCombatant(p1);
    system.registerCombatant(c1);

    const encId = system.initiateCombat('p1', 'c1');
    expect(encId).toBeDefined();
    expect(system.isInCombat('p1')).toBe(true);
    expect(system.isInCombat('c1')).toBe(true);

    const enc = system.getEncounterForCombatant('p1');
    expect(enc).toBeDefined();
    expect(enc?.combatantIds.size).toBe(2);

    // p1 auto-attacks c1 — standard tick behavior
    const result = system.resolveTick();
    const strikes = result.events.filter(e => e.type === 'strike');
    expect(strikes.length).toBeGreaterThanOrEqual(1);
    expect(c1.hp).toBeLessThan(100);
  });

  test('single fight with all same-type creatures assisting → all join one encounter', () => {
    const p1 = makePlayer('p1');
    const c1 = makeCreature('c1');
    const c2 = makeCreature('c2');
    const c3 = makeCreature('c3');
    system.registerCombatant(p1);
    system.registerCombatant(c1);
    system.registerCombatant(c2);
    system.registerCombatant(c3);

    // All creatures join p1's encounter (simulating assist behavior)
    const encId1 = system.initiateCombat('p1', 'c1');
    const encId2 = system.initiateCombat('c2', 'p1'); // c2 assists → joins existing
    const encId3 = system.initiateCombat('c3', 'p1'); // c3 assists → joins existing

    // All should be in the same encounter
    expect(encId1).toBe(encId2);
    expect(encId2).toBe(encId3);

    const enc = system.getEncounterForCombatant('p1');
    expect(enc).toBeDefined();
    expect(enc?.combatantIds.size).toBe(4);
    expect(enc?.combatantIds.has('p1')).toBe(true);
    expect(enc?.combatantIds.has('c1')).toBe(true);
    expect(enc?.combatantIds.has('c2')).toBe(true);
    expect(enc?.combatantIds.has('c3')).toBe(true);
  });

  test('existing flee behavior unchanged within encounter', () => {
    // Use roll that always succeeds flee
    const fleeSystem = new CombatSystem(testExitResolver, () => 0.0);
    const p1 = makePlayer('p1');
    const c1 = makeCreature('c1', TEST_ROOM, { maxHp: 100 });
    fleeSystem.registerCombatant(p1);
    fleeSystem.registerCombatant(c1);

    fleeSystem.initiateCombat('p1', 'c1');

    // Override auto-queued strike with flee
    fleeSystem.submitAction('p1', 'flee');

    const result = fleeSystem.resolveTick();

    // p1 should have fled successfully
    expect(result.fleeResults).toHaveLength(1);
    expect(result.fleeResults[0]?.combatantId).toBe('p1');
    expect(result.fleeResults[0]?.toRoomId).toBe(ADJACENT_ROOM);
    expect(fleeSystem.isInCombat('p1')).toBe(false);
    expect(p1.roomId).toBe(ADJACENT_ROOM);
  });

  test('existing threat table behavior unchanged per-encounter', () => {
    const p1 = makePlayer('p1', TEST_ROOM, { unarmed: 10 });
    const p2 = makePlayer('p2', TEST_ROOM, { unarmed: 5 });
    const c1 = makeCreature('c1', TEST_ROOM, { maxHp: 200 });
    system.registerCombatant(p1);
    system.registerCombatant(p2);
    system.registerCombatant(c1);

    // Both players attack the creature → same encounter
    system.initiateCombat('p1', 'c1');
    system.initiateCombat('p2', 'c1');

    // Tick a few times to build up threat
    system.resolveTick();
    system.resolveTick();

    const enc = system.getEncounterForCombatant('c1');
    expect(enc).toBeDefined();
    expect(enc?.threatTables).toBeDefined();

    const c1Threat = enc?.threatTables?.get('c1');
    expect(c1Threat).toBeDefined();

    // p1 does more damage → should have more threat
    const p1Threat = c1Threat?.getThreat('p1') ?? 0;
    const p2Threat = c1Threat?.getThreat('p2') ?? 0;
    expect(p1Threat).toBeGreaterThan(0);
    expect(p2Threat).toBeGreaterThan(0);
    expect(p1Threat).toBeGreaterThan(p2Threat);
  });

  test('existing position system unchanged per-encounter', () => {
    const p1 = makePlayer('p1');
    const c1 = makeCreature('c1', TEST_ROOM, { maxHp: 200 });
    system.registerCombatant(p1);
    system.registerCombatant(c1);

    system.initiateCombat('p1', 'c1');

    // Default position should be 'front'
    const p1Combatant = system.getCombatant('p1');
    expect(p1Combatant).toBeDefined();
    expect(p1Combatant?.position).toBe('front');

    // Queue a reposition to flank
    const repositionResult = system.queuePositionChange('p1', 'flank');
    expect(repositionResult.success).toBe(true);

    system.resolveTick();

    // Position should have changed to flank
    expect(p1Combatant?.position).toBe('flank');
  });

  test('combat timeout still works per-encounter (10 ticks no strikes)', () => {
    // Use no-exit system so flee always fails, producing no strikes
    const noExitSystem = new CombatSystem(noExitResolver);
    const p1 = makePlayer('p1');
    const c1 = makeCreature('c1', TEST_ROOM, { maxHp: 200 });
    noExitSystem.registerCombatant(p1);
    noExitSystem.registerCombatant(c1);

    noExitSystem.initiateCombat('p1', 'c1');

    // First tick: p1 auto-strikes (resets timeout counter)
    noExitSystem.resolveTick();

    // Now submit flee every tick — flee is not a strike, so timeout counter increments
    for (let i = 0; i < COMBAT_TIMEOUT_TICKS; i++) {
      noExitSystem.submitAction('p1', 'flee');
      // Force creature to also not strike (submit flee for creature too)
      noExitSystem.submitAction('c1', 'flee');
      const result = noExitSystem.resolveTick();

      if (i === COMBAT_TIMEOUT_TICKS - 1) {
        // Last tick should end combat due to timeout
        const endEvents = result.events.filter(e => e.type === 'combat_end');
        expect(endEvents).toHaveLength(1);
        expect(endEvents[0]?.narration).toContain('ended');
      }
    }

    // Should no longer be in combat
    expect(noExitSystem.isInCombat('p1')).toBe(false);
  });
});

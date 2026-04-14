import { describe, it, expect, beforeEach } from 'vitest';
import { CombatSystem } from '../combat/CombatSystem.js';
import {
  createCombatant,
  DEFAULT_PLAYER_STATS,
  COMBAT_TIMEOUT_TICKS,
  type Combatant,
  type CombatStats,
} from '../combat/CombatState.js';
import { calculateDamage } from '../combat/damage.js';

// ─── Test Helpers ─────────────────────────────────────────────────────────

const TEST_ROOM = 'room-1';
const ADJACENT_ROOM = 'room-2';

/** Simple exit resolver: room-1 connects to room-2 and vice versa. */
function testExitResolver(roomId: string): string[] {
  if (roomId === TEST_ROOM) return [ADJACENT_ROOM];
  if (roomId === ADJACENT_ROOM) return [TEST_ROOM];
  return [];
}

/** No exits — used to test failed flee. */
function noExitResolver(_roomId: string): string[] {
  return [];
}

function makePlayer(id: string, roomId = TEST_ROOM, stats?: Partial<CombatStats>): Combatant {
  const merged = { ...DEFAULT_PLAYER_STATS, ...stats };
  return createCombatant(id, id, roomId, true, { attack: merged.unarmed, maxHp: merged.maxHp, armour: merged.armour, shieldBlock: merged.shieldBlock, dodge: merged.dodge });
}

function makeCreature(id: string, roomId = TEST_ROOM, stats?: Partial<CombatStats>): Combatant {
  const merged = { ...DEFAULT_PLAYER_STATS, ...stats };
  return createCombatant(id, id, roomId, false, { attack: merged.unarmed, maxHp: merged.maxHp, armour: merged.armour, shieldBlock: merged.shieldBlock, dodge: merged.dodge });
}

// ─── Damage Calculation Tests ─────────────────────────────────────────────

describe('Damage Calculation', () => {
  // Default stats: attack=10, armour=2

  it('strike vs strike: full damage (attack × 1.0 - armour)', () => {
    const result = calculateDamage(10, 2, 'strike', 'strike');
    expect(result.multiplier).toBe(1.0);
    // 10 * 1.0 - 2 = 8
    expect(result.finalDamage).toBe(8);
  });

  it('strike vs flee: full damage (attack × 1.0 - armour)', () => {
    const result = calculateDamage(10, 2, 'strike', 'flee');
    expect(result.multiplier).toBe(1.0);
    // 10 * 1.0 - 2 = 8
    expect(result.finalDamage).toBe(8);
  });

  it('flee vs anything: zero damage (non-strike actions deal no damage)', () => {
    const result = calculateDamage(10, 2, 'flee', 'strike');
    expect(result.finalDamage).toBe(0);
    expect(result.multiplier).toBe(0);
  });

  it('flee vs flee: zero damage', () => {
    const result = calculateDamage(10, 2, 'flee', 'strike');
    expect(result.finalDamage).toBe(0);
  });

  it('minimum 1 damage on hit even with high armour', () => {
    // attack=3, armour=10: 3 * 1.0 - 10 = -7 → clamped to 1
    const result = calculateDamage(3, 10, 'strike', 'strike');
    expect(result.finalDamage).toBe(1);
  });

  it('minimum 1 damage on hit when high armour matches attack', () => {
    // attack=5, armour=5: 5 * 1.0 - 5 = 0 → clamped to 1
    const result = calculateDamage(5, 5, 'strike', 'strike');
    expect(result.finalDamage).toBe(1);
  });

  it('handles zero armour correctly', () => {
    const result = calculateDamage(10, 0, 'strike', 'strike');
    // 10 * 1.0 - 0 = 10
    expect(result.finalDamage).toBe(10);
  });
});

// ─── Tick Resolution Tests ────────────────────────────────────────────────

describe('Tick Resolution', () => {
  let system: CombatSystem;

  beforeEach(() => {
    system = new CombatSystem(testExitResolver);
  });

  it('should resolve simultaneous strikes (both take damage)', () => {
    const p1 = makePlayer('p1');
    const p2 = makePlayer('p2');
    system.registerCombatant(p1);
    system.registerCombatant(p2);
    system.initiateCombat('p1', 'p2');

    // p1 auto-queued strike on initiation. Queue p2's strike too.
    system.submitAction('p2', 'strike', 'p1');

    const result = system.resolveTick();

    // Both should have taken damage
    expect(p1.hp).toBeLessThan(p1.maxHp);
    expect(p2.hp).toBeLessThan(p2.maxHp);

    // Both took 3 damage (5 * 1.0 - 2 = 3)
    expect(p1.hp).toBe(100 - 3);
    expect(p2.hp).toBe(100 - 3);

    // Should have strike events for both
    const strikes = result.events.filter((e) => e.type === 'strike');
    expect(strikes).toHaveLength(2);
  });

  it('should resolve strike vs strike (both take full damage)', () => {
    const p1 = makePlayer('p1');
    const p2 = makePlayer('p2');
    system.registerCombatant(p1);
    system.registerCombatant(p2);
    system.initiateCombat('p1', 'p2');

    // Both strike
    system.submitAction('p2', 'strike', 'p1');

    system.resolveTick();

    // Both take full damage: 5 * 1.0 - 2 = 3
    expect(p2.hp).toBe(100 - 3);
    expect(p1.hp).toBe(100 - 3);
  });

  it('should default to auto-attack when no action submitted (GDD §6.1)', () => {
    const p1 = makePlayer('p1');
    const p2 = makePlayer('p2');
    system.registerCombatant(p1);
    system.registerCombatant(p2);
    system.initiateCombat('p1', 'p2');

    // Clear p1's auto-queued action to test default
    // We need a new tick — the first tick already has p1's auto-queued strike
    system.resolveTick(); // consume the first tick

    // Now neither has a queued action — both should auto-attack (GDD §6.1)
    const result = system.resolveTick();
    const strikes = result.events.filter((e) => e.type === 'strike');
    expect(strikes).toHaveLength(2);

    // Both dealt damage (auto-attack)
    expect(p1.hp).toBeLessThan(100);
    expect(p2.hp).toBeLessThan(100);
  });

  it('should handle flee successfully when exits exist', () => {
    // Use a roll function that always succeeds (returns 0.0 < base 50% flee chance)
    const fleeSystem = new CombatSystem(testExitResolver, () => 0.0);
    const p1 = makePlayer('p1');
    const p2 = makePlayer('p2');
    fleeSystem.registerCombatant(p1);
    fleeSystem.registerCombatant(p2);
    fleeSystem.initiateCombat('p1', 'p2');

    // Override p1's auto-queued strike with flee
    fleeSystem.submitAction('p1', 'flee');

    const result = fleeSystem.resolveTick();

    // p1 should have fled
    const flees = result.fleeResults;
    expect(flees).toHaveLength(1);
    expect(flees[0]!.combatantId).toBe('p1');
    expect(flees[0]!.toRoomId).toBe(ADJACENT_ROOM);

    // p1 should no longer be in combat
    expect(fleeSystem.isInCombat('p1')).toBe(false);

    // p1's room should be updated
    expect(p1.roomId).toBe(ADJACENT_ROOM);
  });

  it('should fail flee when no exits exist', () => {
    const noExitSystem = new CombatSystem(noExitResolver);
    const p1 = makePlayer('p1');
    const p2 = makePlayer('p2');
    noExitSystem.registerCombatant(p1);
    noExitSystem.registerCombatant(p2);
    noExitSystem.initiateCombat('p1', 'p2');

    noExitSystem.submitAction('p1', 'flee');

    const result = noExitSystem.resolveTick();

    // No flee results (failed)
    expect(result.fleeResults).toHaveLength(0);

    // p1 should still be in combat
    expect(noExitSystem.isInCombat('p1')).toBe(true);
    expect(p1.roomId).toBe(TEST_ROOM);

    // Should have a flee event (failed)
    const fleeEvents = result.events.filter((e) => e.type === 'flee');
    expect(fleeEvents).toHaveLength(1);
    expect(fleeEvents[0]!.narration).toContain('no escape');
  });

  it('should end combat immediately when one combatant is defeated', () => {
    // Give p2 very low HP
    const p1 = makePlayer('p1', TEST_ROOM, { unarmed: 10 });
    const p2 = makePlayer('p2', TEST_ROOM, { maxHp: 5 });
    p2.hp = 5;
    system.registerCombatant(p1);
    system.registerCombatant(p2);
    system.initiateCombat('p1', 'p2');

    // Tick 1: p1 strikes (auto-queued), p2 dies — combat ends immediately
    const result1 = system.resolveTick();
    expect(p2.hp).toBe(0);
    const endEvents = result1.events.filter((e) => e.type === 'combat_end');
    expect(endEvents).toHaveLength(1);
    expect(endEvents[0]!.narration).toContain('ended');

    // Neither should be in combat anymore
    expect(system.isInCombat('p1')).toBe(false);
    expect(system.isInCombat('p2')).toBe(false);
  });

  it('should end combat after 10 ticks of no strikes (timeout)', () => {
    // Use no-exit system so flee always fails but no strikes are generated
    const noExitSystem = new CombatSystem(noExitResolver);
    const p1 = makePlayer('p1');
    const p2 = makePlayer('p2');
    noExitSystem.registerCombatant(p1);
    noExitSystem.registerCombatant(p2);
    noExitSystem.initiateCombat('p1', 'p2');

    // First tick: p1 auto-strikes, resetting the counter
    noExitSystem.resolveTick();

    // Submit flee every tick — flee is not a 'strike' so hasStrike stays false
    for (let i = 0; i < COMBAT_TIMEOUT_TICKS; i++) {
      noExitSystem.submitAction('p1', 'flee');
      noExitSystem.submitAction('p2', 'flee');
      const result = noExitSystem.resolveTick();
      if (i === COMBAT_TIMEOUT_TICKS - 1) {
        // Last tick should end combat
        const endEvents = result.events.filter((e) => e.type === 'combat_end');
        expect(endEvents).toHaveLength(1);
        expect(endEvents[0]!.narration).toContain('ended');
      }
    }

    // Should no longer be in combat
    expect(noExitSystem.isInCombat('p1')).toBe(false);
    expect(noExitSystem.isInCombat('p2')).toBe(false);
  });

  it('should handle combat with creatures', () => {
    const player = makePlayer('p1');
    const creature = makeCreature('goblin', TEST_ROOM, { maxHp: 30, unarmed: 5, armour: 1 });
    system.registerCombatant(player);
    system.registerCombatant(creature);
    system.initiateCombat('p1', 'goblin');

    // Player strikes (auto-queued), creature auto-attacks back (GDD §6.1: auto-attack on aggro)
    system.resolveTick();

    // Player took: 5 * 1.0 - 2 = 3 damage
    expect(player.hp).toBe(100 - 3);

    // Creature took: 5 * 1.0 - 1 = 4 damage
    expect(creature.hp).toBe(30 - 4);
  });

  it('should handle multi-combatant fight (3-way)', () => {
    const p1 = makePlayer('p1');
    const p2 = makePlayer('p2');
    const p3 = makePlayer('p3');
    system.registerCombatant(p1);
    system.registerCombatant(p2);
    system.registerCombatant(p3);

    // p1 attacks p2, which creates an encounter
    system.initiateCombat('p1', 'p2');
    // p3 joins the existing encounter by attacking p1
    system.initiateCombat('p3', 'p1');

    // p1 strikes p2 (auto from first initiate), p3 strikes p1 (auto from second initiate)
    // p2 auto-attacks p1 (GDD §6.1: auto-attack on aggro)

    system.resolveTick();

    // p2 was struck by p1: 5 * 1.0 - 2 = 3 (both striking)
    expect(p2.hp).toBe(100 - 3);

    // p1 was struck by both p3 and p2: 2 * (5 * 1.0 - 2) = 6
    expect(p1.hp).toBe(100 - 6);

    // p3 was not struck by anyone (p1 targeted p2, p2 targeted p1)
    expect(p3.hp).toBe(100);
  });

  it('should clear queued actions after tick resolution', () => {
    const p1 = makePlayer('p1');
    const p2 = makePlayer('p2');
    system.registerCombatant(p1);
    system.registerCombatant(p2);
    system.initiateCombat('p1', 'p2');

    // First tick with auto-queued strike
    system.resolveTick();

    // Second tick — no actions submitted, both auto-attack (GDD §6.1)
    const result = system.resolveTick();
    const strikes = result.events.filter((e) => e.type === 'strike');
    expect(strikes).toHaveLength(2);
  });

  it('should pick default target when strike has no target specified', () => {
    const p1 = makePlayer('p1');
    const p2 = makePlayer('p2');
    system.registerCombatant(p1);
    system.registerCombatant(p2);
    system.initiateCombat('p1', 'p2');

    system.resolveTick(); // consume auto-queued

    // Submit strike without target
    system.submitAction('p1', 'strike');

    const result = system.resolveTick();
    const strikes = result.events.filter((e) => e.type === 'strike');
    expect(strikes).toHaveLength(2); // Both p1 and p2 strike
    const p1Strike = strikes.find(s => s.actorId === 'p1');
    expect(p1Strike?.targetId).toBe('p2'); // p1's strike picked default target
  });

  it('should remove combatant on disconnect', () => {
    const p1 = makePlayer('p1');
    const p2 = makePlayer('p2');
    system.registerCombatant(p1);
    system.registerCombatant(p2);
    system.initiateCombat('p1', 'p2');

    expect(system.isInCombat('p1')).toBe(true);
    expect(system.isInCombat('p2')).toBe(true);

    // p2 disconnects
    system.removeCombatant('p2');

    // Encounter should be cleaned up (only 1 combatant left)
    expect(system.isInCombat('p1')).toBe(false);
    expect(system.isInCombat('p2')).toBe(false);
    expect(system.hasActiveEncounters()).toBe(false);
  });

  it('should not allow actions from non-combatants', () => {
    const result = system.submitAction('nobody', 'strike');
    expect(result).toBe(false);
  });

  it('should return empty result when no encounters active', () => {
    const result = system.resolveTick();
    expect(result.events).toHaveLength(0);
    expect(result.fleeResults).toHaveLength(0);
    expect(result.endedEncounterIds).toHaveLength(0);
  });
});

// ─── HP Tracking Tests ────────────────────────────────────────────────────

describe('HP Tracking', () => {
  let system: CombatSystem;

  beforeEach(() => {
    system = new CombatSystem(testExitResolver);
  });

  it('should track HP across multiple ticks', () => {
    const p1 = makePlayer('p1');
    const p2 = makePlayer('p2');
    system.registerCombatant(p1);
    system.registerCombatant(p2);
    system.initiateCombat('p1', 'p2');

    // Tick 1: both auto-attack (GDD §6.1). Both take 3 damage (5*1.0-2=3)
    system.resolveTick();
    expect(p1.hp).toBe(97);
    expect(p2.hp).toBe(97);

    // Tick 2: both auto-attack again
    system.resolveTick();

    // Both take another 3 damage
    expect(p1.hp).toBe(94);
    expect(p2.hp).toBe(94);

    // Tick 3: p1 strikes, p2 strikes back
    system.submitAction('p1', 'strike', 'p2');
    system.submitAction('p2', 'strike', 'p1');
    system.resolveTick();

    // Both take 3 more (strike vs strike: 5*1.0-2=3)
    expect(p2.hp).toBe(91);
    expect(p1.hp).toBe(91);
  });

  it('should clamp HP at 0 on defeat', () => {
    const p1 = makePlayer('p1', TEST_ROOM, { unarmed: 50 });
    const p2 = makePlayer('p2', TEST_ROOM, { maxHp: 10 });
    p2.hp = 10;
    system.registerCombatant(p1);
    system.registerCombatant(p2);
    system.initiateCombat('p1', 'p2');

    system.resolveTick();

    // p2 HP should be exactly 0, not negative
    expect(p2.hp).toBe(0);
  });
});

// ─── Combat Initiation Tests ──────────────────────────────────────────────

describe('Combat Initiation', () => {
  let system: CombatSystem;

  beforeEach(() => {
    system = new CombatSystem(testExitResolver);
  });

  it('should create an encounter on attack', () => {
    const p1 = makePlayer('p1');
    const p2 = makePlayer('p2');
    system.registerCombatant(p1);
    system.registerCombatant(p2);

    const encId = system.initiateCombat('p1', 'p2');
    expect(encId).not.toBeNull();
    expect(system.isInCombat('p1')).toBe(true);
    expect(system.isInCombat('p2')).toBe(true);
  });

  it('should reject combat between combatants in different rooms', () => {
    const p1 = makePlayer('p1', 'room-1');
    const p2 = makePlayer('p2', 'room-2');
    system.registerCombatant(p1);
    system.registerCombatant(p2);

    const encId = system.initiateCombat('p1', 'p2');
    expect(encId).toBeNull();
  });

  it('should reject combat with unregistered combatants', () => {
    const p1 = makePlayer('p1');
    system.registerCombatant(p1);

    const encId = system.initiateCombat('p1', 'ghost');
    expect(encId).toBeNull();
  });

  it('should join existing encounter in same room', () => {
    const p1 = makePlayer('p1');
    const p2 = makePlayer('p2');
    const p3 = makePlayer('p3');
    system.registerCombatant(p1);
    system.registerCombatant(p2);
    system.registerCombatant(p3);

    const enc1 = system.initiateCombat('p1', 'p2');
    const enc2 = system.initiateCombat('p3', 'p1');

    // Should be the same encounter
    expect(enc1).toBe(enc2);
  });
});

// ─── Flee Mechanics Tests ─────────────────────────────────────────────────

describe('Flee Mechanics', () => {
  // Use a roll function that always succeeds for flee tests
  const successRoll = () => 0.0;
  let system: CombatSystem;

  beforeEach(() => {
    system = new CombatSystem(testExitResolver, successRoll);
  });

  it('should move fleeing combatant to specified room', () => {
    const p1 = makePlayer('p1');
    const p2 = makePlayer('p2');
    system.registerCombatant(p1);
    system.registerCombatant(p2);
    system.initiateCombat('p1', 'p2');

    system.submitAction('p1', 'flee', undefined, ADJACENT_ROOM);

    const result = system.resolveTick();
    expect(result.fleeResults[0]!.toRoomId).toBe(ADJACENT_ROOM);
    expect(p1.roomId).toBe(ADJACENT_ROOM);
  });

  it('fleeing combatant takes full strike damage (no defence)', () => {
    // Use a roll that succeeds flee (0.35 < 50% flee chance) but fails dodge (0.35 >= 30% dodge chance)
    const fleeNoDodge = new CombatSystem(testExitResolver, () => 0.35);
    const p1 = makePlayer('p1');
    const p2 = makePlayer('p2');
    fleeNoDodge.registerCombatant(p1);
    fleeNoDodge.registerCombatant(p2);
    fleeNoDodge.initiateCombat('p1', 'p2');

    // p1 strikes (auto), p2 flees
    fleeNoDodge.submitAction('p2', 'flee');

    const result = fleeNoDodge.resolveTick();

    // p2 took full damage: 5 * 1.0 - 2 = 3 (flee offers no protection, dodge failed)
    expect(p2.hp).toBe(100 - 3);
    // But p2 still fled successfully
    expect(result.fleeResults).toHaveLength(1);
  });

  it('should end combat immediately when last opponent flees', () => {
    const p1 = makePlayer('p1');
    const p2 = makePlayer('p2');
    system.registerCombatant(p1);
    system.registerCombatant(p2);
    system.initiateCombat('p1', 'p2');

    // Tick 1: p2 flees — combat ends immediately
    system.submitAction('p2', 'flee');
    const result1 = system.resolveTick();
    expect(result1.fleeResults).toHaveLength(1);
    expect(result1.endedEncounterIds).toHaveLength(1);
    expect(system.isInCombat('p1')).toBe(false);
  });
});

// ─── Resolution Order Tests ───────────────────────────────────────────────

describe('Resolution Order (Simultaneous)', () => {
  it('damage is calculated from start-of-tick HP', () => {
    const system = new CombatSystem(testExitResolver);

    // Both combatants have low HP — if order mattered, one would die before attacking
    const p1 = makePlayer('p1', TEST_ROOM, { maxHp: 10, unarmed: 15 });
    p1.hp = 10;
    const p2 = makePlayer('p2', TEST_ROOM, { maxHp: 10, unarmed: 15 });
    p2.hp = 10;

    system.registerCombatant(p1);
    system.registerCombatant(p2);
    system.initiateCombat('p1', 'p2');
    system.submitAction('p2', 'strike', 'p1');

    const result = system.resolveTick();

    // Both should have attacked (simultaneous), both defeated
    const strikes = result.events.filter((e) => e.type === 'strike');
    expect(strikes).toHaveLength(2);

    // Both should be at 0 HP
    expect(p1.hp).toBe(0);
    expect(p2.hp).toBe(0);
  });
});

// ─── Stale Combatant Cleanup Tests ────────────────────────────────────────

describe('Stale Combatant Cleanup', () => {
  let system: CombatSystem;

  beforeEach(() => {
    system = new CombatSystem(testExitResolver);
    system.setRollFn(() => 1); // All flee rolls fail by default
  });

  it('should remove surviving player combatant when encounter ends', () => {
    const player = makePlayer('player-1');
    const creature = makeCreature('creature-1', TEST_ROOM, { maxHp: 1, unarmed: 0 });

    system.registerCombatant(player);
    system.registerCombatant(creature);
    system.initiateCombat('player-1', 'creature-1');

    // Player strikes and kills creature in one hit — combat ends immediately
    const result = system.resolveTick();
    expect(result.events.some(e => e.type === 'defeated' && e.actorId === 'creature-1')).toBe(true);
    expect(system.hasActiveEncounters()).toBe(false);

    // After encounter cleanup, the player's stale combatant should be gone
    expect(system.getCombatant('player-1')).toBeUndefined();
    expect(system.isInCombat('player-1')).toBe(false);
  });

  it('should allow combat in new room after previous encounter cleanup', () => {
    const player = makePlayer('player-1');
    const creature1 = makeCreature('creature-1', TEST_ROOM, { maxHp: 1, unarmed: 0 });

    system.registerCombatant(player);
    system.registerCombatant(creature1);
    system.initiateCombat('player-1', 'creature-1');

    // Kill creature — combat ends immediately
    system.resolveTick();
    expect(system.hasActiveEncounters()).toBe(false);

    // Player "moves" to a new room — re-register with new roomId
    const ROOM_B = 'room-b';
    const playerInRoomB = makePlayer('player-1', ROOM_B);
    const creature2 = makeCreature('creature-2', ROOM_B, { maxHp: 10, unarmed: 1 });

    system.registerCombatant(playerInRoomB);
    system.registerCombatant(creature2);

    // This should succeed — both combatants in room-b
    const encId = system.initiateCombat('creature-2', 'player-1');
    expect(encId).not.toBeNull();
  });

  it('updateCombatantRoom keeps roomId in sync', () => {
    const player = makePlayer('player-1');
    system.registerCombatant(player);

    system.updateCombatantRoom('player-1', 'room-new');
    expect(system.getCombatant('player-1')?.roomId).toBe('room-new');
  });

  it('updateCombatantRoom is no-op for unknown combatant', () => {
    // Should not throw
    system.updateCombatantRoom('nonexistent', 'room-new');
  });
});

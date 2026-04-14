/**
 * Combat Bug Fixes — Playtesting Regressions
 *
 * Tests for bugs identified during live playtesting:
 * - Bug 1: Post-death combat bleed (encounter cleanup on removeCombatant)
 * - Bug 2: HP display stacking within a tick (running tally)
 * - Bug 3: Post-defeat actions (defeated combatants suppress strikes)
 * - Bug 4: Shield block without shield (shieldBlock=0 without equipment)
 * - Bug 5: Flee narration differentiation (no exits vs failed roll)
 * - Bug 6: Combat events carry roomId for scoped delivery
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CombatSystem } from '../combat/CombatSystem.js';
import { createCombatant, DEFAULT_PLAYER_STATS, type Combatant } from '../combat/CombatState.js';
import { resolveFlee } from '../combat/actions.js';
import { calculatePlayerEffectiveStats, calculateEquipmentBonuses } from '../combat/stats.js';

const stubExits = (_roomId: string) => ['room-2', 'room-3'];
const noExits = (_roomId: string): string[] => [];

function makePlayer(id: string, name: string, roomId = 'room-1', opts?: { attack?: number; maxHp?: number; dodge?: number; shieldBlock?: number }): Combatant {
  return createCombatant(id, name, roomId, true, opts);
}

function makeCreature(id: string, name: string, roomId = 'room-1', opts?: { attack?: number; maxHp?: number }): Combatant {
  return createCombatant(`creature-${id}`, name, roomId, false, opts);
}

// ─── Bug 1: Post-death combat bleed (encounter cleanup) ──────────────────

describe('Bug 1: Encounter cleanup on removeCombatant', () => {
  let combat: CombatSystem;

  beforeEach(() => {
    combat = new CombatSystem(stubExits, () => 0.99);
  });

  it('removeCombatant ends encounter when only same-side combatants remain (1p vs 2c)', () => {
    const player = makePlayer('p1', 'Hero');
    const c1 = makeCreature('orc1', 'Orc A');
    const c2 = makeCreature('orc2', 'Orc B');

    combat.registerCombatant(player);
    combat.registerCombatant(c1);
    combat.registerCombatant(c2);
    combat.initiateCombat(player.id, c1.id);
    combat.initiateCombat(c2.id, player.id);

    // Manually remove the player (simulating death + ZoneRoom cleanup)
    combat.removeCombatant(player.id);

    // Encounter should be cleaned up — no hostile pairs remain
    expect(combat.hasActiveEncounters()).toBe(false);
    expect(combat['encounters'].size).toBe(0);
  });

  it('removeCombatant preserves encounter when hostile pairs still exist (2p vs 1c)', () => {
    const p1 = makePlayer('p1', 'Hero');
    const p2 = makePlayer('p2', 'Sidekick');
    const c1 = makeCreature('orc', 'Orc');

    combat.registerCombatant(p1);
    combat.registerCombatant(p2);
    combat.registerCombatant(c1);
    combat.initiateCombat(p1.id, c1.id);
    combat.initiateCombat(p2.id, c1.id);

    // Remove one player — encounter should continue (p2 vs orc)
    combat.removeCombatant(p1.id);
    expect(combat.hasActiveEncounters()).toBe(true);
  });

  it('no combat events generated for removed player on subsequent ticks', () => {
    const player = makePlayer('p1', 'Syl', 'room-1', { maxHp: 1, attack: 5 });
    const c1 = makeCreature('hog', 'Feral Hog', 'room-1', { attack: 200 });

    combat.registerCombatant(player);
    combat.registerCombatant(c1);
    combat.initiateCombat(player.id, c1.id);

    // Tick 1: player dies
    const tick1 = combat.resolveTick();
    expect(tick1.events.some(e => e.type === 'defeated' && e.actorId === player.id)).toBe(true);

    // Simulate ZoneRoom cleanup
    combat.removeCombatant(player.id);

    // Tick 2: no encounter should exist
    const tick2 = combat.resolveTick();
    expect(tick2.events).toHaveLength(0);
  });
});

// ─── Bug 2: HP display stacking (running tally) ──────────────────────────

describe('Bug 2: Running HP tally within a tick', () => {
  it('multiple hits show cumulative HP, not identical post-tick snapshot', () => {
    const combat = new CombatSystem(stubExits, () => 0.99); // no dodge/block
    const target = makePlayer('p1', 'Syl', 'room-1', { maxHp: 100, attack: 1 });
    const c1 = makeCreature('hog1', 'Hog A', 'room-1', { attack: 12, maxHp: 500 });
    const c2 = makeCreature('hog2', 'Hog B', 'room-1', { attack: 12, maxHp: 500 });

    combat.registerCombatant(target);
    combat.registerCombatant(c1);
    combat.registerCombatant(c2);
    combat.initiateCombat(c1.id, target.id);
    combat.initiateCombat(c2.id, target.id);
    combat.submitAction(c1.id, 'strike', target.id);
    combat.submitAction(c2.id, 'strike', target.id);

    const result = combat.resolveTick();

    // Get strikes targeting the player
    const strikesOnPlayer = result.events.filter(
      e => e.type === 'strike' && e.targetId === target.id && !e.dodged && !e.blocked,
    );
    expect(strikesOnPlayer.length).toBeGreaterThanOrEqual(2);

    // Each strike should show a DIFFERENT newHp value (running tally)
    const hpValues = strikesOnPlayer.map(e => e.newHp);
    const uniqueValues = new Set(hpValues);
    expect(uniqueValues.size).toBe(strikesOnPlayer.length);

    // HP should be strictly decreasing
    for (let i = 1; i < hpValues.length; i++) {
      expect(hpValues[i]!).toBeLessThan(hpValues[i - 1]!);
    }
  });
});

// ─── Bug 3: Post-defeat actions (defeated combatants don't strike) ───────

describe('Bug 3: Defeated combatants generate no strikes', () => {
  it('player who dies this tick has their strikes suppressed', () => {
    const combat = new CombatSystem(stubExits, () => 0.99);
    const player = makePlayer('p1', 'Syl', 'room-1', { maxHp: 1, attack: 5 });
    const creature = makeCreature('hog', 'Feral Hog', 'room-1', { attack: 200, maxHp: 500 });

    combat.registerCombatant(player);
    combat.registerCombatant(creature);
    combat.initiateCombat(player.id, creature.id);
    combat.submitAction(player.id, 'strike', creature.id);
    combat.submitAction(creature.id, 'strike', player.id);

    const result = combat.resolveTick();

    // Player should be defeated
    expect(result.events.some(e => e.type === 'defeated' && e.actorId === player.id)).toBe(true);

    // Player's strike should be SUPPRESSED (they died this tick)
    const playerStrikes = result.events.filter(
      e => e.type === 'strike' && e.actorId === player.id,
    );
    expect(playerStrikes).toHaveLength(0);

    // Creature's strike should still show
    const creatureStrikes = result.events.filter(
      e => e.type === 'strike' && e.actorId === creature.id,
    );
    expect(creatureStrikes).toHaveLength(1);
  });
});

// ─── Bug 4: Shield block without shield ──────────────────────────────────

describe('Bug 4: No shield block without shield equipped', () => {
  it('effective shieldBlock is 0 when no shield in off_hand', () => {
    const base = DEFAULT_PLAYER_STATS;
    const noEquipment = calculateEquipmentBonuses([]);
    const effective = calculatePlayerEffectiveStats(base, noEquipment);
    expect(effective.shieldBlock).toBe(0);
  });

  it('effective shieldBlock > 0 when shield is equipped', () => {
    const base = DEFAULT_PLAYER_STATS;
    const withShield = calculateEquipmentBonuses([
      { slot: 'off_hand', stats: { shieldBlock: 3 } },
    ]);
    const effective = calculatePlayerEffectiveStats(base, withShield);
    // base(5) + equipment(3) = 8
    expect(effective.shieldBlock).toBe(8);
  });

  it('weapon-only loadout has no block capability', () => {
    const base = DEFAULT_PLAYER_STATS;
    const weaponOnly = calculateEquipmentBonuses([
      { slot: 'main_hand', stats: { weaponType: 'one_handed', weaponDamage: 8 } },
    ]);
    const effective = calculatePlayerEffectiveStats(base, weaponOnly);
    expect(effective.shieldBlock).toBe(0);
  });
});

// ─── Bug 5: Flee narration differentiation ───────────────────────────────

describe('Bug 5: Flee narration differentiates failure reasons', () => {
  it('no exits → "there is no escape"', () => {
    const c = createCombatant('p1', 'Runner', 'room-1', true);
    const event = resolveFlee(c, false, undefined, 'no_exits');
    expect(event.narration).toContain('no escape');
  });

  it('failed roll → "can\'t break free"', () => {
    const c = createCombatant('p1', 'Runner', 'room-1', true);
    const event = resolveFlee(c, false, undefined, 'failed_roll');
    expect(event.narration).toContain("can't break free");
  });

  it('CombatSystem uses "no_exits" when room has no exits', () => {
    const combat = new CombatSystem(noExits, () => 0.1);
    const player = makePlayer('p1', 'Runner');
    const creature = makeCreature('mob', 'Goblin');
    combat.registerCombatant(player);
    combat.registerCombatant(creature);
    combat.initiateCombat(player.id, creature.id);
    combat.submitAction(player.id, 'flee');

    const result = combat.resolveTick();
    const fleeEvent = result.events.find(e => e.type === 'flee');
    expect(fleeEvent?.narration).toContain('no escape');
  });

  it('CombatSystem uses "failed_roll" when flee roll fails', () => {
    const combat = new CombatSystem(stubExits, () => 0.99); // high roll = fail
    const player = makePlayer('p1', 'Runner', 'room-1', { dodge: 0 });
    const creature = makeCreature('mob', 'Goblin');
    combat.registerCombatant(player);
    combat.registerCombatant(creature);
    combat.initiateCombat(player.id, creature.id);
    combat.submitAction(player.id, 'flee');

    const result = combat.resolveTick();
    const fleeEvent = result.events.find(e => e.type === 'flee');
    expect(fleeEvent?.narration).toContain("can't break free");
  });
});

// ─── Bug 6: Combat events carry roomId ───────────────────────────────────

describe('Bug 6: Combat events carry roomId for scoped delivery', () => {
  it('strike events include roomId', () => {
    const combat = new CombatSystem(stubExits, () => 0.99);
    const p1 = makePlayer('p1', 'Hero', 'room-1');
    const c1 = makeCreature('orc', 'Orc', 'room-1');

    combat.registerCombatant(p1);
    combat.registerCombatant(c1);
    combat.initiateCombat(p1.id, c1.id);

    const result = combat.resolveTick();
    const strikes = result.events.filter(e => e.type === 'strike');
    expect(strikes.length).toBeGreaterThan(0);
    for (const s of strikes) {
      expect(s.roomId).toBe('room-1');
    }
  });

  it('defeated events include roomId', () => {
    const combat = new CombatSystem(stubExits, () => 0.99);
    const p1 = makePlayer('p1', 'Hero', 'room-1', { maxHp: 1 });
    const c1 = makeCreature('orc', 'Orc', 'room-1', { attack: 200 });

    combat.registerCombatant(p1);
    combat.registerCombatant(c1);
    combat.initiateCombat(p1.id, c1.id);

    const result = combat.resolveTick();
    const defeated = result.events.find(e => e.type === 'defeated');
    expect(defeated?.roomId).toBe('room-1');
  });

  it('combat_end events include roomId', () => {
    const combat = new CombatSystem(stubExits, () => 0.99);
    const p1 = makePlayer('p1', 'Hero', 'room-1', { maxHp: 1 });
    const c1 = makeCreature('orc', 'Orc', 'room-1', { attack: 200 });

    combat.registerCombatant(p1);
    combat.registerCombatant(c1);
    combat.initiateCombat(p1.id, c1.id);

    const result = combat.resolveTick();
    const combatEnd = result.events.find(e => e.type === 'combat_end');
    expect(combatEnd?.roomId).toBe('room-1');
  });

  it('flee events include roomId', () => {
    const combat = new CombatSystem(stubExits, () => 0.1); // low roll = success
    const p1 = makePlayer('p1', 'Runner', 'room-1', { dodge: 5 });
    const c1 = makeCreature('orc', 'Orc', 'room-1');

    combat.registerCombatant(p1);
    combat.registerCombatant(c1);
    combat.initiateCombat(p1.id, c1.id);
    combat.submitAction(p1.id, 'flee');

    const result = combat.resolveTick();
    const flee = result.events.find(e => e.type === 'flee');
    expect(flee?.roomId).toBe('room-1');
  });
});

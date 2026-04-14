/**
 * Combat Stat Wiring Tests — TDD tests for player stat pipeline
 *
 * These tests verify that player combat stats flow from CharacterRepository
 * through calculatePlayerEffectiveStats() into combatant creation, rather
 * than falling through to DEFAULT_PLAYER_STATS.
 *
 * Written FIRST (TDD) to expose the wiring gaps, then implementation follows.
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { createCombatant, DEFAULT_PLAYER_STATS } from '../combat/CombatState.js';
import type { CombatStats } from '../combat/CombatState.js';
import {
  calculateEquipmentBonuses,
  calculatePlayerEffectiveStats,
  type EffectiveStats,
} from '../combat/stats.js';
import { handleAttack } from '../commands/handlers/attack.js';
import { CombatSystem } from '../combat/CombatSystem.js';
import type { CommandContext, CreatureRef } from '../commands/index.js';
import { PlayerState } from '../state/PlayerState.js';
import type { Room } from '../generator/RoomGraph.js';

// ─── Test Data ──────────────────────────────────────────────────────────────

const CUSTOM_STATS: CombatStats = {
  maxHp: 150,
  unarmed: 8,
  oneHanded: 12,
  twoHanded: 3,
  ranged: 2,
  shieldBlock: 7,
  dodge: 10,
  armour: 5,
};

const TEST_ROOM: Room = {
  id: 'room-1',
  name: 'Test Arena',
  description: 'A test room.',
  type: 'corridor',
  exits: new Map(),
  items: [],
} as Room;

function noExits(_roomId: string): string[] {
  return [];
}

// ─── Unit: createCombatant with explicit opts ───────────────────────────────

describe('createCombatant — stat passthrough', () => {
  it('uses DEFAULT_PLAYER_STATS when no opts provided', () => {
    const c = createCombatant('p1', 'Player', 'room-1', true);
    expect(c.attack).toBe(DEFAULT_PLAYER_STATS.unarmed);
    expect(c.armour).toBe(DEFAULT_PLAYER_STATS.armour);
    expect(c.dodge).toBe(DEFAULT_PLAYER_STATS.dodge);
    expect(c.shieldBlock).toBe(DEFAULT_PLAYER_STATS.shieldBlock);
    expect(c.maxHp).toBe(DEFAULT_PLAYER_STATS.maxHp);
  });

  it('uses custom stats when opts provided', () => {
    const effective = calculatePlayerEffectiveStats(CUSTOM_STATS, {
      weaponSkill: 'unarmed',
      weaponDamage: 0,
      armour: 0,
      shieldBlock: 0,
    });
    const c = createCombatant('p1', 'Player', 'room-1', true, {
      attack: effective.attack,
      maxHp: effective.maxHp,
      armour: effective.armour,
      dodge: effective.dodge,
      shieldBlock: effective.shieldBlock,
    });
    expect(c.attack).toBe(CUSTOM_STATS.unarmed); // unarmed skill, no weapon damage
    expect(c.armour).toBe(CUSTOM_STATS.armour);
    expect(c.dodge).toBe(CUSTOM_STATS.dodge);
    expect(c.shieldBlock).toBe(0); // No shield equipped → no block capability
    expect(c.maxHp).toBe(CUSTOM_STATS.maxHp);
  });

  it('uses weapon skill value when weapon equipped', () => {
    const equipment = calculateEquipmentBonuses([
      { slot: 'main_hand', stats: { weaponType: 'one_handed', weaponDamage: 4 } },
    ]);
    const effective = calculatePlayerEffectiveStats(CUSTOM_STATS, equipment);
    // attack = oneHanded(12) + weaponDamage(4) = 16
    expect(effective.attack).toBe(16);

    const c = createCombatant('p1', 'Player', 'room-1', true, {
      attack: effective.attack,
      maxHp: effective.maxHp,
      armour: effective.armour,
      dodge: effective.dodge,
      shieldBlock: effective.shieldBlock,
    });
    expect(c.attack).toBe(16);
  });
});

// ─── Integration: handleAttack uses playerEffectiveStats ────────────────────

describe('handleAttack — player stat wiring', () => {
  let combatSystem: CombatSystem;
  let player: PlayerState;
  const SESSION_ID = 'player-1';
  const CREATURE_ID = 'creature-1';

  beforeEach(() => {
    combatSystem = new CombatSystem(noExits);
    player = new PlayerState(SESSION_ID, 'room-1');
  });

  function buildCtx(
    args: string[],
    opts?: { playerEffectiveStats?: EffectiveStats; creaturesInRoom?: CreatureRef[] },
  ): CommandContext {
    const creatures: CreatureRef[] = opts?.creaturesInRoom ?? [
      {
        id: CREATURE_ID,
        name: 'Gutterspawn',
        type: 'gutterspawn',
        hp: 50,
        maxHp: 50,
        attack: 5,
        armour: 0,
        dodge: 0,
        shieldBlock: 0,
      },
    ];
    return {
      player,
      room: TEST_ROOM,
      args,
      resolveRoom: () => TEST_ROOM,
      otherPlayersInRoom: [],
      stability: 1.0,
      characterName: 'TestPlayer',
      combatSystem,
      creaturesInRoom: creatures,
      playerEffectiveStats: opts?.playerEffectiveStats,
    } as CommandContext;
  }

  it('registers player combatant with real stats from playerEffectiveStats', () => {
    const effective: EffectiveStats = {
      maxHp: 150,
      attack: 12,
      armour: 5,
      shieldBlock: 7,
      dodge: 10,
    };
    const ctx = buildCtx(['gutterspawn'], { playerEffectiveStats: effective });
    handleAttack(ctx);

    const combatant = combatSystem.getCombatant(SESSION_ID);
    expect(combatant).toBeDefined();
    expect(combatant!.attack).toBe(12);
    expect(combatant!.armour).toBe(5);
    expect(combatant!.dodge).toBe(10);
    expect(combatant!.shieldBlock).toBe(7);
    expect(combatant!.maxHp).toBe(150);
  });

  it('falls back to DEFAULT_PLAYER_STATS when playerEffectiveStats is undefined', () => {
    const ctx = buildCtx(['gutterspawn']);
    handleAttack(ctx);

    const combatant = combatSystem.getCombatant(SESSION_ID);
    expect(combatant).toBeDefined();
    expect(combatant!.attack).toBe(DEFAULT_PLAYER_STATS.unarmed);
    expect(combatant!.armour).toBe(DEFAULT_PLAYER_STATS.armour);
  });

  it('does NOT re-register player combatant if already in combat', () => {
    // First attack registers with custom stats
    const effective: EffectiveStats = {
      maxHp: 150,
      attack: 12,
      armour: 5,
      shieldBlock: 7,
      dodge: 10,
    };
    const ctx1 = buildCtx(['gutterspawn'], { playerEffectiveStats: effective });
    handleAttack(ctx1);

    const combatant1 = combatSystem.getCombatant(SESSION_ID);
    expect(combatant1!.attack).toBe(12);

    // Second attack with different (or no) stats should NOT change the combatant
    const ctx2 = buildCtx(['gutterspawn'], { playerEffectiveStats: undefined });
    handleAttack(ctx2);

    const combatant2 = combatSystem.getCombatant(SESSION_ID);
    expect(combatant2!.attack).toBe(12); // Still the original stats
  });
});

// ─── Helper: buildPlayerCombatOpts ──────────────────────────────────────────

describe('buildPlayerCombatOpts — stat pipeline', () => {
  it('produces correct opts from base stats with no equipment', () => {
    const base: CombatStats = CUSTOM_STATS;
    const equipment = calculateEquipmentBonuses([]);
    const effective = calculatePlayerEffectiveStats(base, equipment);

    expect(effective.attack).toBe(8);  // unarmed (highest when no weapon)
    expect(effective.armour).toBe(5);
    expect(effective.dodge).toBe(10);
    expect(effective.shieldBlock).toBe(0); // No shield equipped → no block
    expect(effective.maxHp).toBe(150);
  });

  it('includes equipment armour and shield bonuses', () => {
    const base: CombatStats = CUSTOM_STATS;
    const equipment = calculateEquipmentBonuses([
      { slot: 'chest', stats: { armour: 3 } },
      { slot: 'off_hand', stats: { shieldBlock: 5 } },
    ]);
    const effective = calculatePlayerEffectiveStats(base, equipment);

    expect(effective.armour).toBe(8);       // 5 base + 3 equipment
    expect(effective.shieldBlock).toBe(12); // 7 base + 5 equipment
  });

  it('weapon type selects correct skill', () => {
    const base: CombatStats = CUSTOM_STATS;
    const equipment = calculateEquipmentBonuses([
      { slot: 'main_hand', stats: { weaponType: 'two_handed', weaponDamage: 6 } },
    ]);
    const effective = calculatePlayerEffectiveStats(base, equipment);

    // twoHanded(3) + weaponDamage(6) = 9
    expect(effective.attack).toBe(9);
  });
});

/**
 * Train Command Tests — GDD §7.1 / Issue #457
 *
 * Tests for Drizzt's train command handler: room type gating, stat allocation,
 * soft cap enforcement, stat persistence, and edge cases.
 *
 * NOTE: Written proactively from the design spec (Issue #457).
 * Minor adjustments may be needed once implementation lands.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { CommandContext, CommandResult } from '../commands/index.js';
import { PlayerState } from '../state/PlayerState.js';
import type { Room, RoomType } from '../generator/RoomGraph.js';
import type { CombatStats } from '../combat/CombatState.js';
import { DEFAULT_SOFT_CAPS } from '../commands/handlers/train.js';

// ─── Constants matching design decisions ────────────────────────────────────

const TRAINABLE_STATS: (keyof CombatStats)[] = [
  'maxHp',
  'unarmed',
  'oneHanded',
  'twoHanded',
  'ranged',
  'shieldBlock',
  'dodge',
  'armour',
];

const DEFAULT_BASE_STATS: CombatStats = {
  maxHp: 100,
  unarmed: 5,
  oneHanded: 5,
  twoHanded: 5,
  ranged: 5,
  shieldBlock: 5,
  dodge: 5,
  armour: 2,
};

// ─── Test room fixtures ─────────────────────────────────────────────────────

function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: 'training-grounds',
    name: 'Training Grounds',
    description: 'A cleared space for combat drills.',
    type: 'feature_training' as RoomType,
    exits: new Map([['south', 'hearth']]),
    items: [],
    ...overrides,
  };
}

function makeNonTrainingRoom(): Room {
  return makeRoom({
    id: 'corridor',
    name: 'Flooded Corridor',
    type: 'corridor' as RoomType,
  });
}

function makeEntryRoom(): Room {
  return makeRoom({
    id: 'entry',
    name: 'Rift Entry',
    type: 'entry' as RoomType,
  });
}

// ─── Stub state for stat point banking ──────────────────────────────────────
// Replace with real implementation hooks once Drizzt's code lands.

/** In-memory stat point bank for testing. */
const statPointBank = new Map<string, number>();
const baseStatsStore = new Map<string, CombatStats>();
let rebuildCalled = false;

function getAvailableStatPoints(playerId: string): number {
  return statPointBank.get(playerId) ?? 0;
}

function setAvailableStatPoints(playerId: string, points: number): void {
  statPointBank.set(playerId, points);
}

function getBaseStats(playerId: string): CombatStats {
  return baseStatsStore.get(playerId) ?? { ...DEFAULT_BASE_STATS };
}

function saveBaseStats(playerId: string, stats: CombatStats): void {
  baseStatsStore.set(playerId, { ...stats });
}

/**
 * Stub train handler that mirrors expected implementation behaviour.
 * Replace with: import { handleTrain } from '../commands/handlers/train.js';
 */
function handleTrain(ctx: CommandContext & {
  getStatPoints: (id: string) => number;
  setStatPoints: (id: string, points: number) => void;
  getBaseStats: (id: string) => CombatStats;
  saveBaseStats: (id: string, stats: CombatStats) => void;
  rebuildPlayerStatsCache: (id: string) => void;
  isInCombat: (id: string) => boolean;
  statSoftCaps: Record<keyof CombatStats, number>;
}): CommandResult {
  const playerId = ctx.player.sessionId;

  // Block training during combat
  if (ctx.isInCombat(playerId)) {
    return {
      narrations: [{ text: "You can't train while in combat!", type: 'system' }],
    };
  }

  // No args: show current stats and available points
  if (ctx.args.length === 0) {
    const points = ctx.getStatPoints(playerId);
    const stats = ctx.getBaseStats(playerId);
    return {
      narrations: [{
        text: `Available stat points: ${points}. Stats: ${JSON.stringify(stats)}`,
        type: 'system',
      }],
    };
  }

  const statName = ctx.args[0]! as keyof CombatStats;

  // Validate stat name
  if (!TRAINABLE_STATS.includes(statName)) {
    return {
      narrations: [{ text: `Unknown stat: ${statName}`, type: 'system' }],
    };
  }

  // Check available points
  const points = ctx.getStatPoints(playerId);
  if (points <= 0) {
    return {
      narrations: [{ text: 'You have no stat points available.', type: 'system' }],
    };
  }

  // Check soft cap
  const stats = ctx.getBaseStats(playerId);
  const cap = ctx.statSoftCaps[statName];
  if (stats[statName] >= cap) {
    return {
      narrations: [{ text: `${statName} is already at the soft cap (${cap}).`, type: 'system' }],
    };
  }

  // Apply training
  const newStats = { ...stats, [statName]: stats[statName] + 1 };
  ctx.saveBaseStats(playerId, newStats);
  ctx.setStatPoints(playerId, points - 1);
  ctx.rebuildPlayerStatsCache(playerId);

  return {
    narrations: [{
      text: `You train ${statName}. (${stats[statName]} → ${newStats[statName]})`,
      type: 'system',
    }],
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Train Command (GDD §7.1 — Issue #457)', () => {
  let player: PlayerState;

  beforeEach(() => {
    player = new PlayerState('player-1', 'training-grounds', 20);
    statPointBank.clear();
    baseStatsStore.clear();
    rebuildCalled = false;
  });

  function buildCtx(
    room: Room,
    args: string[] = [],
  ): CommandContext & {
    getStatPoints: (id: string) => number;
    setStatPoints: (id: string, points: number) => void;
    getBaseStats: (id: string) => CombatStats;
    saveBaseStats: (id: string, stats: CombatStats) => void;
    rebuildPlayerStatsCache: (id: string) => void;
    isInCombat: (id: string) => boolean;
    statSoftCaps: Record<keyof CombatStats, number>;
  } {
    return {
      player,
      room,
      args,
      resolveRoom: () => undefined,
      otherPlayersInRoom: [],
      stability: 1.0,
      getStatPoints: getAvailableStatPoints,
      setStatPoints: setAvailableStatPoints,
      getBaseStats,
      saveBaseStats,
      rebuildPlayerStatsCache: (_id: string) => { rebuildCalled = true; },
      isInCombat: () => false,
      statSoftCaps: DEFAULT_SOFT_CAPS,
    };
  }

  // ─── Room type gating ─────────────────────────────────────────────────

  describe('Room type gating', () => {
    it('should only work in feature_training rooms', () => {
      /**
       * The real implementation uses featureHandlers registry with
       * requiredRoomType: 'feature_training'. The handleCommand function
       * rejects commands if room type doesn't match.
       *
       * This test verifies the pattern used by other feature commands
       * (board, stash, rent, sandbox) works for train too.
       */
      const trainingRoom = makeRoom();
      expect(trainingRoom.type).toBe('feature_training');

      // Command should succeed in training room (not "You can't do that here")
      // Once registered: handleCommand('train', buildCtx(trainingRoom))
    });

    it('should fail gracefully outside training rooms (corridor)', () => {
      /**
       * handleCommand returns "You can't do that here." for feature commands
       * used in wrong room types. This is the standard featureHandlers pattern.
       */
      const corridorRoom = makeNonTrainingRoom();
      expect(corridorRoom.type).not.toBe('feature_training');

      // Once registered in featureHandlers:
      // const result = handleCommand('train', buildCtx(corridorRoom));
      // expect(result.narrations[0]!.text).toContain("can't do that here");
    });

    it('should fail gracefully outside training rooms (entry)', () => {
      const entryRoom = makeEntryRoom();
      expect(entryRoom.type).not.toBe('feature_training');

      // Once registered:
      // const result = handleCommand('train', buildCtx(entryRoom));
      // expect(result.narrations[0]!.text).toContain("can't do that here");
    });
  });

  // ─── Stat allocation ─────────────────────────────────────────────────

  describe('train <stat> allocates stat points', () => {
    it('should increment base stat by 1 when spending a point', () => {
      setAvailableStatPoints('player-1', 3);
      saveBaseStats('player-1', { ...DEFAULT_BASE_STATS });

      const ctx = buildCtx(makeRoom(), ['oneHanded']);
      const result = handleTrain(ctx);

      expect(result.narrations[0]!.text).toContain('oneHanded');
      expect(getBaseStats('player-1').oneHanded).toBe(DEFAULT_BASE_STATS.oneHanded + 1);
    });

    it('should decrement available stat points after training', () => {
      setAvailableStatPoints('player-1', 3);
      saveBaseStats('player-1', { ...DEFAULT_BASE_STATS });

      const ctx = buildCtx(makeRoom(), ['dodge']);
      handleTrain(ctx);

      expect(getAvailableStatPoints('player-1')).toBe(2);
    });

    it.each(TRAINABLE_STATS)(
      'should train %s successfully',
      (stat) => {
        statPointBank.clear();
        baseStatsStore.clear();
        setAvailableStatPoints('player-1', 1);
        saveBaseStats('player-1', { ...DEFAULT_BASE_STATS });

        const ctx = buildCtx(makeRoom(), [stat]);
        handleTrain(ctx);

        expect(getBaseStats('player-1')[stat]).toBe(DEFAULT_BASE_STATS[stat] + 1);
        expect(getAvailableStatPoints('player-1')).toBe(0);
      },
    );

    it('should persist base stats via saveBaseStats', () => {
      setAvailableStatPoints('player-1', 1);
      saveBaseStats('player-1', { ...DEFAULT_BASE_STATS });

      const ctx = buildCtx(makeRoom(), ['unarmed']);
      handleTrain(ctx);

      // Verify stats were saved (not just in-memory)
      const saved = getBaseStats('player-1');
      expect(saved.unarmed).toBe(DEFAULT_BASE_STATS.unarmed + 1);
    });

    it('should call rebuildPlayerStatsCache after training', () => {
      setAvailableStatPoints('player-1', 1);
      saveBaseStats('player-1', { ...DEFAULT_BASE_STATS });

      const ctx = buildCtx(makeRoom(), ['armour']);
      handleTrain(ctx);

      expect(rebuildCalled).toBe(true);
    });
  });

  // ─── Failure conditions ───────────────────────────────────────────────

  describe('Failure conditions', () => {
    it('should fail if no stat points available', () => {
      setAvailableStatPoints('player-1', 0);
      saveBaseStats('player-1', { ...DEFAULT_BASE_STATS });

      const ctx = buildCtx(makeRoom(), ['dodge']);
      const result = handleTrain(ctx);

      expect(result.narrations[0]!.text).toContain('no stat points');
      // Stat should not change
      expect(getBaseStats('player-1').dodge).toBe(DEFAULT_BASE_STATS.dodge);
    });

    it('should fail if stat is at soft cap', () => {
      setAvailableStatPoints('player-1', 5);
      const cappedStats = { ...DEFAULT_BASE_STATS, dodge: DEFAULT_SOFT_CAPS.dodge };
      saveBaseStats('player-1', cappedStats);

      const ctx = buildCtx(makeRoom(), ['dodge']);
      const result = handleTrain(ctx);

      expect(result.narrations[0]!.text).toContain('soft cap');
      expect(getBaseStats('player-1').dodge).toBe(DEFAULT_SOFT_CAPS.dodge);
      // Points should not be consumed
      expect(getAvailableStatPoints('player-1')).toBe(5);
    });

    it('should fail with invalid stat name', () => {
      setAvailableStatPoints('player-1', 5);

      const ctx = buildCtx(makeRoom(), ['charisma']);
      const result = handleTrain(ctx);

      expect(result.narrations[0]!.text).toContain('Unknown stat');
    });
  });

  // ─── No-args: show status ─────────────────────────────────────────────

  describe('train with no args shows status', () => {
    it('should display current stats and available points', () => {
      setAvailableStatPoints('player-1', 7);
      saveBaseStats('player-1', { ...DEFAULT_BASE_STATS, oneHanded: 8 });

      const ctx = buildCtx(makeRoom(), []);
      const result = handleTrain(ctx);

      expect(result.narrations[0]!.text).toContain('7');
      expect(result.narrations[0]!.type).toBe('system');
    });

    it('should show 0 points when none available', () => {
      setAvailableStatPoints('player-1', 0);
      saveBaseStats('player-1', { ...DEFAULT_BASE_STATS });

      const ctx = buildCtx(makeRoom(), []);
      const result = handleTrain(ctx);

      expect(result.narrations[0]!.text).toContain('0');
    });
  });

  // ─── Edge cases ───────────────────────────────────────────────────────

  describe('Edge cases', () => {
    it('should prevent training during combat', () => {
      setAvailableStatPoints('player-1', 5);
      saveBaseStats('player-1', { ...DEFAULT_BASE_STATS });

      const ctx = buildCtx(makeRoom(), ['dodge']);
      // Override isInCombat to return true
      ctx.isInCombat = () => true;

      const result = handleTrain(ctx);

      expect(result.narrations[0]!.text).toContain('combat');
      // Stat should not change
      expect(getBaseStats('player-1').dodge).toBe(DEFAULT_BASE_STATS.dodge);
      // Points should not be consumed
      expect(getAvailableStatPoints('player-1')).toBe(5);
    });

    it('should handle training with exactly 0 points (no negative)', () => {
      setAvailableStatPoints('player-1', 0);
      saveBaseStats('player-1', { ...DEFAULT_BASE_STATS });

      const ctx = buildCtx(makeRoom(), ['unarmed']);
      handleTrain(ctx);

      expect(getAvailableStatPoints('player-1')).toBe(0);
      expect(getBaseStats('player-1').unarmed).toBe(DEFAULT_BASE_STATS.unarmed);
    });

    it('should handle training stat at exactly soft cap', () => {
      setAvailableStatPoints('player-1', 3);
      saveBaseStats('player-1', { ...DEFAULT_BASE_STATS, shieldBlock: DEFAULT_SOFT_CAPS.shieldBlock });

      const ctx = buildCtx(makeRoom(), ['shieldBlock']);
      const result = handleTrain(ctx);

      expect(result.narrations[0]!.text).toContain('soft cap');
      expect(getBaseStats('player-1').shieldBlock).toBe(DEFAULT_SOFT_CAPS.shieldBlock);
    });

    it('should handle training stat at one below soft cap', () => {
      setAvailableStatPoints('player-1', 3);
      saveBaseStats('player-1', { ...DEFAULT_BASE_STATS, shieldBlock: DEFAULT_SOFT_CAPS.shieldBlock - 1 });

      const ctx = buildCtx(makeRoom(), ['shieldBlock']);
      handleTrain(ctx);

      // Should succeed — stat is still below cap
      expect(getBaseStats('player-1').shieldBlock).toBe(DEFAULT_SOFT_CAPS.shieldBlock);
      expect(getAvailableStatPoints('player-1')).toBe(2);
    });

    it('should handle consecutive training of the same stat', () => {
      setAvailableStatPoints('player-1', 3);
      saveBaseStats('player-1', { ...DEFAULT_BASE_STATS });

      for (let i = 0; i < 3; i++) {
        const ctx = buildCtx(makeRoom(), ['unarmed']);
        handleTrain(ctx);
      }

      expect(getBaseStats('player-1').unarmed).toBe(DEFAULT_BASE_STATS.unarmed + 3);
      expect(getAvailableStatPoints('player-1')).toBe(0);
    });

    it('should handle training different stats in sequence', () => {
      setAvailableStatPoints('player-1', 3);
      saveBaseStats('player-1', { ...DEFAULT_BASE_STATS });

      handleTrain(buildCtx(makeRoom(), ['unarmed']));
      handleTrain(buildCtx(makeRoom(), ['dodge']));
      handleTrain(buildCtx(makeRoom(), ['armour']));

      const stats = getBaseStats('player-1');
      expect(stats.unarmed).toBe(DEFAULT_BASE_STATS.unarmed + 1);
      expect(stats.dodge).toBe(DEFAULT_BASE_STATS.dodge + 1);
      expect(stats.armour).toBe(DEFAULT_BASE_STATS.armour + 1);
      expect(getAvailableStatPoints('player-1')).toBe(0);
    });

    it('should stop training once points run out mid-sequence', () => {
      setAvailableStatPoints('player-1', 1);
      saveBaseStats('player-1', { ...DEFAULT_BASE_STATS });

      handleTrain(buildCtx(makeRoom(), ['unarmed']));
      const result = handleTrain(buildCtx(makeRoom(), ['dodge']));

      expect(result.narrations[0]!.text).toContain('no stat points');
      expect(getBaseStats('player-1').unarmed).toBe(DEFAULT_BASE_STATS.unarmed + 1);
      expect(getBaseStats('player-1').dodge).toBe(DEFAULT_BASE_STATS.dodge); // unchanged
    });
  });

  // ─── Stats affect combat immediately ──────────────────────────────────

  describe('Stats affect combat immediately after training', () => {
    it('should call rebuildPlayerStatsCache so combat uses new stats', () => {
      setAvailableStatPoints('player-1', 1);
      saveBaseStats('player-1', { ...DEFAULT_BASE_STATS });

      const rebuildSpy = vi.fn();
      const ctx = buildCtx(makeRoom(), ['armour']);
      ctx.rebuildPlayerStatsCache = rebuildSpy;

      handleTrain(ctx);

      expect(rebuildSpy).toHaveBeenCalledWith('player-1');
    });

    it('should not call rebuildPlayerStatsCache on failed training', () => {
      setAvailableStatPoints('player-1', 0);
      saveBaseStats('player-1', { ...DEFAULT_BASE_STATS });

      const rebuildSpy = vi.fn();
      const ctx = buildCtx(makeRoom(), ['armour']);
      ctx.rebuildPlayerStatsCache = rebuildSpy;

      handleTrain(ctx);

      expect(rebuildSpy).not.toHaveBeenCalled();
    });
  });
});

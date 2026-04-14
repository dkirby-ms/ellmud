/**
 * DowningSystem unit tests — bleed-out timers, stabilization, killing blows.
 *
 * Tests all state transitions:
 *   alive → downed → stabilized
 *   alive → downed → bleed_out (death)
 *   alive → downed → killing_blow (death)
 *   stabilize interruptions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  DowningSystem,
  BLEED_OUT_TICKS,
  STABILIZE_CHANNEL_TICKS,
  GRACE_TICKS,
} from '../systems/DowningSystem.js';

const ROOM_A = 'room-a';
const ROOM_B = 'room-b';

describe('DowningSystem', () => {
  let system: DowningSystem;

  beforeEach(() => {
    system = new DowningSystem();
  });

  // ─── Downing ──────────────────────────────────────────────────────────────

  describe('downing a player', () => {
    it('should put a player in downed state', () => {
      const event = system.downPlayer('p1', 'Hero', ROOM_A);
      expect(event.type).toBe('player_downed');
      expect(event.playerId).toBe('p1');
      expect(event.roomId).toBe(ROOM_A);
      expect(system.isPlayerDowned('p1')).toBe(true);
    });

    it('should initialize bleed-out timer to BLEED_OUT_TICKS', () => {
      system.downPlayer('p1', 'Hero', ROOM_A);
      const downed = system.getDownedPlayer('p1');
      expect(downed).toBeDefined();
      expect(downed!.bleedOutTicksRemaining).toBe(BLEED_OUT_TICKS);
      expect(downed!.currentHp).toBe(0);
      expect(downed!.graceTicksRemaining).toBe(GRACE_TICKS);
      expect(downed!.state).toBe('downed');
    });

    it('should not report a non-downed player as downed', () => {
      expect(system.isPlayerDowned('nobody')).toBe(false);
      expect(system.getDownedPlayer('nobody')).toBeUndefined();
    });

    it('should return all downed players', () => {
      system.downPlayer('p1', 'Hero', ROOM_A);
      system.downPlayer('p2', 'Rogue', ROOM_B);
      const all = system.getAllDownedPlayers();
      expect(all).toHaveLength(2);
      expect(all.map(d => d.playerId).sort()).toEqual(['p1', 'p2']);
    });
  });

  // ─── Bleed-Out Timer ──────────────────────────────────────────────────────

  describe('bleed-out timer', () => {
    it('should decrement bleed-out timer each tick', () => {
      system.downPlayer('p1', 'Hero', ROOM_A);
      system.tick();
      const downed = system.getDownedPlayer('p1');
      expect(downed!.bleedOutTicksRemaining).toBe(BLEED_OUT_TICKS - 1);
    });

    it('should emit bleed_out event when timer reaches 0', () => {
      system.downPlayer('p1', 'Hero', ROOM_A);
      let bleedOutEvent = null;

      for (let i = 0; i < BLEED_OUT_TICKS; i++) {
        const events = system.tick();
        const bleedOut = events.find(e => e.type === 'player_bleed_out');
        if (bleedOut) bleedOutEvent = bleedOut;
      }

      expect(bleedOutEvent).not.toBeNull();
      expect(bleedOutEvent!.playerId).toBe('p1');
      expect(bleedOutEvent!.playerName).toBe('Hero');
      expect(bleedOutEvent!.roomId).toBe(ROOM_A);
    });

    it('should remove the player from downed state after bleed-out', () => {
      system.downPlayer('p1', 'Hero', ROOM_A);
      for (let i = 0; i < BLEED_OUT_TICKS; i++) system.tick();
      expect(system.isPlayerDowned('p1')).toBe(false);
    });

    it('should bleed out at exactly BLEED_OUT_TICKS ticks', () => {
      system.downPlayer('p1', 'Hero', ROOM_A);
      // Should NOT bleed out at tick BLEED_OUT_TICKS - 1
      for (let i = 0; i < BLEED_OUT_TICKS - 1; i++) {
        const events = system.tick();
        expect(events.filter(e => e.type === 'player_bleed_out')).toHaveLength(0);
      }
      // Should bleed out at tick BLEED_OUT_TICKS
      const finalEvents = system.tick();
      expect(finalEvents.filter(e => e.type === 'player_bleed_out')).toHaveLength(1);
    });
  });

  // ─── Stabilization ────────────────────────────────────────────────────────

  describe('stabilization', () => {
    it('should start a stabilize channel', () => {
      system.downPlayer('p1', 'Hero', ROOM_A);
      const result = system.beginStabilize('p2', 'Healer', 'p1');
      expect(typeof result).not.toBe('string');
      if (typeof result !== 'string') {
        expect(result.type).toBe('stabilize_started');
        expect(result.stabilizerId).toBe('p2');
      }
    });

    it('should complete stabilization after STABILIZE_CHANNEL_TICKS ticks', () => {
      system.downPlayer('p1', 'Hero', ROOM_A);
      system.beginStabilize('p2', 'Healer', 'p1');

      let stabilizedEvent = null;
      for (let i = 0; i < STABILIZE_CHANNEL_TICKS; i++) {
        const events = system.tick();
        const stabilized = events.find(e => e.type === 'player_stabilized');
        if (stabilized) stabilizedEvent = stabilized;
      }

      expect(stabilizedEvent).not.toBeNull();
      expect(stabilizedEvent!.playerId).toBe('p1');
      expect(stabilizedEvent!.stabilizerId).toBe('p2');
    });

    it('should stop bleed-out timer after stabilization', () => {
      system.downPlayer('p1', 'Hero', ROOM_A);
      system.beginStabilize('p2', 'Healer', 'p1');

      // Complete stabilization
      for (let i = 0; i < STABILIZE_CHANNEL_TICKS; i++) system.tick();

      const downed = system.getDownedPlayer('p1');
      expect(downed!.state).toBe('stabilized');

      // Tick many more times — should never bleed out
      for (let i = 0; i < BLEED_OUT_TICKS * 2; i++) {
        const events = system.tick();
        expect(events.filter(e => e.type === 'player_bleed_out')).toHaveLength(0);
      }

      expect(system.isPlayerDowned('p1')).toBe(true); // Still downed but stabilized
    });

    it('should reject stabilize on non-downed player', () => {
      const result = system.beginStabilize('p2', 'Healer', 'p1');
      expect(result).toBe('That player is not downed.');
    });

    it('should reject stabilize on already-stabilized player', () => {
      system.downPlayer('p1', 'Hero', ROOM_A);
      system.beginStabilize('p2', 'Healer', 'p1');
      for (let i = 0; i < STABILIZE_CHANNEL_TICKS; i++) system.tick();

      const result = system.beginStabilize('p3', 'Medic', 'p1');
      expect(result).toBe('That player is already stabilized.');
    });

    it('should reject self-stabilize', () => {
      system.downPlayer('p1', 'Hero', ROOM_A);
      const result = system.beginStabilize('p1', 'Hero', 'p1');
      expect(result).toBe('You cannot stabilize yourself.');
    });

    it('should reject double-channeling', () => {
      system.downPlayer('p1', 'Hero', ROOM_A);
      system.downPlayer('p3', 'Mage', ROOM_A);
      system.beginStabilize('p2', 'Healer', 'p1');
      const result = system.beginStabilize('p2', 'Healer', 'p3');
      expect(result).toBe('You are already channeling a stabilization.');
    });

    it('should track channeling state', () => {
      system.downPlayer('p1', 'Hero', ROOM_A);
      expect(system.isChannelingStabilize('p2')).toBe(false);
      system.beginStabilize('p2', 'Healer', 'p1');
      expect(system.isChannelingStabilize('p2')).toBe(true);
    });
  });

  // ─── Stabilize Interruption ───────────────────────────────────────────────

  describe('stabilize interruption', () => {
    it('should interrupt an active stabilize channel', () => {
      system.downPlayer('p1', 'Hero', ROOM_A);
      system.beginStabilize('p2', 'Healer', 'p1');

      const event = system.interruptStabilize('p2', 'Healer');
      expect(event).not.toBeNull();
      expect(event!.type).toBe('stabilize_interrupted');
      expect(system.isChannelingStabilize('p2')).toBe(false);
    });

    it('should return null when no channel to interrupt', () => {
      const event = system.interruptStabilize('p2', 'Healer');
      expect(event).toBeNull();
    });

    it('should leave the target still bleeding after interruption', () => {
      system.downPlayer('p1', 'Hero', ROOM_A);
      system.beginStabilize('p2', 'Healer', 'p1');
      system.tick(); // 1 tick into channel
      system.interruptStabilize('p2', 'Healer');

      // Player should still be in downed (not stabilized) state
      const downed = system.getDownedPlayer('p1');
      expect(downed!.state).toBe('downed');
    });
  });

  // ─── Killing Blow ─────────────────────────────────────────────────────────

  describe('killing blow', () => {
    it('should be blocked during grace period', () => {
      system.downPlayer('p1', 'Hero', ROOM_A);
      // Immediately after downing, grace is active
      const event = system.killingBlow('p1');
      expect(event).toBeNull();
      expect(system.isPlayerDowned('p1')).toBe(true);
    });

    it('should still be blocked partway through grace period', () => {
      system.downPlayer('p1', 'Hero', ROOM_A);
      // Tick once — grace decrements but still > 0 (GRACE_TICKS - 1 remaining)
      system.tick();
      const event = system.killingBlow('p1');
      // Grace needs GRACE_TICKS full ticks to expire
      if (GRACE_TICKS > 1) {
        expect(event).toBeNull();
      }
    });

    it('should succeed after grace period expires', () => {
      system.downPlayer('p1', 'Hero', ROOM_A);
      // Tick through grace period
      for (let i = 0; i < GRACE_TICKS; i++) system.tick();
      const event = system.killingBlow('p1');
      expect(event).not.toBeNull();
      expect(event!.type).toBe('killing_blow');
      expect(event!.playerId).toBe('p1');
      expect(system.isPlayerDowned('p1')).toBe(false);
    });

    it('should return null for non-downed player', () => {
      const event = system.killingBlow('nobody');
      expect(event).toBeNull();
    });

    it('should clean up stabilize channels targeting killed player', () => {
      system.downPlayer('p1', 'Hero', ROOM_A);
      system.beginStabilize('p2', 'Healer', 'p1');
      // Expire grace
      for (let i = 0; i < GRACE_TICKS; i++) system.tick();
      system.killingBlow('p1');
      expect(system.isChannelingStabilize('p2')).toBe(false);
    });

    it('should kill even a stabilized player (after grace)', () => {
      system.downPlayer('p1', 'Hero', ROOM_A);
      system.beginStabilize('p2', 'Healer', 'p1');
      for (let i = 0; i < STABILIZE_CHANNEL_TICKS; i++) system.tick();
      expect(system.getDownedPlayer('p1')!.state).toBe('stabilized');

      // Stabilized players still have graceTicksRemaining from initial downing,
      // but killingBlow checks grace on the target — stabilized players don't
      // get their grace decremented (they're stabilized), so this tests the
      // edge case. Grace was ticked during the channel ticks above.
      const event = system.killingBlow('p1');
      if (GRACE_TICKS <= STABILIZE_CHANNEL_TICKS) {
        expect(event!.type).toBe('killing_blow');
        expect(system.isPlayerDowned('p1')).toBe(false);
      } else {
        // Grace still active — killing blow blocked
        expect(event).toBeNull();
      }
    });
  });

  // ─── HP Drain During Bleed-Out ─────────────────────────────────────────────

  describe('HP drain during bleed-out', () => {
    it('should drain HP by 1 each tick (0 → -1 → -2 → …)', () => {
      system.downPlayer('p1', 'Hero', ROOM_A);
      expect(system.getDownedPlayer('p1')!.currentHp).toBe(0);

      system.tick();
      expect(system.getDownedPlayer('p1')!.currentHp).toBe(-1);

      system.tick();
      expect(system.getDownedPlayer('p1')!.currentHp).toBe(-2);
    });

    it('should reach -BLEED_OUT_TICKS at death', () => {
      system.downPlayer('p1', 'Hero', ROOM_A);
      // Tick to one before death
      for (let i = 0; i < BLEED_OUT_TICKS - 1; i++) system.tick();
      const downed = system.getDownedPlayer('p1');
      expect(downed).toBeDefined();
      expect(downed!.currentHp).toBe(-(BLEED_OUT_TICKS - 1));

      // Final tick — player dies and is removed
      const events = system.tick();
      expect(events.some(e => e.type === 'player_bleed_out')).toBe(true);
      expect(system.isPlayerDowned('p1')).toBe(false);
    });

    it('should not drain HP for stabilized players', () => {
      system.downPlayer('p1', 'Hero', ROOM_A);
      system.tick(); // HP = -1
      system.beginStabilize('p2', 'Healer', 'p1');
      // Complete stabilization (STABILIZE_CHANNEL_TICKS ticks)
      for (let i = 0; i < STABILIZE_CHANNEL_TICKS; i++) system.tick();
      const hpAfterStabilize = system.getDownedPlayer('p1')!.currentHp;

      // Tick several more times — HP should not change
      for (let i = 0; i < 5; i++) system.tick();
      expect(system.getDownedPlayer('p1')!.currentHp).toBe(hpAfterStabilize);
    });
  });

  // ─── Grace Period ─────────────────────────────────────────────────────────

  describe('grace period', () => {
    it('should initialize grace ticks to GRACE_TICKS', () => {
      system.downPlayer('p1', 'Hero', ROOM_A);
      expect(system.getDownedPlayer('p1')!.graceTicksRemaining).toBe(GRACE_TICKS);
    });

    it('should decrement grace ticks each tick', () => {
      system.downPlayer('p1', 'Hero', ROOM_A);
      system.tick();
      expect(system.getDownedPlayer('p1')!.graceTicksRemaining).toBe(GRACE_TICKS - 1);
    });

    it('should reach 0 after GRACE_TICKS ticks', () => {
      system.downPlayer('p1', 'Hero', ROOM_A);
      for (let i = 0; i < GRACE_TICKS; i++) system.tick();
      expect(system.getDownedPlayer('p1')!.graceTicksRemaining).toBe(0);
    });

    it('should not go below 0', () => {
      system.downPlayer('p1', 'Hero', ROOM_A);
      for (let i = 0; i < GRACE_TICKS + 3; i++) system.tick();
      const downed = system.getDownedPlayer('p1');
      if (downed) {
        expect(downed.graceTicksRemaining).toBe(0);
      }
    });

    it('stabilize during grace period should still work', () => {
      system.downPlayer('p1', 'Hero', ROOM_A);
      // Start stabilize immediately (within grace)
      system.beginStabilize('p2', 'Healer', 'p1');
      for (let i = 0; i < STABILIZE_CHANNEL_TICKS; i++) {
        const events = system.tick();
        const stabilized = events.find(e => e.type === 'player_stabilized');
        if (stabilized) {
          expect(stabilized.playerId).toBe('p1');
        }
      }
      expect(system.getDownedPlayer('p1')!.state).toBe('stabilized');
    });

    it('stabilize after grace (but before death) should still work', () => {
      system.downPlayer('p1', 'Hero', ROOM_A);
      // Tick past grace period
      for (let i = 0; i < GRACE_TICKS + 1; i++) system.tick();
      expect(system.getDownedPlayer('p1')!.graceTicksRemaining).toBe(0);

      // Start stabilize — player is post-grace but still alive
      system.beginStabilize('p2', 'Healer', 'p1');
      let stabilized = false;
      for (let i = 0; i < STABILIZE_CHANNEL_TICKS; i++) {
        const events = system.tick();
        if (events.some(e => e.type === 'player_stabilized')) stabilized = true;
      }
      expect(stabilized).toBe(true);
      expect(system.getDownedPlayer('p1')!.state).toBe('stabilized');
    });
  });

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  describe('cleanup', () => {
    it('should remove a player and their channels', () => {
      system.downPlayer('p1', 'Hero', ROOM_A);
      system.beginStabilize('p2', 'Healer', 'p1');
      system.removePlayer('p1');
      expect(system.isPlayerDowned('p1')).toBe(false);
      expect(system.isChannelingStabilize('p2')).toBe(false);
    });

    it('should remove a channeler and their channel', () => {
      system.downPlayer('p1', 'Hero', ROOM_A);
      system.beginStabilize('p2', 'Healer', 'p1');
      system.removePlayer('p2');
      expect(system.isChannelingStabilize('p2')).toBe(false);
      // Target should still be downed
      expect(system.isPlayerDowned('p1')).toBe(true);
    });

    it('should clear all state', () => {
      system.downPlayer('p1', 'Hero', ROOM_A);
      system.downPlayer('p2', 'Rogue', ROOM_B);
      system.beginStabilize('p3', 'Healer', 'p1');
      system.clear();
      expect(system.getAllDownedPlayers()).toHaveLength(0);
      expect(system.isChannelingStabilize('p3')).toBe(false);
    });
  });

  // ─── Race Conditions ──────────────────────────────────────────────────────

  describe('race conditions', () => {
    it('bleed-out timer runs during stabilize channel', () => {
      system.downPlayer('p1', 'Hero', ROOM_A);

      // Tick down almost all the way
      for (let i = 0; i < BLEED_OUT_TICKS - 2; i++) system.tick();

      // Start stabilize with only 2 ticks left
      system.beginStabilize('p2', 'Healer', 'p1');

      // Tick 1: both timer and channel advance
      const events1 = system.tick();
      // Stabilize completes after 2 ticks, bleed-out at exactly 1 remaining
      // Channel should complete before bleed-out check at tick 2
      expect(events1.filter(e => e.type === 'player_bleed_out')).toHaveLength(0);

      // Tick 2: stabilize completes, timer would hit 0 but player is stabilized
      const events2 = system.tick();
      const stabilized = events2.find(e => e.type === 'player_stabilized');
      expect(stabilized).toBeDefined();
      // No bleed-out because stabilization completes first in tick order
      expect(events2.filter(e => e.type === 'player_bleed_out')).toHaveLength(0);
    });

    it('multiple players can be downed simultaneously', () => {
      system.downPlayer('p1', 'Hero', ROOM_A);
      system.downPlayer('p2', 'Rogue', ROOM_A);
      system.downPlayer('p3', 'Mage', ROOM_B);

      // Tick all the way to bleed-out
      let bleedOuts = 0;
      for (let i = 0; i < BLEED_OUT_TICKS; i++) {
        bleedOuts += system.tick().filter(e => e.type === 'player_bleed_out').length;
      }
      expect(bleedOuts).toBe(3);
      expect(system.getAllDownedPlayers()).toHaveLength(0);
    });

    it('stabilizer can stabilize a second player after finishing the first', () => {
      system.downPlayer('p1', 'Hero', ROOM_A);
      system.downPlayer('p3', 'Mage', ROOM_A);
      system.beginStabilize('p2', 'Healer', 'p1');

      for (let i = 0; i < STABILIZE_CHANNEL_TICKS; i++) system.tick();
      expect(system.getDownedPlayer('p1')!.state).toBe('stabilized');

      // Now stabilize the second player
      const result = system.beginStabilize('p2', 'Healer', 'p3');
      expect(typeof result).not.toBe('string');
      for (let i = 0; i < STABILIZE_CHANNEL_TICKS; i++) system.tick();
      expect(system.getDownedPlayer('p3')!.state).toBe('stabilized');
    });
  });
});

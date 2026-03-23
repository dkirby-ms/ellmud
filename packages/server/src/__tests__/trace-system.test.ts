/**
 * TraceSystem tests — creation, TTL decay, skill filtering, integration.
 *
 * Replaces anticipatory tests with concrete implementation tests.
 * GDD §11.2 — Trace System
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TraceSystem, resetTraceIdCounter, MAX_TRACES_PER_ROOM, type PlayerSkills } from '../systems/TraceSystem.js';
import {
  type TraceType,
  TRACE_TTLS,
  TRACKING_THRESHOLDS,
  STEALTH_FOOTPRINT_THRESHOLD,
  BLOOD_TRAIL_DAMAGE_THRESHOLD,
} from '@ellmud/shared';

const ROOM_A = 'room-a';
const ROOM_B = 'room-b';

describe('TraceSystem', () => {
  let system: TraceSystem;

  beforeEach(() => {
    system = new TraceSystem();
    resetTraceIdCounter();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─── Creation & Retrieval ──────────────────────────────────────────────

  describe('trace creation and retrieval', () => {
    it('should create a footprint trace in a room', () => {
      const trace = system.addTrace(ROOM_A, 'footprint', { actorId: 'p1' }, 'east');

      expect(trace).not.toBeNull();
      expect(trace!.type).toBe('footprint');
      expect(trace!.roomId).toBe(ROOM_A);
      expect(trace!.direction).toBe('east');
      expect(trace!.metadata.actorId).toBe('p1');
      expect(trace!.ttl).toBe(TRACE_TTLS.footprint);
    });

    it('should retrieve all active traces in a room', () => {
      system.addTrace(ROOM_A, 'footprint', { actorId: 'p1' }, 'east');
      system.addTrace(ROOM_A, 'blood_trail', { actorId: 'p2', severity: 15 });
      system.addTrace(ROOM_B, 'footprint', { actorId: 'p3' }, 'west');

      const tracesA = system.getTracesInRoom(ROOM_A);
      const tracesB = system.getTracesInRoom(ROOM_B);

      expect(tracesA).toHaveLength(2);
      expect(tracesB).toHaveLength(1);
    });

    it('should return empty array for room with no traces', () => {
      expect(system.getTracesInRoom('empty-room')).toHaveLength(0);
    });

    it('should assign unique IDs to traces', () => {
      const t1 = system.addTrace(ROOM_A, 'footprint', {});
      const t2 = system.addTrace(ROOM_A, 'footprint', {});
      expect(t1!.id).not.toBe(t2!.id);
    });

    it('should create all trace types', () => {
      const types: TraceType[] = [
        'footprint', 'blood_trail', 'opened_container',
        'broken_door', 'corpse', 'discarded_item', 'residue',
      ];

      for (const type of types) {
        const metadata = type === 'blood_trail' ? { severity: 10 } : {};
        const trace = system.addTrace(ROOM_A, type, metadata);
        expect(trace).not.toBeNull();
        expect(trace!.type).toBe(type);
        expect(trace!.ttl).toBe(TRACE_TTLS[type]);
      }
    });

    it('should track total trace count', () => {
      system.addTrace(ROOM_A, 'footprint', {});
      system.addTrace(ROOM_A, 'corpse', {});
      system.addTrace(ROOM_B, 'residue', {});
      expect(system.totalTraceCount).toBe(3);
    });
  });

  // ─── TTL Decay ─────────────────────────────────────────────────────────

  describe('TTL decay', () => {
    it('should expire footprint traces after TTL', () => {
      system.addTrace(ROOM_A, 'footprint', { actorId: 'p1' });
      expect(system.getTracesInRoom(ROOM_A)).toHaveLength(1);

      vi.advanceTimersByTime(301_000);
      system.tick(1000);

      expect(system.getTracesInRoom(ROOM_A)).toHaveLength(0);
    });

    it('should expire residue traces after TTL', () => {
      system.addTrace(ROOM_A, 'residue', {});
      expect(system.getTracesInRoom(ROOM_A)).toHaveLength(1);

      vi.advanceTimersByTime(121_000);
      system.tick(1000);

      expect(system.getTracesInRoom(ROOM_A)).toHaveLength(0);
    });

    it('should NOT expire permanent traces', () => {
      system.addTrace(ROOM_A, 'corpse', { actorId: 'c1' });
      system.addTrace(ROOM_A, 'opened_container', {});
      system.addTrace(ROOM_A, 'broken_door', {});
      system.addTrace(ROOM_A, 'discarded_item', {});

      vi.advanceTimersByTime(10_000_000);
      system.tick(1000);

      expect(system.getTracesInRoom(ROOM_A)).toHaveLength(4);
    });

    it('should expire only traces past their TTL', () => {
      system.addTrace(ROOM_A, 'residue', {}); // 120s
      system.addTrace(ROOM_A, 'footprint', {}); // 300s
      system.addTrace(ROOM_A, 'blood_trail', { severity: 10 }); // 600s

      vi.advanceTimersByTime(130_000);
      system.tick(1000);

      const traces = system.getTracesInRoom(ROOM_A);
      expect(traces).toHaveLength(2);
      expect(traces.map(t => t.type)).toContain('footprint');
      expect(traces.map(t => t.type)).toContain('blood_trail');
    });

    it('should clean up empty room entries after all traces expire', () => {
      system.addTrace(ROOM_A, 'residue', {});
      vi.advanceTimersByTime(121_000);
      system.tick(1000);
      expect(system.totalTraceCount).toBe(0);
    });

    it('footprints alive at 299 seconds, expired at 300', () => {
      system.addTrace(ROOM_A, 'footprint', {});

      vi.advanceTimersByTime(299_000);
      expect(system.getTracesInRoom(ROOM_A)).toHaveLength(1);

      vi.advanceTimersByTime(2_000);
      system.tick(1000);
      expect(system.getTracesInRoom(ROOM_A)).toHaveLength(0);
    });

    it('blood trail outlives footprints from the same event', () => {
      system.addTrace(ROOM_A, 'footprint', {});
      system.addTrace(ROOM_A, 'blood_trail', { severity: 10 });

      vi.advanceTimersByTime(400_000);
      system.tick(1000);

      const traces = system.getTracesInRoom(ROOM_A);
      expect(traces).toHaveLength(1);
      expect(traces[0].type).toBe('blood_trail');
    });

    it('should support clear() for shard collapse', () => {
      system.addTrace(ROOM_A, 'corpse', {});
      system.addTrace(ROOM_B, 'footprint', {});
      system.clear();
      expect(system.totalTraceCount).toBe(0);
    });
  });

  // ─── Stealth Suppression ───────────────────────────────────────────────

  describe('stealth suppression', () => {
    it('should suppress footprints when stealth modifier is high', () => {
      const trace = system.addTrace(ROOM_A, 'footprint', {
        actorId: 'rogue',
        stealthModifier: STEALTH_FOOTPRINT_THRESHOLD,
      }, 'east');
      expect(trace).toBeNull();
      expect(system.getTracesInRoom(ROOM_A)).toHaveLength(0);
    });

    it('should create footprints when stealth is below threshold', () => {
      const trace = system.addTrace(ROOM_A, 'footprint', {
        actorId: 'warrior',
        stealthModifier: STEALTH_FOOTPRINT_THRESHOLD - 1,
      }, 'east');
      expect(trace).not.toBeNull();
    });

    it('should suppress blood trails when damage is below threshold', () => {
      const trace = system.addTrace(ROOM_A, 'blood_trail', {
        actorId: 'p1',
        severity: BLOOD_TRAIL_DAMAGE_THRESHOLD - 1,
      });
      expect(trace).toBeNull();
      expect(system.getTracesInRoom(ROOM_A)).toHaveLength(0);
    });

    it('should create blood trails when damage meets threshold', () => {
      const trace = system.addTrace(ROOM_A, 'blood_trail', {
        actorId: 'p1',
        severity: BLOOD_TRAIL_DAMAGE_THRESHOLD,
      });
      expect(trace).not.toBeNull();
    });

    it('should NOT suppress permanent traces regardless of stealth', () => {
      const corpse = system.addTrace(ROOM_A, 'corpse', { stealthModifier: 100 });
      expect(corpse).not.toBeNull();
    });
  });

  // ─── Skill-Based Filtering ──────────────────────────────────────────────

  describe('tracking skill filtering', () => {
    beforeEach(() => {
      system.addTrace(ROOM_A, 'footprint', { actorId: 'p1', actorName: 'Warrior' }, 'east');
      system.addTrace(ROOM_A, 'blood_trail', { actorId: 'p2', severity: 15 }, 'west');
    });

    it('should return no descriptions when tracking is below BASIC threshold', () => {
      const descriptions = system.getTracesForPlayer(ROOM_A, {
        tracking: TRACKING_THRESHOLDS.NONE,
      });
      expect(descriptions).toHaveLength(0);
    });

    it('should return basic descriptions at BASIC tracking level', () => {
      const descriptions = system.getTracesForPlayer(ROOM_A, {
        tracking: TRACKING_THRESHOLDS.BASIC,
      });
      expect(descriptions).toHaveLength(2);
      expect(descriptions[0].text).toContain('Footprints');
      expect(descriptions[0].text).toContain('east');
      expect(descriptions[1].text).toContain('blood');
    });

    it('should return detailed descriptions at DETAILED tracking level', () => {
      const descriptions = system.getTracesForPlayer(ROOM_A, {
        tracking: TRACKING_THRESHOLDS.DETAILED,
      });
      expect(descriptions).toHaveLength(2);
      expect(descriptions[0].text).toMatch(/Fresh|Recent|boot prints/);
      expect(descriptions[1].text).toMatch(/Fresh|Recent|bloodstains/);
    });

    it('should return expert descriptions at EXPERT tracking level', () => {
      const descriptions = system.getTracesForPlayer(ROOM_A, {
        tracking: TRACKING_THRESHOLDS.EXPERT,
      });
      expect(descriptions).toHaveLength(2);
      expect(descriptions[0].text).toContain('Warrior');
      expect(descriptions[1].text).toContain('severity 15');
    });

    it('should default to no tracking when skills omitted', () => {
      const descriptions = system.getTracesForPlayer(ROOM_A);
      expect(descriptions).toHaveLength(0);
    });

    it('should include direction in trace descriptions', () => {
      const descriptions = system.getTracesForPlayer(ROOM_A, {
        tracking: TRACKING_THRESHOLDS.BASIC,
      });
      expect(descriptions[0].direction).toBe('east');
      expect(descriptions[1].direction).toBe('west');
    });
  });

  // ─── Age-Based Description Changes ─────────────────────────────────────

  describe('trace age in descriptions', () => {
    it('should describe fresh traces as "Fresh"', () => {
      system.addTrace(ROOM_A, 'footprint', { actorId: 'p1' }, 'east');
      const descriptions = system.getTracesForPlayer(ROOM_A, {
        tracking: TRACKING_THRESHOLDS.DETAILED,
      });
      expect(descriptions[0].text).toMatch(/^Fresh/);
    });

    it('should describe older traces as "Recent"', () => {
      system.addTrace(ROOM_A, 'footprint', { actorId: 'p1' }, 'east');
      vi.advanceTimersByTime(60_000);
      const descriptions = system.getTracesForPlayer(ROOM_A, {
        tracking: TRACKING_THRESHOLDS.DETAILED,
      });
      expect(descriptions[0].text).toMatch(/^Recent/);
    });

    it('should describe aged traces as "Fading"', () => {
      system.addTrace(ROOM_A, 'footprint', { actorId: 'p1' }, 'east');
      vi.advanceTimersByTime(150_000);
      const descriptions = system.getTracesForPlayer(ROOM_A, {
        tracking: TRACKING_THRESHOLDS.DETAILED,
      });
      expect(descriptions[0].text).toMatch(/^Fading/);
    });

    it('should include exact time at expert level', () => {
      system.addTrace(ROOM_A, 'footprint', { actorId: 'p1', actorName: 'p1' }, 'east');
      vi.advanceTimersByTime(120_000);
      const descriptions = system.getTracesForPlayer(ROOM_A, {
        tracking: TRACKING_THRESHOLDS.EXPERT,
      });
      expect(descriptions[0].text).toContain('2 minutes old');
    });
  });

  // ─── Integration: Movement + Decay Lifecycle ──────────────────────────

  describe('integration: movement and decay lifecycle', () => {
    it('should simulate a player moving through rooms with trace decay', () => {
      system.addTrace(ROOM_A, 'footprint', { actorId: 'p1' }, 'east');
      expect(system.getTracesInRoom(ROOM_A)).toHaveLength(1);

      vi.advanceTimersByTime(60_000);
      system.addTrace(ROOM_B, 'footprint', { actorId: 'p1' }, 'west');
      expect(system.totalTraceCount).toBe(2);

      vi.advanceTimersByTime(241_000);
      system.tick(1000);
      expect(system.getTracesInRoom(ROOM_A)).toHaveLength(0);
      expect(system.getTracesInRoom(ROOM_B)).toHaveLength(1);

      vi.advanceTimersByTime(300_000);
      system.tick(1000);
      expect(system.getTracesInRoom(ROOM_B)).toHaveLength(0);
      expect(system.totalTraceCount).toBe(0);
    });

    it('should handle combat creating multiple trace types in one room', () => {
      system.addTrace(ROOM_A, 'blood_trail', { actorId: 'p1', severity: 20 });
      system.addTrace(ROOM_A, 'corpse', { actorId: 'creature-1', actorName: 'Revenant' });
      system.addTrace(ROOM_A, 'footprint', { actorId: 'p1' }, 'north');
      expect(system.getTracesInRoom(ROOM_A)).toHaveLength(3);

      vi.advanceTimersByTime(301_000);
      system.tick(1000);
      expect(system.getTracesInRoom(ROOM_A)).toHaveLength(2);

      vi.advanceTimersByTime(300_000);
      system.tick(1000);
      expect(system.getTracesInRoom(ROOM_A)).toHaveLength(1);
      expect(system.getTracesInRoom(ROOM_A)[0].type).toBe('corpse');

      vi.advanceTimersByTime(999_000_000);
      system.tick(1000);
      expect(system.getTracesInRoom(ROOM_A)).toHaveLength(1);
    });

    it('should support a tracker following a trail through rooms', () => {
      system.addTrace(ROOM_A, 'footprint', { actorId: 'quarry', actorName: 'Quarry' }, 'east');
      vi.advanceTimersByTime(30_000);
      system.addTrace(ROOM_B, 'footprint', { actorId: 'quarry', actorName: 'Quarry' }, 'north');

      const skills: PlayerSkills = { tracking: TRACKING_THRESHOLDS.EXPERT };

      const trailA = system.getTracesForPlayer(ROOM_A, skills);
      expect(trailA).toHaveLength(1);
      expect(trailA[0].direction).toBe('east');
      expect(trailA[0].text).toContain('Quarry');

      const trailB = system.getTracesForPlayer(ROOM_B, skills);
      expect(trailB).toHaveLength(1);
      expect(trailB[0].direction).toBe('north');
    });

    it('two players moving through same room create separate footprints', () => {
      system.addTrace(ROOM_A, 'footprint', { actorId: 'p1' }, 'east');
      system.addTrace(ROOM_A, 'footprint', { actorId: 'p2' }, 'west');
      expect(system.getTracesInRoom(ROOM_A)).toHaveLength(2);
    });
  });

  // ─── Per-Room Trace Cap ─────────────────────────────────────────────────

  describe('per-room trace cap', () => {
    it('should enforce MAX_TRACES_PER_ROOM limit', () => {
      for (let i = 0; i < MAX_TRACES_PER_ROOM + 10; i++) {
        system.addTrace(ROOM_A, 'footprint', { actorId: `p${i}` });
      }
      expect(system.getTracesInRoom(ROOM_A).length).toBeLessThanOrEqual(MAX_TRACES_PER_ROOM);
    });

    it('should evict oldest expired trace first when at cap', () => {
      // Fill the room to capacity
      for (let i = 0; i < MAX_TRACES_PER_ROOM; i++) {
        system.addTrace(ROOM_A, 'footprint', { actorId: `p${i}` });
      }

      // Expire the first trace by advancing time past footprint TTL
      vi.advanceTimersByTime(301_000);

      // Adding a new trace should evict the expired one, not a live one
      const newTrace = system.addTrace(ROOM_A, 'corpse', { actorId: 'c1' });
      expect(newTrace).not.toBeNull();

      const traces = system.getTracesInRoom(ROOM_A);
      // Only 1 alive: the new corpse (all footprints expired)
      expect(traces.length).toBe(1);
      expect(traces[0].type).toBe('corpse');
    });

    it('should evict oldest active trace when no expired traces exist', () => {
      // Fill with permanent corpses — none will expire
      for (let i = 0; i < MAX_TRACES_PER_ROOM; i++) {
        system.addTrace(ROOM_A, 'corpse', { actorId: `c${i}` });
      }

      // The first trace added should be evicted
      const firstTraceId = 'trace-0';
      const newTrace = system.addTrace(ROOM_A, 'corpse', { actorId: 'new' });
      expect(newTrace).not.toBeNull();

      const traces = system.getTracesInRoom(ROOM_A);
      expect(traces).toHaveLength(MAX_TRACES_PER_ROOM);
      expect(traces.find(t => t.id === firstTraceId)).toBeUndefined();
      expect(traces[traces.length - 1].metadata.actorId).toBe('new');
    });

    it('should not affect traces in other rooms', () => {
      for (let i = 0; i < MAX_TRACES_PER_ROOM + 5; i++) {
        system.addTrace(ROOM_A, 'footprint', { actorId: `p${i}` });
      }
      system.addTrace(ROOM_B, 'footprint', { actorId: 'solo' });

      expect(system.getTracesInRoom(ROOM_A).length).toBeLessThanOrEqual(MAX_TRACES_PER_ROOM);
      expect(system.getTracesInRoom(ROOM_B)).toHaveLength(1);
    });

    it('MAX_TRACES_PER_ROOM should be 50', () => {
      expect(MAX_TRACES_PER_ROOM).toBe(50);
    });
  });
});

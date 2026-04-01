/**
 * Sound Propagation System (#22) — Tests
 *
 * Tests BFS propagation, attenuation, room modifiers, directional info,
 * and integration scenarios per GDD §12.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SoundSystem, type SoundRoom } from '../sound/SoundSystem.js';
import { NOISE_VALUES, SOUND_ATTENUATION_PER_ROOM, SOUND_DESCRIPTIONS } from '@ellmud/shared';
import type { Direction, SoundType } from '@ellmud/shared';

// ─── Test Helpers ─────────────────────────────────────────────────────────

/**
 * Build a test room graph:
 *
 *   shrine ←(south)── corridor ──(south)→ entry ──(east)→ armory
 *                          │
 *                        (west)
 *                          ↓
 *                        crypt ──(down)→ deep-room
 *
 * 6 rooms, linear + branch. Matches the dev test graph topology.
 */
function buildTestRooms(): Map<string, SoundRoom> {
  const rooms = new Map<string, SoundRoom>();

  rooms.set('entry', {
    id: 'entry',
    exits: new Map<Direction, string>([
      ['north', 'corridor'],
      ['east', 'armory'],
    ]),
  });

  rooms.set('corridor', {
    id: 'corridor',
    exits: new Map<Direction, string>([
      ['south', 'entry'],
      ['north', 'shrine'],
      ['west', 'crypt'],
    ]),
  });

  rooms.set('armory', {
    id: 'armory',
    exits: new Map<Direction, string>([['west', 'entry']]),
  });

  rooms.set('shrine', {
    id: 'shrine',
    exits: new Map<Direction, string>([['south', 'corridor']]),
  });

  rooms.set('crypt', {
    id: 'crypt',
    exits: new Map<Direction, string>([
      ['east', 'corridor'],
      ['down', 'deep-room'],
    ]),
  });

  rooms.set('deep-room', {
    id: 'deep-room',
    exits: new Map<Direction, string>([['up', 'crypt']]),
  });

  return rooms;
}

function buildResolver(rooms: Map<string, SoundRoom>) {
  return (roomId: string) => rooms.get(roomId);
}

// ─── Pure Math: Audibility Formula ──────────────────────────────────────────

function isAudible(noise: number, roomsAway: number): boolean {
  return noise - (SOUND_ATTENUATION_PER_ROOM * roomsAway) > 0;
}

function effectiveNoise(noise: number, roomsAway: number): number {
  return Math.max(0, noise - (SOUND_ATTENUATION_PER_ROOM * roomsAway));
}

// ─── Core Audibility Formula ────────────────────────────────────────────────

describe('Sound Propagation — Audibility Formula (#22)', () => {
  describe('basic attenuation: noise - (2 × distance) > 0', () => {
    it('combat (5) audible at 1 room away → effective 3', () => {
      expect(effectiveNoise(NOISE_VALUES.combat, 1)).toBe(3);
      expect(isAudible(NOISE_VALUES.combat, 1)).toBe(true);
    });

    it('combat (5) audible at 2 rooms away → effective 1', () => {
      expect(effectiveNoise(NOISE_VALUES.combat, 2)).toBe(1);
      expect(isAudible(NOISE_VALUES.combat, 2)).toBe(true);
    });

    it('combat (5) NOT audible at 3 rooms away → effective 0', () => {
      expect(effectiveNoise(NOISE_VALUES.combat, 3)).toBe(0);
      expect(isAudible(NOISE_VALUES.combat, 3)).toBe(false);
    });

    it('explosion (9) audible at 3 rooms → effective 3', () => {
      expect(effectiveNoise(NOISE_VALUES.explosion, 3)).toBe(3);
      expect(isAudible(NOISE_VALUES.explosion, 3)).toBe(true);
    });

    it('sneaking (1) NOT audible at 1 room away', () => {
      expect(isAudible(NOISE_VALUES.sneaking, 1)).toBe(false);
    });

    it('striking door (7) audible at 3 rooms → effective 1', () => {
      expect(effectiveNoise(NOISE_VALUES.striking_door, 3)).toBe(1);
      expect(isAudible(NOISE_VALUES.striking_door, 3)).toBe(true);
    });

    it('running (4) audible at 1 room → effective 2', () => {
      expect(effectiveNoise(NOISE_VALUES.running, 1)).toBe(2);
      expect(isAudible(NOISE_VALUES.running, 1)).toBe(true);
    });

    it('running (4) NOT audible at 2 rooms → effective 0', () => {
      expect(effectiveNoise(NOISE_VALUES.running, 2)).toBe(0);
      expect(isAudible(NOISE_VALUES.running, 2)).toBe(false);
    });
  });

  describe('boundary conditions', () => {
    it('noise exactly at threshold (noise=2, distance=1) → NOT audible', () => {
      expect(effectiveNoise(2, 1)).toBe(0);
      expect(isAudible(2, 1)).toBe(false);
    });

    it('noise just above threshold (noise=3, distance=1) → audible', () => {
      expect(effectiveNoise(3, 1)).toBe(1);
      expect(isAudible(3, 1)).toBe(true);
    });

    it('max noise (10) propagates up to 4 rooms', () => {
      expect(isAudible(10, 4)).toBe(true);  // 10 - 8 = 2
      expect(isAudible(10, 5)).toBe(false); // 10 - 10 = 0
    });
  });
});

// ─── SoundSystem BFS Propagation ────────────────────────────────────────────

describe('SoundSystem', () => {
  let rooms: Map<string, SoundRoom>;
  let soundSystem: SoundSystem;

  beforeEach(() => {
    rooms = buildTestRooms();
    soundSystem = new SoundSystem(buildResolver(rooms));
  });

  describe('propagateSound — BFS traversal', () => {
    it('returns empty for noise level 0', () => {
      expect(soundSystem.propagateSound('entry', 0)).toHaveLength(0);
    });

    it('returns empty for unknown source room', () => {
      expect(soundSystem.propagateSound('nonexistent', 5)).toHaveLength(0);
    });

    it('does not include the source room in results', () => {
      const results = soundSystem.propagateSound('entry', 10);
      expect(results.find((r: { roomId: string }) => r.roomId === 'entry')).toBeUndefined();
    });

    it('propagates combat noise (5) to adjacent rooms', () => {
      const results = soundSystem.propagateSound('entry', NOISE_VALUES.combat);
      const roomIds = results.map((r: { roomId: string }) => r.roomId);
      expect(roomIds).toContain('corridor');
      expect(roomIds).toContain('armory');
    });

    it('propagates further with higher noise', () => {
      const results = soundSystem.propagateSound('entry', NOISE_VALUES.striking_door);
      const roomIds = results.map((r: { roomId: string }) => r.roomId);
      expect(roomIds).toContain('corridor');
      expect(roomIds).toContain('armory');
      expect(roomIds).toContain('shrine');
      expect(roomIds).toContain('crypt');
      expect(roomIds).toContain('deep-room');
    });

    it('sneaking noise (1) does not reach adjacent rooms', () => {
      expect(soundSystem.propagateSound('entry', NOISE_VALUES.sneaking)).toHaveLength(0);
    });

    it('walking noise (2) does not reach adjacent rooms', () => {
      expect(soundSystem.propagateSound('entry', NOISE_VALUES.walking)).toHaveLength(0);
    });
  });

  describe('attenuation calculation', () => {
    it('attenuates by 2 per room traversed', () => {
      const results = soundSystem.propagateSound('entry', 8);
      const corridor = results.find((r: { roomId: string }) => r.roomId === 'corridor');
      expect(corridor!.effectiveNoise).toBe(6); // 8 - 2
      const shrine = results.find((r: { roomId: string }) => r.roomId === 'shrine');
      expect(shrine!.effectiveNoise).toBe(4); // 8 - 4
    });

    it('sound dies when attenuation exceeds noise', () => {
      const results = soundSystem.propagateSound('entry', 3);
      const roomIds = results.map((r: { roomId: string }) => r.roomId);
      expect(roomIds).toContain('corridor');
      expect(roomIds).toContain('armory');
      expect(roomIds).not.toContain('shrine'); // 3-4=-1
    });

    it('tracks distance correctly through multi-hop paths', () => {
      const results = soundSystem.propagateSound('entry', 10);
      expect(results.find((r: { roomId: string }) => r.roomId === 'shrine')!.distance).toBe(2);
      expect(results.find((r: { roomId: string }) => r.roomId === 'deep-room')!.distance).toBe(3);
    });
  });

  describe('directional information', () => {
    it('reports direction sound came from relative to listener', () => {
      const results = soundSystem.propagateSound('entry', NOISE_VALUES.combat);
      expect(results.find((r: { roomId: string }) => r.roomId === 'corridor')!.direction).toBe('south');
      expect(results.find((r: { roomId: string }) => r.roomId === 'armory')!.direction).toBe('west');
    });

    it('reports correct direction for multi-hop propagation', () => {
      const results = soundSystem.propagateSound('entry', 8);
      expect(results.find((r: { roomId: string }) => r.roomId === 'shrine')!.direction).toBe('south');
    });

    it('combat in crypt: deep-room hears from up, corridor hears from west', () => {
      const results = soundSystem.propagateSound('crypt', NOISE_VALUES.combat);
      expect(results.find((r: { roomId: string }) => r.roomId === 'deep-room')!.direction).toBe('up');
      expect(results.find((r: { roomId: string }) => r.roomId === 'corridor')!.direction).toBe('west');
    });
  });

  describe('room modifier effects', () => {
    it('heavy_door halves noise entering the room', () => {
      rooms.set('corridor', {
        id: 'corridor',
        exits: new Map<Direction, string>([
          ['south', 'entry'],
          ['north', 'shrine'],
          ['west', 'crypt'],
        ]),
        properties: ['heavy_door'],
      });
      const results = soundSystem.propagateSound('entry', 8);
      expect(results.find((r: { roomId: string }) => r.roomId === 'corridor')!.effectiveNoise).toBe(3);
    });

    it('cavern reduces attenuation by 1', () => {
      rooms.set('corridor', {
        id: 'corridor',
        exits: new Map<Direction, string>([
          ['south', 'entry'],
          ['north', 'shrine'],
          ['west', 'crypt'],
        ]),
        properties: ['cavern'],
      });
      const results = soundSystem.propagateSound('entry', 4);
      expect(results.find((r: { roomId: string }) => r.roomId === 'corridor')!.effectiveNoise).toBe(3);
    });

    it('water reduces attenuation by 1', () => {
      rooms.set('corridor', {
        id: 'corridor',
        exits: new Map<Direction, string>([
          ['south', 'entry'],
          ['north', 'shrine'],
          ['west', 'crypt'],
        ]),
        properties: ['water'],
      });
      const results = soundSystem.propagateSound('entry', 4);
      expect(results.find((r: { roomId: string }) => r.roomId === 'corridor')!.effectiveNoise).toBe(3);
    });

    it('cavern + water stacks — attenuation can reach 0', () => {
      rooms.set('corridor', {
        id: 'corridor',
        exits: new Map<Direction, string>([
          ['south', 'entry'],
          ['north', 'shrine'],
          ['west', 'crypt'],
        ]),
        properties: ['cavern', 'water'],
      });
      const results = soundSystem.propagateSound('entry', 3);
      expect(results.find((r: { roomId: string }) => r.roomId === 'corridor')!.effectiveNoise).toBe(3);
    });

    it('heavy_door blocks low-noise sounds after attenuation + halving', () => {
      rooms.set('corridor', {
        id: 'corridor',
        exits: new Map<Direction, string>([
          ['south', 'entry'],
          ['north', 'shrine'],
          ['west', 'crypt'],
        ]),
        properties: ['heavy_door'],
      });
      const results = soundSystem.propagateSound('entry', 3);
      expect(results.find((r: { roomId: string }) => r.roomId === 'corridor')!.effectiveNoise).toBe(0.5);
      expect(results.find((r: { roomId: string }) => r.roomId === 'shrine')).toBeUndefined();
    });
  });

  describe('noise value constants', () => {
    it('has correct GDD §12.2 noise values', () => {
      expect(NOISE_VALUES.combat).toBe(5);
      expect(NOISE_VALUES.running).toBe(4);
      expect(NOISE_VALUES.walking).toBe(2);
      expect(NOISE_VALUES.striking_door).toBe(7);
      expect(NOISE_VALUES.explosion).toBe(9);
      expect(NOISE_VALUES.sneaking).toBe(1);
    });

    it('attenuation per room is 2', () => {
      expect(SOUND_ATTENUATION_PER_ROOM).toBe(2);
    });

    it('all sound types have descriptions', () => {
      const soundTypes: SoundType[] = [
        'combat', 'running', 'walking', 'striking_door',
        'explosion', 'sneaking',
      ];
      for (const st of soundTypes) {
        expect(SOUND_DESCRIPTIONS[st]).toBeDefined();
        expect(typeof SOUND_DESCRIPTIONS[st]).toBe('string');
      }
    });
  });

  // ─── Integration: combat in room A heard in rooms B and C ─────────────────

  describe('integration: combat in room A heard in rooms B and C', () => {
    it('attack in entry → corridor and armory hear combat sounds', () => {
      const results = soundSystem.propagateSound('entry', NOISE_VALUES.combat);

      const corridor = results.find((r: { roomId: string }) => r.roomId === 'corridor')!;
      expect(corridor.effectiveNoise).toBe(3);
      expect(corridor.distance).toBe(1);
      expect(corridor.direction).toBe('south');

      const armory = results.find((r: { roomId: string }) => r.roomId === 'armory')!;
      expect(armory.effectiveNoise).toBe(3);
      expect(armory.distance).toBe(1);
      expect(armory.direction).toBe('west');

      const shrine = results.find((r: { roomId: string }) => r.roomId === 'shrine')!;
      expect(shrine.effectiveNoise).toBe(1);
      expect(shrine.distance).toBe(2);

      const crypt = results.find((r: { roomId: string }) => r.roomId === 'crypt')!;
      expect(crypt.effectiveNoise).toBe(1);
      expect(crypt.distance).toBe(2);

      // deep-room: 3 rooms away, noise = 5-6=-1 → NOT audible
      expect(results.find((r: { roomId: string }) => r.roomId === 'deep-room')).toBeUndefined();
    });

    it('explosion sound (8) propagates through entire graph', () => {
      const results = soundSystem.propagateSound('entry', NOISE_VALUES.explosion);
      const roomIds = results.map((r: { roomId: string }) => r.roomId);
      expect(roomIds).toContain('corridor');
      expect(roomIds).toContain('armory');
      expect(roomIds).toContain('shrine');
      expect(roomIds).toContain('crypt');
      expect(roomIds).toContain('deep-room');
      expect(results.find((r: { roomId: string }) => r.roomId === 'deep-room')!.effectiveNoise).toBe(3);
    });
  });
});

// ─── Future: Cross-System Tests (stubs for Phase 2) ──────────────────────────

describe('Sound Propagation — Future Cross-System (#22)', () => {
  describe.skip('sound + stealth (#22 × #25)', () => {
    it.todo('sneaking player movement noise = 0–1');
    it.todo('combat breaks stealth and generates full combat noise');
  });

  describe.skip('listening skill (#22)', () => {
    it.todo('listening skill lowers audibility threshold');
    it.todo('high listening skill hears sounds one room further');
  });
});

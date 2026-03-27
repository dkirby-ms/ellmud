/**
 * Exploration Repository Tests — Phase A
 *
 * Verifies InMemoryExplorationRepository: visit recording, upsert semantics,
 * zone filtering, hasVisited checks, aggregate stats, and zone/shard isolation.
 *
 * Schema: characterId, zoneSlug (null for shards), roomId, roomType, roomName,
 * shardTier?, biome? — NO coordinate fields.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  InMemoryExplorationRepository,
  type ExplorationVisit,
} from '../exploration/index.js';

// ─── Fixtures ───────────────────────────────────────────────────────────────

const CHAR_A = 'char-alpha';
const CHAR_B = 'char-bravo';

function zoneVisit(overrides: Partial<ExplorationVisit> = {}): ExplorationVisit {
  return {
    characterId: CHAR_A,
    zoneSlug: 'flooded-crypt',
    roomId: 'room-corridor-1',
    roomType: 'corridor',
    roomName: 'Flooded Corridor',
    ...overrides,
  };
}

function shardVisit(overrides: Partial<ExplorationVisit> = {}): ExplorationVisit {
  return {
    characterId: CHAR_A,
    zoneSlug: null,
    roomId: 'shard-room-1',
    roomType: 'junction',
    roomName: 'Shattered Junction',
    shardTier: 2,
    biome: 'flooded_crypt',
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('InMemoryExplorationRepository', () => {
  let repo: InMemoryExplorationRepository;

  beforeEach(() => {
    repo = new InMemoryExplorationRepository();
  });

  // 1. recordVisit + getExploredRooms
  describe('recordVisit + getExploredRooms', () => {
    it('records a visit and retrieves it with all fields', async () => {
      const visit = zoneVisit();
      await repo.recordVisit(visit);

      const rooms = await repo.getExploredRooms(CHAR_A);
      expect(rooms).toHaveLength(1);

      const room = rooms[0]!;
      expect(room.characterId).toBe(CHAR_A);
      expect(room.zoneSlug).toBe('flooded-crypt');
      expect(room.roomId).toBe('room-corridor-1');
      expect(room.roomType).toBe('corridor');
      expect(room.roomName).toBe('Flooded Corridor');
      expect(room.shardTier).toBeNull();
      expect(room.biome).toBeNull();
      expect(room.visitCount).toBe(1);
      expect(room.firstVisited).toBeInstanceOf(Date);
      expect(room.lastVisited).toBeInstanceOf(Date);
    });

    it('records a shard visit with shardTier and biome', async () => {
      const visit = shardVisit();
      await repo.recordVisit(visit);

      const rooms = await repo.getExploredRooms(CHAR_A);
      expect(rooms).toHaveLength(1);

      const room = rooms[0]!;
      expect(room.zoneSlug).toBeNull();
      expect(room.shardTier).toBe(2);
      expect(room.biome).toBe('flooded_crypt');
    });

    it('returns empty array for character with no visits', async () => {
      const rooms = await repo.getExploredRooms('nobody');
      expect(rooms).toEqual([]);
    });

    it('returns rooms for correct character only', async () => {
      await repo.recordVisit(zoneVisit({ characterId: CHAR_A }));
      await repo.recordVisit(zoneVisit({ characterId: CHAR_B, roomId: 'room-b' }));

      const aRooms = await repo.getExploredRooms(CHAR_A);
      const bRooms = await repo.getExploredRooms(CHAR_B);

      expect(aRooms).toHaveLength(1);
      expect(bRooms).toHaveLength(1);
      expect(aRooms[0]!.characterId).toBe(CHAR_A);
      expect(bRooms[0]!.characterId).toBe(CHAR_B);
    });
  });

  // 2. Upsert semantics
  describe('upsert semantics', () => {
    it('increments visit_count on revisit', async () => {
      await repo.recordVisit(zoneVisit());
      await repo.recordVisit(zoneVisit());
      await repo.recordVisit(zoneVisit());

      const rooms = await repo.getExploredRooms(CHAR_A);
      expect(rooms).toHaveLength(1);
      expect(rooms[0]!.visitCount).toBe(3);
    });

    it('updates lastVisited on revisit', async () => {
      await repo.recordVisit(zoneVisit());
      const first = (await repo.getExploredRooms(CHAR_A))[0]!;
      const firstLastVisited = first.lastVisited.getTime();

      // Small delay to ensure timestamp differs
      await new Promise((r) => setTimeout(r, 10));

      await repo.recordVisit(zoneVisit());
      const updated = (await repo.getExploredRooms(CHAR_A))[0]!;
      expect(updated.lastVisited.getTime()).toBeGreaterThanOrEqual(firstLastVisited);
    });

    it('preserves firstVisited on revisit', async () => {
      await repo.recordVisit(zoneVisit());
      const first = (await repo.getExploredRooms(CHAR_A))[0]!;
      const originalFirstVisited = first.firstVisited.getTime();

      await new Promise((r) => setTimeout(r, 10));
      await repo.recordVisit(zoneVisit());

      const updated = (await repo.getExploredRooms(CHAR_A))[0]!;
      expect(updated.firstVisited.getTime()).toBe(originalFirstVisited);
    });
  });

  // 3. getExploredRoomsInZone
  describe('getExploredRoomsInZone', () => {
    it('filters rooms by zone', async () => {
      await repo.recordVisit(zoneVisit({ zoneSlug: 'flooded-crypt', roomId: 'fc-1' }));
      await repo.recordVisit(zoneVisit({ zoneSlug: 'flooded-crypt', roomId: 'fc-2' }));
      await repo.recordVisit(zoneVisit({ zoneSlug: 'shattered-bastion', roomId: 'sb-1' }));
      await repo.recordVisit(shardVisit({ roomId: 'shard-r1' }));

      const cryptRooms = await repo.getExploredRoomsInZone(CHAR_A, 'flooded-crypt');
      expect(cryptRooms).toHaveLength(2);
      expect(cryptRooms.every((r) => r.zoneSlug === 'flooded-crypt')).toBe(true);

      const bastionRooms = await repo.getExploredRoomsInZone(CHAR_A, 'shattered-bastion');
      expect(bastionRooms).toHaveLength(1);
      expect(bastionRooms[0]!.roomId).toBe('sb-1');
    });

    it('returns empty array for zone with no visits', async () => {
      await repo.recordVisit(zoneVisit({ zoneSlug: 'flooded-crypt' }));

      const rooms = await repo.getExploredRoomsInZone(CHAR_A, 'unknown-zone');
      expect(rooms).toEqual([]);
    });

    it('does not return shard rooms when filtering by zone', async () => {
      await repo.recordVisit(shardVisit());

      const rooms = await repo.getExploredRoomsInZone(CHAR_A, '__shard__');
      expect(rooms).toEqual([]);
    });
  });

  // 4. hasVisited
  describe('hasVisited', () => {
    it('returns true for visited rooms', async () => {
      await repo.recordVisit(zoneVisit());
      const visited = await repo.hasVisited(CHAR_A, 'flooded-crypt', 'room-corridor-1');
      expect(visited).toBe(true);
    });

    it('returns false for unvisited rooms', async () => {
      const visited = await repo.hasVisited(CHAR_A, 'flooded-crypt', 'never-been');
      expect(visited).toBe(false);
    });

    it('respects zoneSlug in lookup (null for shards)', async () => {
      await repo.recordVisit(shardVisit({ roomId: 'shard-rm' }));

      const visitedWithNull = await repo.hasVisited(CHAR_A, null, 'shard-rm');
      expect(visitedWithNull).toBe(true);

      const visitedWithZone = await repo.hasVisited(CHAR_A, 'some-zone', 'shard-rm');
      expect(visitedWithZone).toBe(false);
    });

    it('returns false for different character', async () => {
      await repo.recordVisit(zoneVisit({ characterId: CHAR_A }));
      const visited = await repo.hasVisited(CHAR_B, 'flooded-crypt', 'room-corridor-1');
      expect(visited).toBe(false);
    });
  });

  // 5. getExplorationStats
  describe('getExplorationStats', () => {
    it('returns zeroes for character with no visits', async () => {
      const stats = await repo.getExplorationStats('nobody');
      expect(stats.totalRooms).toBe(0);
      expect(stats.totalVisits).toBe(0);
      expect(stats.zones).toBe(0);
    });

    it('counts rooms, visits, and zones correctly', async () => {
      // 2 zone rooms in different zones + 1 shard room
      await repo.recordVisit(zoneVisit({ zoneSlug: 'flooded-crypt', roomId: 'fc-1' }));
      await repo.recordVisit(zoneVisit({ zoneSlug: 'shattered-bastion', roomId: 'sb-1' }));
      await repo.recordVisit(shardVisit({ roomId: 'shard-1' }));

      // Revisit one room twice
      await repo.recordVisit(zoneVisit({ zoneSlug: 'flooded-crypt', roomId: 'fc-1' }));
      await repo.recordVisit(zoneVisit({ zoneSlug: 'flooded-crypt', roomId: 'fc-1' }));

      const stats = await repo.getExplorationStats(CHAR_A);
      expect(stats.totalRooms).toBe(3);
      expect(stats.totalVisits).toBe(5); // 3 first visits + 2 revisits
      // 3 zones: flooded-crypt, shattered-bastion, __shard__ (null slug)
      expect(stats.zones).toBe(3);
    });

    it('counts shard null-zone as a separate zone bucket', async () => {
      await repo.recordVisit(shardVisit({ roomId: 'shard-a' }));
      await repo.recordVisit(shardVisit({ roomId: 'shard-b' }));

      const stats = await repo.getExplorationStats(CHAR_A);
      expect(stats.totalRooms).toBe(2);
      expect(stats.zones).toBe(1); // both shard rooms → same __shard__ bucket
    });
  });

  // 6. Zone vs shard isolation
  describe('zone vs shard isolation', () => {
    it('treats same roomId in different zones as separate entries', async () => {
      await repo.recordVisit(zoneVisit({ zoneSlug: 'flooded-crypt', roomId: 'room-1' }));
      await repo.recordVisit(zoneVisit({ zoneSlug: 'shattered-bastion', roomId: 'room-1' }));

      const rooms = await repo.getExploredRooms(CHAR_A);
      expect(rooms).toHaveLength(2);
      expect(rooms.map((r) => r.zoneSlug).sort()).toEqual(['flooded-crypt', 'shattered-bastion']);
    });

    it('treats same roomId in zone and shard as separate entries', async () => {
      await repo.recordVisit(zoneVisit({ zoneSlug: 'flooded-crypt', roomId: 'room-1' }));
      await repo.recordVisit(shardVisit({ roomId: 'room-1' }));

      const rooms = await repo.getExploredRooms(CHAR_A);
      expect(rooms).toHaveLength(2);

      const zoneSlugs = rooms.map((r) => r.zoneSlug);
      expect(zoneSlugs).toContain('flooded-crypt');
      expect(zoneSlugs).toContain(null);
    });
  });

  // 7. Null zone_slug for shards
  describe('null zone_slug for shards', () => {
    it('shard rooms have null zoneSlug', async () => {
      await repo.recordVisit(shardVisit());
      const rooms = await repo.getExploredRooms(CHAR_A);
      expect(rooms[0]!.zoneSlug).toBeNull();
    });

    it('zone rooms have a non-null zoneSlug', async () => {
      await repo.recordVisit(zoneVisit());
      const rooms = await repo.getExploredRooms(CHAR_A);
      expect(rooms[0]!.zoneSlug).toBe('flooded-crypt');
    });
  });

  // Bonus: returned records are copies, not live references
  describe('immutability', () => {
    it('getExploredRooms returns copies', async () => {
      await repo.recordVisit(zoneVisit());

      const rooms1 = await repo.getExploredRooms(CHAR_A);
      rooms1[0]!.visitCount = 999;

      const rooms2 = await repo.getExploredRooms(CHAR_A);
      expect(rooms2[0]!.visitCount).toBe(1);
    });
  });
});

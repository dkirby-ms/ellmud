/**
 * Unit tests for the roomOccupancy mapping logic used in LiveRoomDetail.
 *
 * Verifies that the per-room creature/player mapping works correctly
 * when using roomGraphRooms as the key source (the fix for static zones
 * where zoneData comes from a separate, possibly stale API call).
 */

import { describe, it, expect } from 'vitest';

// ─── Types (mirror the client-side interfaces) ──────────────────────────────

interface LiveRoomPlayer {
  sessionId: string;
  currentRoomId: string;
  inventoryCount: number;
  currentWeight: number;
  maxCarryWeight: number;
}

interface LiveRoomCreature {
  id: string;
  name: string;
  type: string;
  hp: number;
  maxHp: number;
  currentRoomId: string;
  behaviorState: string;
  isAlive: boolean;
}

interface RoomGraphRoom {
  id: string;
  name: string;
  type?: string;
}

interface ZoneRoom {
  slug: string;
  id: string;
  name: string;
  type: string;
}

// ─── Pure implementation of the roomOccupancy logic ─────────────────────────

/**
 * Mirrors the fixed roomOccupancy useMemo logic from LiveRoomDetail.tsx.
 * Prefers roomGraphRooms over zoneData.rooms for building the key map.
 */
function computeRoomOccupancy(
  roomGraphRooms: RoomGraphRoom[] | undefined,
  zoneDataRooms: ZoneRoom[] | undefined,
  players: LiveRoomPlayer[],
  creatures: LiveRoomCreature[],
): Record<string, { players: LiveRoomPlayer[]; creatures: LiveRoomCreature[] }> {
  const map: Record<string, { players: LiveRoomPlayer[]; creatures: LiveRoomCreature[] }> = {};

  // Fixed logic: prefer roomGraphRooms (from same API response as creatures)
  const roomList: { slug?: string; id?: string }[] =
    roomGraphRooms?.map((r) => ({ slug: r.id, id: r.id })) ?? zoneDataRooms ?? [];
  if (roomList.length === 0) return map;

  for (const zr of roomList) {
    const key = (zr as { slug?: string }).slug ?? (zr as { id?: string }).id ?? '';
    if (key) map[key] = { players: [], creatures: [] };
  }
  for (const p of players) {
    if (map[p.currentRoomId]) {
      map[p.currentRoomId].players.push(p);
    }
  }
  for (const c of creatures) {
    if (!map[c.currentRoomId]) {
      map[c.currentRoomId] = { players: [], creatures: [] };
    }
    map[c.currentRoomId].creatures.push(c);
  }
  return map;
}

/**
 * Mirrors the OLD (buggy) roomOccupancy logic that preferred zoneData.rooms.
 */
function computeRoomOccupancyOld(
  roomGraphRooms: RoomGraphRoom[] | undefined,
  zoneDataRooms: ZoneRoom[] | undefined,
  players: LiveRoomPlayer[],
  creatures: LiveRoomCreature[],
): Record<string, { players: LiveRoomPlayer[]; creatures: LiveRoomCreature[] }> {
  const map: Record<string, { players: LiveRoomPlayer[]; creatures: LiveRoomCreature[] }> = {};

  // Old logic: prefer zoneData.rooms
  const roomList: { slug?: string; id?: string }[] =
    zoneDataRooms ?? roomGraphRooms?.map((r) => ({ slug: r.id, id: r.id })) ?? [];
  if (roomList.length === 0) return map;

  for (const zr of roomList) {
    const key = (zr as { slug?: string }).slug ?? (zr as { id?: string }).id ?? '';
    if (key) map[key] = { players: [], creatures: [] };
  }
  for (const p of players) {
    if (map[p.currentRoomId]) {
      map[p.currentRoomId].players.push(p);
    }
  }
  for (const c of creatures) {
    if (map[c.currentRoomId]) {
      map[c.currentRoomId].creatures.push(c);
    }
  }
  return map;
}

// ─── Test Data ──────────────────────────────────────────────────────────────

const roomGraphRooms: RoomGraphRoom[] = [
  { id: 'entrance', name: 'Rift Entrance', type: 'entry' },
  { id: 'corridor', name: 'Dark Corridor' },
  { id: 'vault', name: 'Treasure Vault', type: 'boss' },
];

const makeCreature = (id: string, roomId: string): LiveRoomCreature => ({
  id,
  name: `Creature ${id}`,
  type: 'goblin',
  hp: 50,
  maxHp: 50,
  currentRoomId: roomId,
  behaviorState: 'idle',
  isAlive: true,
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('roomOccupancy logic (fixed)', () => {
  it('maps creatures to rooms using roomGraphRooms', () => {
    const creatures = [
      makeCreature('c-1', 'entrance'),
      makeCreature('c-2', 'corridor'),
    ];
    const result = computeRoomOccupancy(roomGraphRooms, undefined, [], creatures);

    expect(result['entrance'].creatures).toHaveLength(1);
    expect(result['entrance'].creatures[0].id).toBe('c-1');
    expect(result['corridor'].creatures).toHaveLength(1);
    expect(result['corridor'].creatures[0].id).toBe('c-2');
    expect(result['vault'].creatures).toHaveLength(0);
  });

  it('prefers roomGraphRooms even when zoneData.rooms is available', () => {
    // zoneData.rooms is "stale" — missing the 'vault' room
    const staleZoneRooms: ZoneRoom[] = [
      { slug: 'entrance', id: 'uuid-1', name: 'Rift Entrance', type: 'entry' },
      { slug: 'corridor', id: 'uuid-2', name: 'Dark Corridor', type: 'corridor' },
    ];
    const creatures = [makeCreature('c-1', 'vault')];

    const result = computeRoomOccupancy(roomGraphRooms, staleZoneRooms, [], creatures);

    // Fixed: creature appears because roomGraphRooms has 'vault'
    expect(result['vault']).toBeDefined();
    expect(result['vault'].creatures).toHaveLength(1);
    expect(result['vault'].creatures[0].id).toBe('c-1');
  });

  it('OLD logic drops creature when zoneData.rooms is stale', () => {
    // zoneData.rooms is "stale" — missing the 'vault' room
    const staleZoneRooms: ZoneRoom[] = [
      { slug: 'entrance', id: 'uuid-1', name: 'Rift Entrance', type: 'entry' },
      { slug: 'corridor', id: 'uuid-2', name: 'Dark Corridor', type: 'corridor' },
    ];
    const creatures = [makeCreature('c-1', 'vault')];

    const result = computeRoomOccupancyOld(roomGraphRooms, staleZoneRooms, [], creatures);

    // Bug: creature dropped because stale zoneData.rooms has no 'vault' key
    expect(result['vault']).toBeUndefined();
    // The creature is silently lost — this is the bug we're fixing
  });

  it('defensively creates room entry for unmatched creature currentRoomId', () => {
    // Creature references a room not in roomGraphRooms at all
    const creatures = [makeCreature('c-1', 'secret-room')];

    const result = computeRoomOccupancy(roomGraphRooms, undefined, [], creatures);

    // Defensive: creature is never silently dropped
    expect(result['secret-room']).toBeDefined();
    expect(result['secret-room'].creatures).toHaveLength(1);
  });

  it('falls back to zoneData.rooms when roomGraphRooms is undefined', () => {
    const zoneRooms: ZoneRoom[] = [
      { slug: 'entrance', id: 'uuid-1', name: 'Rift Entrance', type: 'entry' },
      { slug: 'corridor', id: 'uuid-2', name: 'Dark Corridor', type: 'corridor' },
    ];
    const creatures = [makeCreature('c-1', 'entrance')];

    const result = computeRoomOccupancy(undefined, zoneRooms, [], creatures);

    expect(result['entrance'].creatures).toHaveLength(1);
  });

  it('returns empty map when no room source is available', () => {
    const result = computeRoomOccupancy(undefined, undefined, [], []);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('maps players correctly alongside creatures', () => {
    const creatures = [makeCreature('c-1', 'entrance')];
    const players: LiveRoomPlayer[] = [{
      sessionId: 'p-1',
      currentRoomId: 'entrance',
      inventoryCount: 5,
      currentWeight: 10,
      maxCarryWeight: 100,
    }];

    const result = computeRoomOccupancy(roomGraphRooms, undefined, players, creatures);

    expect(result['entrance'].players).toHaveLength(1);
    expect(result['entrance'].creatures).toHaveLength(1);
  });

  it('handles spawned creature appearing after refresh (static zone flow)', () => {
    // Simulate: zoneData fetched at mount time with 3 rooms
    const zoneRooms: ZoneRoom[] = [
      { slug: 'entrance', id: 'uuid-1', name: 'Rift Entrance', type: 'entry' },
      { slug: 'corridor', id: 'uuid-2', name: 'Dark Corridor', type: 'corridor' },
      { slug: 'vault', id: 'uuid-3', name: 'Treasure Vault', type: 'boss' },
    ];

    // Before spawn: no creatures
    const before = computeRoomOccupancy(roomGraphRooms, zoneRooms, [], []);
    expect(before['entrance'].creatures).toHaveLength(0);

    // After spawn + loadRoom refresh: one creature
    const newCreatures = [makeCreature('creature-0', 'entrance')];
    const after = computeRoomOccupancy(roomGraphRooms, zoneRooms, [], newCreatures);

    expect(after['entrance'].creatures).toHaveLength(1);
    expect(after['entrance'].creatures[0].id).toBe('creature-0');
  });
});

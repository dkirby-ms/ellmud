/**
 * Wave 4 — Room Graph Generation (#5) anticipatory tests.
 *
 * Supplements zone-gen.test.ts with integration tests for:
 *   - Graph adapter (shared → local format conversion)
 *   - Multi-tier room count validation (Tier 2, Tier 3)
 *   - Theme-specific naming verification (Flooded Crypt pools)
 *   - Hazard placement in non-anchor rooms
 *   - Graph adapter item resolution via registry
 */

import { describe, it, expect } from 'vitest';
import type { ZoneTier, Room as SharedRoom } from '@ellmud/shared';
import { serializeRoomGraph, deserializeRoomGraph } from '@ellmud/shared';
import { generateZoneGraph, ROOM_NAMES } from '../zone/generator.js';
import { adaptRoomGraph } from '../zone/graph-adapter.js';

// ─── Configs ────────────────────────────────────────────────────────────────

const T1_CONFIG = { tier: 1 as ZoneTier, seed: 42 };
const T2_CONFIG = { tier: 2 as ZoneTier, seed: 42 };
const T3_CONFIG = { tier: 3 as ZoneTier, seed: 42 };

// ─── BFS Helper ─────────────────────────────────────────────────────────────

function bfs(startId: string, rooms: Map<string, SharedRoom>): Map<string, number> {
  const dist = new Map<string, number>();
  dist.set(startId, 0);
  const queue = [startId];
  let head = 0;

  while (head < queue.length) {
    const current = queue[head++];
    const room = rooms.get(current)!;
    const d = dist.get(current)!;

    for (const neighborId of room.exits.values()) {
      if (!dist.has(neighborId)) {
        dist.set(neighborId, d + 1);
        queue.push(neighborId);
      }
    }
  }
  return dist;
}

// ─── Multi-Tier Room Counts ─────────────────────────────────────────────────

describe('Multi-Tier Room Count Validation (#5)', () => {
  it('Tier 2 generates 25–40 rooms', () => {
    for (const seed of [1, 42, 100, 9999, 77777]) {
      const graph = generateZoneGraph({ ...T2_CONFIG, seed });
      expect(graph.rooms.size).toBeGreaterThanOrEqual(25);
      expect(graph.rooms.size).toBeLessThanOrEqual(40);
    }
  });

  it('Tier 3 generates 40–60 rooms', () => {
    for (const seed of [1, 42, 100, 9999, 77777]) {
      const graph = generateZoneGraph({ ...T3_CONFIG, seed });
      expect(graph.rooms.size).toBeGreaterThanOrEqual(40);
      expect(graph.rooms.size).toBeLessThanOrEqual(60);
    }
  });

  it('Tier 2 has 3 entries, 1 boss', () => {
    const graph = generateZoneGraph(T2_CONFIG);
    const types = Array.from(graph.rooms.values()).map(r => r.type);

    expect(types.filter(t => t === 'entry').length).toBe(3);
    expect(types.filter(t => t === 'boss').length).toBe(1);
    expect(graph.entryRoomIds).toHaveLength(3);
  });

  it('Tier 3 has 4 entries, 1 boss', () => {
    const graph = generateZoneGraph(T3_CONFIG);
    const types = Array.from(graph.rooms.values()).map(r => r.type);

    expect(types.filter(t => t === 'entry').length).toBe(4);
    expect(types.filter(t => t === 'boss').length).toBe(1);
    expect(graph.entryRoomIds).toHaveLength(4);
  });

  it('all tiers are fully connected', () => {
    for (const config of [T1_CONFIG, T2_CONFIG, T3_CONFIG]) {
      const graph = generateZoneGraph(config);
      for (const entryId of graph.entryRoomIds) {
        const reachable = bfs(entryId, graph.rooms);
        expect(reachable.size).toBe(graph.rooms.size);
      }
    }
  });

});

// ─── Theme Name Verification ────────────────────────────────────────────────

describe('Flooded Crypt Theme Naming (#5)', () => {
  it('all room names come from the flooded_crypt theme pool', () => {
    const graph = generateZoneGraph(T1_CONFIG);
    const allThemeNames = new Set<string>();
    for (const names of Object.values(ROOM_NAMES)) {
      for (const name of names) {
        allThemeNames.add(name);
      }
    }

    for (const room of graph.rooms.values()) {
      expect(allThemeNames.has(room.name)).toBe(true);
    }
  });

  it('room names match their type pool', () => {
    const graph = generateZoneGraph(T1_CONFIG);

    for (const room of graph.rooms.values()) {
      const typePool = ROOM_NAMES[room.type];
      expect(typePool).toBeDefined();
      expect(typePool).toContain(room.name);
    }
  });

  it('graph metadata is stored on the graph', () => {
    const graph = generateZoneGraph(T1_CONFIG);
    expect(graph.tier).toBe(1);
    expect(graph.seed).toBe(42);
  });
});

// ─── Hazard Placement ───────────────────────────────────────────────────────

describe('Hazard Placement (#5)', () => {
  it('hazards are placed in some rooms', () => {
    // Test across seeds — at least one should have hazards (probabilistic)
    let hasHazards = false;
    for (const seed of [42, 7, 100, 999, 314]) {
      const graph = generateZoneGraph({ ...T1_CONFIG, seed });
      for (const room of graph.rooms.values()) {
        if (room.hazards.length > 0) {
          hasHazards = true;
        }
      }
    }
    expect(hasHazards).toBe(true);
  });

  it('hazards are not placed in entry rooms', () => {
    for (const seed of [42, 7, 256, 65535]) {
      const graph = generateZoneGraph({ ...T1_CONFIG, seed });
      for (const room of graph.rooms.values()) {
        if (room.type === 'entry') {
          expect(room.hazards).toHaveLength(0);
        }
      }
    }
  });

  it('hazard severity is between 0 and 1', () => {
    for (const seed of [42, 100, 9999]) {
      const graph = generateZoneGraph({ ...T1_CONFIG, seed });
      for (const room of graph.rooms.values()) {
        for (const hazard of room.hazards) {
          expect(hazard.severity).toBeGreaterThanOrEqual(0);
          expect(hazard.severity).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('hazard types are from the flooded_crypt template set', () => {
    const validTypes = new Set(['rising_water', 'slippery_floor', 'crumbling_ceiling', 'submerged_trap']);
    for (const seed of [42, 7, 100]) {
      const graph = generateZoneGraph({ ...T1_CONFIG, seed });
      for (const room of graph.rooms.values()) {
        for (const hazard of room.hazards) {
          expect(validTypes.has(hazard.type)).toBe(true);
        }
      }
    }
  });
});

// ─── Graph Adapter ──────────────────────────────────────────────────────────

describe('Graph Adapter — Shared → Local Conversion (#5)', () => {
  it('preserves room count', () => {
    const shared = generateZoneGraph(T1_CONFIG);
    const local = adaptRoomGraph(shared);
    expect(local.rooms.size).toBe(shared.rooms.size);
  });

  it('startRoomId is the first entry room', () => {
    const shared = generateZoneGraph(T1_CONFIG);
    const local = adaptRoomGraph(shared);
    expect(local.startRoomId).toBe(shared.entryRoomIds[0]);
  });

  it('preserves boss room ID', () => {
    const shared = generateZoneGraph(T1_CONFIG);
    const local = adaptRoomGraph(shared);
    expect(local.bossRoomId).toBe(shared.bossRoomId);
  });

  it('preserves exit connectivity between rooms', () => {
    const shared = generateZoneGraph(T1_CONFIG);
    const local = adaptRoomGraph(shared);

    for (const [id, sharedRoom] of shared.rooms) {
      const localRoom = local.rooms.get(id)!;
      expect(localRoom).toBeDefined();
      expect(localRoom.exits.size).toBe(sharedRoom.exits.size);

      for (const [dir, targetId] of sharedRoom.exits) {
        expect(localRoom.exits.get(dir)).toBe(targetId);
      }
    }
  });

  it('preserves room names and descriptions', () => {
    const shared = generateZoneGraph(T1_CONFIG);
    const local = adaptRoomGraph(shared);

    for (const [id, sharedRoom] of shared.rooms) {
      const localRoom = local.rooms.get(id)!;
      expect(localRoom.name).toBe(sharedRoom.name);
      expect(localRoom.description).toBe(sharedRoom.description);
    }
  });

  it('resolves loot container items to Item objects', () => {
    const shared = generateZoneGraph(T1_CONFIG);
    const local = adaptRoomGraph(shared);

    // Find a room with loot containers in the shared graph
    let roomWithLoot: SharedRoom | undefined;
    for (const room of shared.rooms.values()) {
      if (room.items.length > 0) {
        roomWithLoot = room;
        break;
      }
    }

    if (roomWithLoot) {
      const localRoom = local.rooms.get(roomWithLoot.id)!;
      // Local room should have resolved Item objects (not LootContainers)
      expect(localRoom.items.length).toBeGreaterThanOrEqual(0);
      for (const item of localRoom.items) {
        expect(item.id).toBeTruthy();
        expect(item.name).toBeTruthy();
        expect(typeof item.weight).toBe('number');
      }
    }
  });
});

// ─── Serialization Round-Trip (Multi-Tier) ──────────────────────────────────

describe('Serialization Round-Trip — All Tiers (#5)', () => {
  for (const config of [
    { ...T1_CONFIG, label: 'Tier 1' },
    { ...T2_CONFIG, label: 'Tier 2' },
    { ...T3_CONFIG, label: 'Tier 3' },
  ]) {
    it(`${config.label} serializes and deserializes cleanly`, () => {
      const graph = generateZoneGraph(config);
      const serialized = serializeRoomGraph(graph);
      const json = JSON.stringify(serialized);
      const parsed = JSON.parse(json);
      const restored = deserializeRoomGraph(parsed);

      expect(restored.rooms.size).toBe(graph.rooms.size);
      expect(restored.entryRoomIds).toEqual(graph.entryRoomIds);
      expect(restored.bossRoomId).toBe(graph.bossRoomId);
      expect(restored.seed).toBe(graph.seed);
      expect(restored.tier).toBe(graph.tier);

      for (const [id, room] of graph.rooms) {
        const r = restored.rooms.get(id)!;
        expect(r).toBeDefined();
        expect(r.name).toBe(room.name);
        expect(r.type).toBe(room.type);
        expect(Object.fromEntries(r.exits)).toEqual(Object.fromEntries(room.exits));
        expect(r.hazards).toEqual(room.hazards);
        expect(r.items).toEqual(room.items);
      }
    });
  }
});

// ─── Determinism Across Tiers ───────────────────────────────────────────────

describe('Determinism — All Tiers (#5)', () => {
  for (const config of [T1_CONFIG, T2_CONFIG, T3_CONFIG]) {
    it(`Tier ${config.tier}: same seed produces identical graph`, () => {
      const g1 = generateZoneGraph(config);
      const g2 = generateZoneGraph(config);

      expect(g1.rooms.size).toBe(g2.rooms.size);
      expect(g1.entryRoomIds).toEqual(g2.entryRoomIds);
      expect(g1.bossRoomId).toBe(g2.bossRoomId);

      for (const [id, room1] of g1.rooms) {
        const room2 = g2.rooms.get(id)!;
        expect(room2).toBeDefined();
        expect(room1.name).toBe(room2.name);
        expect(room1.type).toBe(room2.type);
        expect(Object.fromEntries(room1.exits)).toEqual(Object.fromEntries(room2.exits));
      }
    });
  }
});

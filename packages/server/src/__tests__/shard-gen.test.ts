/**
 * Shard graph generation tests.
 * Verifies determinism, connectivity, room counts, anchor placement,
 * minimum distance constraints, cycle existence, and serialization.
 */

import { describe, it, expect } from 'vitest';
import type { Room, RoomGraph, ShardTier, BiomeType } from '@ellmud/shared';
import { serializeRoomGraph, deserializeRoomGraph } from '@ellmud/shared';
import { generateShardGraph } from '../shard/generator.js';
import { createPRNG } from '../shard/prng.js';

// ─── Helper: BFS distance map ───────────────────────────────────────────────

function bfs(startId: string, rooms: Map<string, Room>): Map<string, number> {
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

// ─── Default test config ────────────────────────────────────────────────────

const T1_CONFIG = { tier: 1 as ShardTier, biome: 'flooded_crypt' as BiomeType, seed: 42 };

describe('PRNG', () => {
  it('is deterministic — same seed, same sequence', () => {
    const a = createPRNG(12345);
    const b = createPRNG(12345);

    const seqA = Array.from({ length: 100 }, () => a.next());
    const seqB = Array.from({ length: 100 }, () => b.next());

    expect(seqA).toEqual(seqB);
  });

  it('different seeds produce different sequences', () => {
    const a = createPRNG(1);
    const b = createPRNG(2);

    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());

    expect(seqA).not.toEqual(seqB);
  });

  it('nextInt returns values in range', () => {
    const rng = createPRNG(999);
    for (let i = 0; i < 1000; i++) {
      const val = rng.nextInt(5, 10);
      expect(val).toBeGreaterThanOrEqual(5);
      expect(val).toBeLessThanOrEqual(10);
    }
  });

  it('pick selects from array', () => {
    const rng = createPRNG(77);
    const arr = ['a', 'b', 'c'];
    for (let i = 0; i < 50; i++) {
      expect(arr).toContain(rng.pick(arr));
    }
  });
});

describe('Shard Graph Generation', () => {
  it('determinism: same seed produces identical graph', () => {
    const g1 = generateShardGraph(T1_CONFIG);
    const g2 = generateShardGraph(T1_CONFIG);

    expect(g1.rooms.size).toBe(g2.rooms.size);
    expect(g1.entryRoomIds).toEqual(g2.entryRoomIds);
    expect(g1.extractionRoomIds).toEqual(g2.extractionRoomIds);
    expect(g1.bossRoomId).toBe(g2.bossRoomId);

    for (const [id, room1] of g1.rooms) {
      const room2 = g2.rooms.get(id)!;
      expect(room2).toBeDefined();
      expect(room1.name).toBe(room2.name);
      expect(room1.description).toBe(room2.description);
      expect(room1.type).toBe(room2.type);
      expect(Object.fromEntries(room1.exits)).toEqual(Object.fromEntries(room2.exits));
    }
  });

  it('room count within Tier 1 range (15–25)', () => {
    // Test across multiple seeds
    for (const seed of [1, 42, 100, 9999, 314159]) {
      const graph = generateShardGraph({ ...T1_CONFIG, seed });
      expect(graph.rooms.size).toBeGreaterThanOrEqual(15);
      expect(graph.rooms.size).toBeLessThanOrEqual(25);
    }
  });

  it('all anchor rooms present: 2 entry, 2 extraction, 1 boss', () => {
    const graph = generateShardGraph(T1_CONFIG);
    const types = Array.from(graph.rooms.values()).map(r => r.type);

    expect(types.filter(t => t === 'entry').length).toBe(2);
    expect(types.filter(t => t === 'extraction').length).toBe(2);
    expect(types.filter(t => t === 'boss').length).toBe(1);

    expect(graph.entryRoomIds).toHaveLength(2);
    expect(graph.extractionRoomIds).toHaveLength(2);
    expect(graph.bossRoomId).toBeTruthy();
  });

  it('connectivity: BFS from any entry reaches all rooms', () => {
    for (const seed of [42, 7, 256, 65535]) {
      const graph = generateShardGraph({ ...T1_CONFIG, seed });

      for (const entryId of graph.entryRoomIds) {
        const reachable = bfs(entryId, graph.rooms);
        expect(reachable.size).toBe(
          graph.rooms.size,
          // (message is for debugging only — vitest doesn't support msg param in toBe)
        );
      }
    }
  });

  it('no trivial path: entry to nearest extraction ≥ 5 hops', () => {
    for (const seed of [42, 7, 256, 65535, 1000]) {
      const graph = generateShardGraph({ ...T1_CONFIG, seed });

      for (const entryId of graph.entryRoomIds) {
        const dist = bfs(entryId, graph.rooms);
        for (const extId of graph.extractionRoomIds) {
          const d = dist.get(extId);
          expect(d).toBeDefined();
          expect(d!).toBeGreaterThanOrEqual(5);
        }
      }
    }
  });

  it('cycles exist: graph is not a tree', () => {
    const graph = generateShardGraph(T1_CONFIG);
    const edgeCount = countEdges(graph);
    const nodeCount = graph.rooms.size;
    // A tree has exactly N-1 edges. More edges = cycles.
    expect(edgeCount).toBeGreaterThan(nodeCount - 1);
  });

  it('biome templates applied: all rooms have names and descriptions', () => {
    const graph = generateShardGraph(T1_CONFIG);
    for (const room of graph.rooms.values()) {
      expect(room.name).toBeTruthy();
      expect(room.name.length).toBeGreaterThan(0);
      expect(room.description).toBeTruthy();
      expect(room.description.length).toBeGreaterThan(0);
    }
  });

  it('exits are bidirectional', () => {
    const graph = generateShardGraph(T1_CONFIG);
    for (const room of graph.rooms.values()) {
      for (const [, targetId] of room.exits) {
        const target = graph.rooms.get(targetId)!;
        expect(target).toBeDefined();
        // Target should have an exit back to this room
        const backLinks = Array.from(target.exits.values());
        expect(backLinks).toContain(room.id);
      }
    }
  });

  it('different seeds produce different graphs', () => {
    const g1 = generateShardGraph({ ...T1_CONFIG, seed: 1 });
    const g2 = generateShardGraph({ ...T1_CONFIG, seed: 2 });

    // Room counts may differ, or names/connections will differ
    const names1 = Array.from(g1.rooms.values()).map(r => r.name).sort();
    const names2 = Array.from(g2.rooms.values()).map(r => r.name).sort();
    const exits1 = JSON.stringify(
      Array.from(g1.rooms.values()).map(r => Object.fromEntries(r.exits)),
    );
    const exits2 = JSON.stringify(
      Array.from(g2.rooms.values()).map(r => Object.fromEntries(r.exits)),
    );

    // At least one of these should differ
    expect(names1.join(',') !== names2.join(',') || exits1 !== exits2).toBe(true);
  });

  it('serialization round-trips cleanly', () => {
    const graph = generateShardGraph(T1_CONFIG);
    const serialized = serializeRoomGraph(graph);
    const json = JSON.stringify(serialized);
    const parsed = JSON.parse(json);
    const restored = deserializeRoomGraph(parsed);

    expect(restored.rooms.size).toBe(graph.rooms.size);
    expect(restored.entryRoomIds).toEqual(graph.entryRoomIds);
    expect(restored.extractionRoomIds).toEqual(graph.extractionRoomIds);
    expect(restored.bossRoomId).toBe(graph.bossRoomId);
    expect(restored.seed).toBe(graph.seed);
    expect(restored.biome).toBe(graph.biome);
    expect(restored.tier).toBe(graph.tier);

    for (const [id, room] of graph.rooms) {
      const r = restored.rooms.get(id)!;
      expect(r).toBeDefined();
      expect(r.name).toBe(room.name);
      expect(r.type).toBe(room.type);
      expect(Object.fromEntries(r.exits)).toEqual(Object.fromEntries(room.exits));
    }
  });

  it('loot containers placed in non-anchor rooms', () => {
    const graph = generateShardGraph(T1_CONFIG);
    let hasLoot = false;
    for (const room of graph.rooms.values()) {
      if (room.items.length > 0) {
        hasLoot = true;
        // Entry and extraction rooms should not have loot
        expect(room.type).not.toBe('entry');
        expect(room.type).not.toBe('extraction');
      }
    }
    expect(hasLoot).toBe(true);
  });

  it('dead-end rooms have exactly 1 exit', () => {
    for (const seed of [1, 7, 42, 100, 256, 9999, 314159]) {
      const graph = generateShardGraph({ ...T1_CONFIG, seed });
      for (const room of graph.rooms.values()) {
        if (room.type === 'dead_end') {
          expect(room.exits.size).toBe(1);
        }
      }
    }
  });

  it('at least one dead-end room exists in every graph', () => {
    for (const seed of [1, 7, 42, 100, 256, 9999, 314159]) {
      const graph = generateShardGraph({ ...T1_CONFIG, seed });
      const deadEnds = Array.from(graph.rooms.values()).filter(r => r.type === 'dead_end');
      expect(deadEnds.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('junction rooms have ≥ 3 exits', () => {
    // Junctions are topological branching points — they need 3+ connections
    for (const seed of [1, 7, 42, 100, 256, 314159]) {
      const graph = generateShardGraph({ ...T1_CONFIG, seed });
      for (const room of graph.rooms.values()) {
        if (room.type === 'junction') {
          expect(room.exits.size).toBeGreaterThanOrEqual(3);
        }
      }
    }
  });

  it('boss room reachable from all entries', () => {
    for (const seed of [42, 7, 256]) {
      const graph = generateShardGraph({ ...T1_CONFIG, seed });
      for (const entryId of graph.entryRoomIds) {
        const dist = bfs(entryId, graph.rooms);
        expect(dist.has(graph.bossRoomId)).toBe(true);
      }
    }
  });

  it('hazards placed only in non-entry/extraction rooms', () => {
    const graph = generateShardGraph(T1_CONFIG);
    let hasHazard = false;
    for (const room of graph.rooms.values()) {
      if (room.hazards.length > 0) {
        hasHazard = true;
        expect(room.type).not.toBe('entry');
        expect(room.type).not.toBe('extraction');
        for (const hazard of room.hazards) {
          expect(hazard.type).toBeTruthy();
          expect(hazard.severity).toBeGreaterThan(0);
        }
      }
    }
    expect(hasHazard).toBe(true);
  });

  it('room type distribution includes corridors, junctions, and dead ends', () => {
    // With enough rooms, all fill types should appear
    const graph = generateShardGraph({ ...T1_CONFIG, seed: 100 });
    const types = new Set(Array.from(graph.rooms.values()).map(r => r.type));
    expect(types.has('corridor')).toBe(true);
    expect(types.has('junction')).toBe(true);
    expect(types.has('dead_end')).toBe(true);
  });

  it('graph metadata preserved: seed, biome, tier', () => {
    const graph = generateShardGraph(T1_CONFIG);
    expect(graph.seed).toBe(T1_CONFIG.seed);
    expect(graph.biome).toBe(T1_CONFIG.biome);
    expect(graph.tier).toBe(T1_CONFIG.tier);
  });
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function countEdges(graph: RoomGraph): number {
  let count = 0;
  for (const room of graph.rooms.values()) {
    count += room.exits.size;
  }
  // Each edge is counted twice (bidirectional)
  return count / 2;
}

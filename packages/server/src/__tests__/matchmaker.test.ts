/**
 * Matchmaker Unit Tests — Issue #21
 *
 * Tests for matchmaker queue, tier-based capacity, entry point distribution,
 * shard selection, and multi-player validation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  Matchmaker,
  TIER_CAPACITY,
  QUEUE_TIMEOUT_MS,
  type QueuedPlayer,
  type ShardSlot,
} from '../matchmaking/index.js';

function makePlayer(id: string, overrides?: Partial<QueuedPlayer>): QueuedPlayer {
  return {
    playerId: id,
    queuedAt: Date.now(),
    ...overrides,
  };
}

function makeShard(roomId: string, overrides?: Partial<ShardSlot>): ShardSlot {
  return {
    roomId,
    tier: 1,
    biome: 'flooded_crypt',
    currentPlayers: 0,
    maxPlayers: TIER_CAPACITY[1].max,
    entryPoints: ['entry-a', 'entry-b'],
    assignedEntryPoints: new Map(),
    lifecycle: 'open',
    locked: false,
    ...overrides,
  };
}

describe('Matchmaker — Tier Capacity (GDD §10.1)', () => {
  let mm: Matchmaker;

  beforeEach(() => {
    mm = new Matchmaker();
  });

  it('Tier 1 (Shallow) allows max 3 players', () => {
    expect(mm.getMaxPlayersForTier(1)).toBe(3);
  });

  it('Tier 2 (Deep) allows max 4 players', () => {
    expect(mm.getMaxPlayersForTier(2)).toBe(4);
  });

  it('Tier 3 (Abyssal) allows max 6 players', () => {
    expect(mm.getMaxPlayersForTier(3)).toBe(6);
  });

  it('Tier 1 has 2 entry points', () => {
    expect(mm.getEntryPointCount(1)).toBe(2);
  });

  it('Tier 2 has 3 entry points', () => {
    expect(mm.getEntryPointCount(2)).toBe(3);
  });

  it('Tier 3 has 4 entry points', () => {
    expect(mm.getEntryPointCount(3)).toBe(4);
  });

  it('Tier capacity constants match GDD tier table', () => {
    expect(TIER_CAPACITY[1]).toEqual({ min: 1, max: 3, entryPoints: 2 });
    expect(TIER_CAPACITY[2]).toEqual({ min: 2, max: 4, entryPoints: 3 });
    expect(TIER_CAPACITY[3]).toEqual({ min: 3, max: 6, entryPoints: 4 });
  });
});

describe('Matchmaker — Queue Management', () => {
  let mm: Matchmaker;

  beforeEach(() => {
    mm = new Matchmaker();
  });

  it('should enqueue a player', () => {
    mm.enqueue(makePlayer('p1'));
    expect(mm.getQueue()).toHaveLength(1);
    expect(mm.getQueue()[0].playerId).toBe('p1');
  });

  it('should prevent duplicate queue entries', () => {
    mm.enqueue(makePlayer('p1'));
    mm.enqueue(makePlayer('p1'));
    expect(mm.getQueue()).toHaveLength(1);
  });

  it('should dequeue a specific player', () => {
    mm.enqueue(makePlayer('p1'));
    mm.enqueue(makePlayer('p2'));
    const removed = mm.dequeue('p1');
    expect(removed?.playerId).toBe('p1');
    expect(mm.getQueue()).toHaveLength(1);
    expect(mm.getQueue()[0].playerId).toBe('p2');
  });

  it('should return undefined when dequeuing non-existent player', () => {
    expect(mm.dequeue('ghost')).toBeUndefined();
  });

  it('should prune expired players', () => {
    const now = Date.now();
    mm.enqueue(makePlayer('fresh', { queuedAt: now }));
    mm.enqueue(makePlayer('stale', { queuedAt: now - QUEUE_TIMEOUT_MS - 1 }));
    const expired = mm.pruneExpired(now);
    expect(expired).toHaveLength(1);
    expect(expired[0].playerId).toBe('stale');
    expect(mm.getQueue()).toHaveLength(1);
    expect(mm.getQueue()[0].playerId).toBe('fresh');
  });

  it('should return immutable queue snapshot', () => {
    mm.enqueue(makePlayer('p1'));
    const q1 = mm.getQueue();
    mm.enqueue(makePlayer('p2'));
    const q2 = mm.getQueue();
    expect(q1).toHaveLength(1);
    expect(q2).toHaveLength(2);
  });
});

describe('Matchmaker — Shard Registration', () => {
  let mm: Matchmaker;

  beforeEach(() => {
    mm = new Matchmaker();
  });

  it('should register and retrieve a shard', () => {
    const shard = makeShard('room-1');
    mm.registerShard(shard);
    expect(mm.getShard('room-1')).toBeDefined();
    expect(mm.getShard('room-1')?.tier).toBe(1);
  });

  it('should unregister a shard', () => {
    mm.registerShard(makeShard('room-1'));
    mm.unregisterShard('room-1');
    expect(mm.getShard('room-1')).toBeUndefined();
  });

  it('should update shard player count', () => {
    mm.registerShard(makeShard('room-1'));
    mm.updateShardPlayerCount('room-1', 2);
    expect(mm.getShard('room-1')?.currentPlayers).toBe(2);
  });

  it('should list all active shards', () => {
    mm.registerShard(makeShard('room-1'));
    mm.registerShard(makeShard('room-2'));
    expect(mm.getActiveShards()).toHaveLength(2);
  });
});

describe('Matchmaker — Match Logic', () => {
  let mm: Matchmaker;

  beforeEach(() => {
    mm = new Matchmaker();
  });

  it('should find a joinable shard for a player', () => {
    mm.registerShard(makeShard('room-1'));
    const match = mm.findMatch(makePlayer('p1'));
    expect(match).not.toBeNull();
    expect(match?.roomId).toBe('room-1');
  });

  it('should return null when no shards are available', () => {
    const match = mm.findMatch(makePlayer('p1'));
    expect(match).toBeNull();
  });

  it('should not match to full shards', () => {
    mm.registerShard(makeShard('room-1', { currentPlayers: 3, maxPlayers: 3 }));
    const match = mm.findMatch(makePlayer('p1'));
    expect(match).toBeNull();
  });

  it('should not match to locked shards', () => {
    mm.registerShard(makeShard('room-1', { locked: true }));
    const match = mm.findMatch(makePlayer('p1'));
    expect(match).toBeNull();
  });

  it('should not match to non-open shards', () => {
    mm.registerShard(makeShard('room-1', { lifecycle: 'active' }));
    const match = mm.findMatch(makePlayer('p1'));
    expect(match).toBeNull();
  });

  it('should prefer shard matching tier preference', () => {
    mm.registerShard(makeShard('tier1', { tier: 1 }));
    mm.registerShard(makeShard('tier2', { tier: 2, maxPlayers: 4 }));
    const match = mm.findMatch(makePlayer('p1', { preferredTier: 2 }));
    expect(match?.roomId).toBe('tier2');
  });

  it('should prefer shard matching biome preference', () => {
    mm.registerShard(makeShard('crypt', { biome: 'flooded_crypt' }));
    mm.registerShard(makeShard('bastion', { biome: 'shattered_bastion' }));
    const match = mm.findMatch(makePlayer('p1', { preferredBiome: 'shattered_bastion' }));
    expect(match?.roomId).toBe('bastion');
  });

  it('should prefer fuller shards for social density', () => {
    mm.registerShard(makeShard('empty', { currentPlayers: 0 }));
    mm.registerShard(makeShard('social', { currentPlayers: 2 }));
    const match = mm.findMatch(makePlayer('p1'));
    expect(match?.roomId).toBe('social');
  });
});

describe('Matchmaker — Entry Point Distribution', () => {
  let mm: Matchmaker;

  beforeEach(() => {
    mm = new Matchmaker();
  });

  it('should assign entry point to player', () => {
    mm.registerShard(makeShard('room-1', {
      entryPoints: ['entry-a', 'entry-b'],
    }));
    const entry = mm.assignEntryPoint('room-1', 'p1');
    expect(entry).toBe('entry-a');
  });

  it('should distribute players across entry points (round-robin)', () => {
    mm.registerShard(makeShard('room-1', {
      maxPlayers: 4,
      entryPoints: ['entry-a', 'entry-b'],
    }));

    const e1 = mm.assignEntryPoint('room-1', 'p1');
    const e2 = mm.assignEntryPoint('room-1', 'p2');
    const e3 = mm.assignEntryPoint('room-1', 'p3');

    expect(e1).toBe('entry-a');
    expect(e2).toBe('entry-b');
    expect(e3).toBe('entry-a'); // wraps around
  });

  it('should track player entry point assignments', () => {
    mm.registerShard(makeShard('room-1'));
    mm.assignEntryPoint('room-1', 'p1');
    mm.assignEntryPoint('room-1', 'p2');

    const shard = mm.getShard('room-1');
    expect(shard?.assignedEntryPoints.get('p1')).toBe('entry-a');
    expect(shard?.assignedEntryPoints.get('p2')).toBe('entry-b');
  });

  it('should reject entry point when shard is full', () => {
    mm.registerShard(makeShard('room-1', { currentPlayers: 3, maxPlayers: 3 }));
    const entry = mm.assignEntryPoint('room-1', 'p4');
    expect(entry).toBeNull();
  });

  it('should reject entry point for unknown shard', () => {
    const entry = mm.assignEntryPoint('ghost', 'p1');
    expect(entry).toBeNull();
  });

  it('should release entry point on player leave', () => {
    mm.registerShard(makeShard('room-1'));
    mm.assignEntryPoint('room-1', 'p1');
    mm.releaseEntryPoint('room-1', 'p1');

    const shard = mm.getShard('room-1');
    expect(shard?.assignedEntryPoints.has('p1')).toBe(false);
    expect(shard?.currentPlayers).toBe(0);
  });

  it('should validate even entry point distribution', () => {
    mm.registerShard(makeShard('room-1', {
      maxPlayers: 4,
      entryPoints: ['entry-a', 'entry-b'],
    }));
    mm.assignEntryPoint('room-1', 'p1');
    mm.assignEntryPoint('room-1', 'p2');

    const validation = mm.validateEntryPoints('room-1');
    expect(validation.valid).toBe(true);
    expect(validation.distribution.get('entry-a')).toBe(1);
    expect(validation.distribution.get('entry-b')).toBe(1);
  });

  it('should distribute 3 players across 2 entry points with at most 1 difference', () => {
    mm.registerShard(makeShard('room-1', {
      maxPlayers: 4,
      entryPoints: ['entry-a', 'entry-b'],
    }));
    mm.assignEntryPoint('room-1', 'p1');
    mm.assignEntryPoint('room-1', 'p2');
    mm.assignEntryPoint('room-1', 'p3');

    const validation = mm.validateEntryPoints('room-1');
    expect(validation.valid).toBe(true);
    // entry-a: 2, entry-b: 1 (round-robin)
    const counts = [...validation.distribution.values()];
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  });

  it('should distribute players across 4 entry points for Tier 3', () => {
    mm.registerShard(makeShard('room-1', {
      tier: 3,
      maxPlayers: 6,
      entryPoints: ['e1', 'e2', 'e3', 'e4'],
    }));

    for (let i = 1; i <= 4; i++) {
      mm.assignEntryPoint('room-1', `p${i}`);
    }

    const validation = mm.validateEntryPoints('room-1');
    expect(validation.valid).toBe(true);
    // Each entry point should have exactly 1 player
    for (const [, count] of validation.distribution) {
      expect(count).toBe(1);
    }
  });
});

describe('Matchmaker — Queue Processing', () => {
  let mm: Matchmaker;

  beforeEach(() => {
    mm = new Matchmaker();
  });

  it('should process queue and match players to available shards', () => {
    mm.registerShard(makeShard('room-1', { maxPlayers: 3 }));
    mm.enqueue(makePlayer('p1'));
    mm.enqueue(makePlayer('p2'));

    const results = mm.processQueue();
    expect(results).toHaveLength(2);
    expect(results[0].playerId).toBe('p1');
    expect(results[1].playerId).toBe('p2');
    expect(mm.getQueue()).toHaveLength(0);
  });

  it('should leave unmatched players in queue', () => {
    // No shards registered
    mm.enqueue(makePlayer('p1'));
    mm.enqueue(makePlayer('p2'));

    const results = mm.processQueue();
    expect(results).toHaveLength(0);
    expect(mm.getQueue()).toHaveLength(2);
  });

  it('should not exceed shard capacity during queue processing', () => {
    mm.registerShard(makeShard('room-1', { maxPlayers: 2 }));
    mm.enqueue(makePlayer('p1'));
    mm.enqueue(makePlayer('p2'));
    mm.enqueue(makePlayer('p3'));

    const results = mm.processQueue();
    expect(results).toHaveLength(2);
    expect(mm.getQueue()).toHaveLength(1);
    expect(mm.getQueue()[0].playerId).toBe('p3');
  });

  it('should assign different entry points to queued players', () => {
    mm.registerShard(makeShard('room-1', {
      maxPlayers: 3,
      entryPoints: ['entry-a', 'entry-b'],
    }));
    mm.enqueue(makePlayer('p1'));
    mm.enqueue(makePlayer('p2'));

    const results = mm.processQueue();
    expect(results[0].entryPointId).toBe('entry-a');
    expect(results[1].entryPointId).toBe('entry-b');
  });
});

describe('Matchmaker — Join Validation', () => {
  let mm: Matchmaker;

  beforeEach(() => {
    mm = new Matchmaker();
  });

  it('should validate a valid join', () => {
    mm.registerShard(makeShard('room-1'));
    const result = mm.validateJoin('room-1', 'p1');
    expect(result.valid).toBe(true);
  });

  it('should reject join to unknown shard', () => {
    const result = mm.validateJoin('ghost', 'p1');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('not found');
  });

  it('should reject join to locked shard', () => {
    mm.registerShard(makeShard('room-1', { locked: true }));
    const result = mm.validateJoin('room-1', 'p1');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('locked');
  });

  it('should reject join to non-open shard', () => {
    mm.registerShard(makeShard('room-1', { lifecycle: 'active' }));
    const result = mm.validateJoin('room-1', 'p1');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('active');
  });

  it('should reject join to full shard', () => {
    mm.registerShard(makeShard('room-1', { currentPlayers: 3, maxPlayers: 3 }));
    const result = mm.validateJoin('room-1', 'p1');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('full');
  });

  it('should reject duplicate player assignment', () => {
    mm.registerShard(makeShard('room-1'));
    mm.assignEntryPoint('room-1', 'p1');
    const result = mm.validateJoin('room-1', 'p1');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('already assigned');
  });
});

describe('Matchmaker — Stats', () => {
  let mm: Matchmaker;

  beforeEach(() => {
    mm = new Matchmaker();
  });

  it('should report accurate stats', () => {
    mm.registerShard(makeShard('room-1', { currentPlayers: 2 }));
    mm.registerShard(makeShard('room-2', { currentPlayers: 1 }));
    mm.enqueue(makePlayer('p1'));

    const stats = mm.getStats();
    expect(stats.queueLength).toBe(1);
    expect(stats.activeShards).toBe(2);
    expect(stats.totalPlayers).toBe(3);
  });

  it('should reset all state', () => {
    mm.registerShard(makeShard('room-1'));
    mm.enqueue(makePlayer('p1'));
    mm.reset();

    const stats = mm.getStats();
    expect(stats.queueLength).toBe(0);
    expect(stats.activeShards).toBe(0);
    expect(stats.totalPlayers).toBe(0);
  });
});

describe('Matchmaker — Multi-Replica Load Simulation', () => {
  let mm: Matchmaker;

  beforeEach(() => {
    mm = new Matchmaker();
  });

  it('should distribute 10 players across 2 shards', () => {
    // Two Tier 3 shards (max 6 players each)
    mm.registerShard(makeShard('shard-1', {
      tier: 3,
      maxPlayers: 6,
      entryPoints: ['e1', 'e2', 'e3', 'e4'],
    }));
    mm.registerShard(makeShard('shard-2', {
      tier: 3,
      maxPlayers: 6,
      entryPoints: ['e5', 'e6', 'e7', 'e8'],
    }));

    // Queue 10 players
    for (let i = 1; i <= 10; i++) {
      mm.enqueue(makePlayer(`player-${i}`));
    }

    const results = mm.processQueue();

    // All 10 should match (total capacity = 12)
    expect(results).toHaveLength(10);

    // Verify distribution (social density prefers filling first shard)
    const shard1Count = results.filter(r => r.roomId === 'shard-1').length;
    const shard2Count = results.filter(r => r.roomId === 'shard-2').length;
    expect(shard1Count + shard2Count).toBe(10);
    expect(shard1Count).toBeLessThanOrEqual(6);
    expect(shard2Count).toBeLessThanOrEqual(6);

    // Verify no player left in queue
    expect(mm.getQueue()).toHaveLength(0);
  });

  it('should handle 10 concurrent players with overflow to queue', () => {
    // Two Tier 1 shards (max 3 each = 6 total)
    mm.registerShard(makeShard('shard-1', { tier: 1, maxPlayers: 3 }));
    mm.registerShard(makeShard('shard-2', { tier: 1, maxPlayers: 3 }));

    for (let i = 1; i <= 10; i++) {
      mm.enqueue(makePlayer(`player-${i}`));
    }

    const results = mm.processQueue();
    expect(results).toHaveLength(6); // 3 + 3 = 6 matched
    expect(mm.getQueue()).toHaveLength(4); // 4 waiting
  });
});

describe('Matchmaker — Redis Presence Integration', () => {
  it.todo('should publish shard registration to Redis presence');
  it.todo('should discover shards across replicas via Redis presence');
  it.todo('should handle Redis presence failure gracefully (fallback to local)');
  it.todo('should sync player count across replicas via Redis driver');
});

describe('Matchmaker — Sticky Session Verification', () => {
  it.todo('should route reconnecting player to same replica');
  it.todo('should maintain WebSocket affinity during shard gameplay');
});

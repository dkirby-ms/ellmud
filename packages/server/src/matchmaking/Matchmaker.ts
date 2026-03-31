/**
 * Matchmaker — Queue players, enforce tier-based capacity, assign entry points.
 *
 * Phase 2: In-process matchmaker with Redis presence awareness.
 * Handles player queueing, shard selection, and multi-entry-point distribution.
 *
 * GDD Shard Tier Table:
 *   Tier 1 (Shallow): 1–3 players, 2 entry points
 *   Tier 2 (Deep):    2–4 players, 3 entry points
 *   Tier 3 (Abyssal): 3–6 players, 4 entry points
 */

import type { ShardTier } from '@ellmud/shared';

// ─── Constants ──────────────────────────────────────────────────────────────

/** GDD-defined player capacity per shard tier. */
export const TIER_CAPACITY: Record<number, { min: number; max: number; entryPoints: number }> = {
  1: { min: 1, max: 3, entryPoints: 2 },
  2: { min: 2, max: 4, entryPoints: 3 },
  3: { min: 3, max: 6, entryPoints: 4 },
};

/** Default queue timeout — how long a player can wait before being dropped. */
export const QUEUE_TIMEOUT_MS = 30_000;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface QueuedPlayer {
  readonly playerId: string;
  readonly preferredTier?: ShardTier;
  readonly queuedAt: number;
}

export interface ShardSlot {
  readonly roomId: string;
  readonly tier: ShardTier;
  readonly currentPlayers: number;
  readonly maxPlayers: number;
  readonly entryPoints: string[];
  readonly assignedEntryPoints: Map<string, string>; // playerId → entryRoomId
  readonly lifecycle: string;
  readonly locked: boolean;
}

export interface MatchResult {
  readonly playerId: string;
  readonly roomId: string;
  readonly entryPointId: string;
  readonly tier: ShardTier;
}

export interface MatchmakerStats {
  queueLength: number;
  activeShards: number;
  totalPlayers: number;
}

// ─── Matchmaker ─────────────────────────────────────────────────────────────

export class Matchmaker {
  private queue: QueuedPlayer[] = [];
  private shards = new Map<string, ShardSlot>();

  /** Get max players for a given tier. */
  getMaxPlayersForTier(tier: ShardTier): number {
    return TIER_CAPACITY[tier]?.max ?? 4;
  }

  /** Get min players for a given tier. */
  getMinPlayersForTier(tier: ShardTier): number {
    return TIER_CAPACITY[tier]?.min ?? 1;
  }

  /** Get number of entry points for a given tier. */
  getEntryPointCount(tier: ShardTier): number {
    return TIER_CAPACITY[tier]?.entryPoints ?? 2;
  }

  // ─── Queue Management ───────────────────────────────────────────────────

  /** Add a player to the matchmaking queue. */
  enqueue(player: QueuedPlayer): void {
    // Prevent duplicate entries
    if (this.queue.some(p => p.playerId === player.playerId)) {
      return;
    }
    this.queue.push(player);
  }

  /** Remove a player from the queue. */
  dequeue(playerId: string): QueuedPlayer | undefined {
    const idx = this.queue.findIndex(p => p.playerId === playerId);
    if (idx === -1) return undefined;
    return this.queue.splice(idx, 1)[0];
  }

  /** Get current queue snapshot (immutable). */
  getQueue(): readonly QueuedPlayer[] {
    return [...this.queue];
  }

  /** Remove expired players (queued longer than timeout). */
  pruneExpired(now: number = Date.now()): QueuedPlayer[] {
    const expired: QueuedPlayer[] = [];
    this.queue = this.queue.filter(p => {
      if (now - p.queuedAt > QUEUE_TIMEOUT_MS) {
        expired.push(p);
        return false;
      }
      return true;
    });
    return expired;
  }

  // ─── Shard Registration ─────────────────────────────────────────────────

  /** Register an active shard for matchmaking consideration. */
  registerShard(slot: ShardSlot): void {
    this.shards.set(slot.roomId, slot);
  }

  /** Unregister a shard (collapsed or disposed). */
  unregisterShard(roomId: string): void {
    this.shards.delete(roomId);
  }

  /** Update shard player count (called on join/leave). */
  updateShardPlayerCount(roomId: string, count: number): void {
    const shard = this.shards.get(roomId);
    if (!shard) return;
    // Immutable update pattern
    this.shards.set(roomId, { ...shard, currentPlayers: count });
  }

  /** Get registered shard by ID. */
  getShard(roomId: string): ShardSlot | undefined {
    return this.shards.get(roomId);
  }

  /** Get all active shards. */
  getActiveShards(): ShardSlot[] {
    return [...this.shards.values()];
  }

  // ─── Match Logic ────────────────────────────────────────────────────────

  /**
   * Find the best shard for a player. Prefers:
   * 1. Matching tier preference
   * 2. Fewest players (fill evenly)
   * 3. Not full, not locked, lifecycle is 'open'
   */
  findMatch(player: QueuedPlayer): ShardSlot | null {
    const joinable = this.getJoinableShards();
    if (joinable.length === 0) return null;

    // Score each shard for this player
    const scored = joinable.map(shard => {
      let score = 0;
      if (player.preferredTier && shard.tier === player.preferredTier) score += 10;
      // Prefer fuller shards (social density), but not at capacity
      score += shard.currentPlayers;
      return { shard, score };
    });

    // Sort by score descending (best match first)
    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.shard ?? null;
  }

  /** Get all shards that can accept new players. */
  getJoinableShards(): ShardSlot[] {
    return [...this.shards.values()].filter(s =>
      s.lifecycle === 'open'
      && !s.locked
      && s.currentPlayers < s.maxPlayers,
    );
  }

  /**
   * Assign an entry point for a player joining a shard.
   * Distributes players across entry points using round-robin.
   * Returns null if shard is full or has no entry points.
   */
  assignEntryPoint(roomId: string, playerId: string): string | null {
    const shard = this.shards.get(roomId);
    if (!shard) return null;
    if (shard.currentPlayers >= shard.maxPlayers) return null;
    if (shard.entryPoints.length === 0) return null;

    // Round-robin across entry points based on current assignments
    const assignedCount = shard.assignedEntryPoints.size;
    const entryIndex = assignedCount % shard.entryPoints.length;
    const entryPointId = shard.entryPoints[entryIndex];

    // Track assignment
    const updatedAssignments = new Map(shard.assignedEntryPoints);
    updatedAssignments.set(playerId, entryPointId);

    this.shards.set(roomId, {
      ...shard,
      assignedEntryPoints: updatedAssignments,
      currentPlayers: shard.currentPlayers + 1,
    });

    return entryPointId;
  }

  /**
   * Release an entry point when a player leaves.
   */
  releaseEntryPoint(roomId: string, playerId: string): void {
    const shard = this.shards.get(roomId);
    if (!shard) return;

    const updatedAssignments = new Map(shard.assignedEntryPoints);
    updatedAssignments.delete(playerId);

    this.shards.set(roomId, {
      ...shard,
      assignedEntryPoints: updatedAssignments,
      currentPlayers: Math.max(0, shard.currentPlayers - 1),
    });
  }

  /**
   * Process the queue: attempt to match each queued player to a shard.
   * Returns matched results and leaves unmatched players in queue.
   */
  processQueue(): MatchResult[] {
    const results: MatchResult[] = [];
    const remaining: QueuedPlayer[] = [];

    for (const player of this.queue) {
      const shard = this.findMatch(player);
      if (shard) {
        const entryPointId = this.assignEntryPoint(shard.roomId, player.playerId);
        if (entryPointId) {
          results.push({
            playerId: player.playerId,
            roomId: shard.roomId,
            entryPointId,
            tier: shard.tier,
          });
          continue;
        }
      }
      remaining.push(player);
    }

    this.queue = remaining;
    return results;
  }

  // ─── Validation ─────────────────────────────────────────────────────────

  /**
   * Validate that a player can join a shard.
   * Checks capacity, lifecycle, lock status.
   */
  validateJoin(roomId: string, playerId: string): { valid: boolean; reason?: string } {
    const shard = this.shards.get(roomId);
    if (!shard) return { valid: false, reason: 'Shard not found.' };
    if (shard.locked) return { valid: false, reason: 'Shard is locked.' };
    if (shard.lifecycle !== 'open') {
      return { valid: false, reason: `Shard is ${shard.lifecycle}. Wait for it to open.` };
    }
    if (shard.currentPlayers >= shard.maxPlayers) {
      return { valid: false, reason: `Shard is full (${shard.maxPlayers}/${shard.maxPlayers} players).` };
    }
    if (shard.assignedEntryPoints.has(playerId)) {
      return { valid: false, reason: 'Player already assigned to this shard.' };
    }
    return { valid: true };
  }

  /**
   * Validate entry point assignments — ensures players spawn in different rooms
   * when multiple entry points are available.
   */
  validateEntryPoints(roomId: string): { valid: boolean; distribution: Map<string, number> } {
    const shard = this.shards.get(roomId);
    if (!shard) return { valid: false, distribution: new Map() };

    const distribution = new Map<string, number>();
    for (const [, entryPoint] of shard.assignedEntryPoints) {
      distribution.set(entryPoint, (distribution.get(entryPoint) ?? 0) + 1);
    }

    // Valid if players are distributed (max difference between any two entry points ≤ 1)
    const counts = [...distribution.values()];
    if (counts.length === 0) return { valid: true, distribution };
    const maxCount = Math.max(...counts);
    const minCount = Math.min(...counts);
    const valid = maxCount - minCount <= 1;

    return { valid, distribution };
  }

  // ─── Stats ──────────────────────────────────────────────────────────────

  getStats(): MatchmakerStats {
    let totalPlayers = 0;
    for (const shard of this.shards.values()) {
      totalPlayers += shard.currentPlayers;
    }
    return {
      queueLength: this.queue.length,
      activeShards: this.shards.size,
      totalPlayers,
    };
  }

  /** Reset all state (for testing). */
  reset(): void {
    this.queue = [];
    this.shards.clear();
  }
}

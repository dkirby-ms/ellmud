/**
 * Matchmaker — Queue players, enforce tier-based capacity, assign entry points.
 *
 * Phase 2: In-process matchmaker with Redis presence awareness.
 * Handles player queueing, zone selection, and multi-entry-point distribution.
 *
 * GDD Shard Tier Table:
 *   Tier 1 (Shallow): 1–3 players, 2 entry points
 *   Tier 2 (Deep):    2–4 players, 3 entry points
 *   Tier 3 (Abyssal): 3–6 players, 4 entry points
 */

import type { ZoneTier } from '@ellmud/shared';

// ─── Constants ──────────────────────────────────────────────────────────────

/** GDD-defined player capacity per zone tier. */
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
  readonly preferredTier?: ZoneTier;
  readonly queuedAt: number;
}

export interface ZoneSlot {
  readonly roomId: string;
  readonly tier: ZoneTier;
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
  readonly tier: ZoneTier;
}

export interface MatchmakerStats {
  queueLength: number;
  activeZones: number;
  totalPlayers: number;
}

// ─── Matchmaker ─────────────────────────────────────────────────────────────

export class Matchmaker {
  private queue: QueuedPlayer[] = [];
  private zones = new Map<string, ZoneSlot>();

  /** Get max players for a given tier. */
  getMaxPlayersForTier(tier: ZoneTier): number {
    return TIER_CAPACITY[tier]?.max ?? 4;
  }

  /** Get min players for a given tier. */
  getMinPlayersForTier(tier: ZoneTier): number {
    return TIER_CAPACITY[tier]?.min ?? 1;
  }

  /** Get number of entry points for a given tier. */
  getEntryPointCount(tier: ZoneTier): number {
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

  /** Register an active zone for matchmaking consideration. */
  registerZone(slot: ZoneSlot): void {
    this.zones.set(slot.roomId, slot);
  }

  /** Unregister a zone (collapsed or disposed). */
  unregisterZone(roomId: string): void {
    this.zones.delete(roomId);
  }

  /** Update zone player count (called on join/leave). */
  updateZonePlayerCount(roomId: string, count: number): void {
    const entry = this.zones.get(roomId);
    if (!entry) return;
    // Immutable update pattern
    this.zones.set(roomId, { ...entry, currentPlayers: count });
  }

  /** Get registered zone by ID. */
  getZone(roomId: string): ZoneSlot | undefined {
    return this.zones.get(roomId);
  }

  /** Get all active zones. */
  getActiveZones(): ZoneSlot[] {
    return [...this.zones.values()];
  }

  // ─── Match Logic ────────────────────────────────────────────────────────

  /**
   * Find the best zone for a player. Prefers:
   * 1. Matching tier preference
   * 2. Fewest players (fill evenly)
   * 3. Not full, not locked, lifecycle is 'open'
   */
  findMatch(player: QueuedPlayer): ZoneSlot | null {
    const joinable = this.getJoinableZones();
    if (joinable.length === 0) return null;

    // Score each zone for this player
    const scored = joinable.map(entry => {
      let score = 0;
      if (player.preferredTier && entry.tier === player.preferredTier) score += 10;
      // Prefer fuller zones (social density), but not at capacity
      score += entry.currentPlayers;
      return { entry, score };
    });

    // Sort by score descending (best match first)
    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.entry ?? null;
  }

  /** Get all zones that can accept new players. */
  getJoinableZones(): ZoneSlot[] {
    return [...this.zones.values()].filter(s =>
      s.lifecycle === 'open'
      && !s.locked
      && s.currentPlayers < s.maxPlayers,
    );
  }

  /**
   * Assign an entry point for a player joining a zone.
   * Distributes players across entry points using round-robin.
   * Returns null if zone is full or has no entry points.
   */
  assignEntryPoint(roomId: string, playerId: string): string | null {
    const entry = this.zones.get(roomId);
    if (!entry) return null;
    if (entry.currentPlayers >= entry.maxPlayers) return null;
    if (entry.entryPoints.length === 0) return null;

    // Round-robin across entry points based on current assignments
    const assignedCount = entry.assignedEntryPoints.size;
    const entryIndex = assignedCount % entry.entryPoints.length;
    const entryPointId = entry.entryPoints[entryIndex];

    // Track assignment
    const updatedAssignments = new Map(entry.assignedEntryPoints);
    updatedAssignments.set(playerId, entryPointId);

    this.zones.set(roomId, {
      ...entry,
      assignedEntryPoints: updatedAssignments,
      currentPlayers: entry.currentPlayers + 1,
    });

    return entryPointId;
  }

  /**
   * Release an entry point when a player leaves.
   */
  releaseEntryPoint(roomId: string, playerId: string): void {
    const entry = this.zones.get(roomId);
    if (!entry) return;

    const updatedAssignments = new Map(entry.assignedEntryPoints);
    updatedAssignments.delete(playerId);

    this.zones.set(roomId, {
      ...entry,
      assignedEntryPoints: updatedAssignments,
      currentPlayers: Math.max(0, entry.currentPlayers - 1),
    });
  }

  /**
   * Process the queue: attempt to match each queued player to a zone.
   * Returns matched results and leaves unmatched players in queue.
   */
  processQueue(): MatchResult[] {
    const results: MatchResult[] = [];
    const remaining: QueuedPlayer[] = [];

    for (const player of this.queue) {
      const match = this.findMatch(player);
      if (match) {
        const entryPointId = this.assignEntryPoint(match.roomId, player.playerId);
        if (entryPointId) {
          results.push({
            playerId: player.playerId,
            roomId: match.roomId,
            entryPointId,
            tier: match.tier,
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
   * Validate that a player can join a zone.
   * Checks capacity, lifecycle, lock status.
   */
  validateJoin(roomId: string, playerId: string): { valid: boolean; reason?: string } {
    const entry = this.zones.get(roomId);
    if (!entry) return { valid: false, reason: 'Instance not found.' };
    if (entry.locked) return { valid: false, reason: 'Instance is locked.' };
    if (entry.lifecycle !== 'open') {
      return { valid: false, reason: `Instance is ${entry.lifecycle}. Wait for it to open.` };
    }
    if (entry.currentPlayers >= entry.maxPlayers) {
      return { valid: false, reason: `Instance is full (${entry.maxPlayers}/${entry.maxPlayers} players).` };
    }
    if (entry.assignedEntryPoints.has(playerId)) {
      return { valid: false, reason: 'Player already assigned to this instance.' };
    }
    return { valid: true };
  }

  /**
   * Validate entry point assignments — ensures players spawn in different rooms
   * when multiple entry points are available.
   */
  validateEntryPoints(roomId: string): { valid: boolean; distribution: Map<string, number> } {
    const entry = this.zones.get(roomId);
    if (!entry) return { valid: false, distribution: new Map() };

    const distribution = new Map<string, number>();
    for (const [, entryPoint] of entry.assignedEntryPoints) {
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
    for (const slot of this.zones.values()) {
      totalPlayers += slot.currentPlayers;
    }
    return {
      queueLength: this.queue.length,
      activeZones: this.zones.size,
      totalPlayers,
    };
  }

  /** Reset all state (for testing). */
  reset(): void {
    this.queue = [];
    this.zones.clear();
  }
}

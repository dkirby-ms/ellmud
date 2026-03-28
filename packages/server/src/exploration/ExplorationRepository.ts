/**
 * ExplorationRepository — tracks which rooms each player has visited.
 *
 * Interface + InMemory implementation following the pattern from StashRepository.
 * No coordinate columns — client computes positions via BFS from room graph.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

/** Input for recording a room visit (upsert). */
export interface ExplorationVisit {
  characterId: string;
  zoneSlug: string | null;
  roomId: string;
  roomType: string;
  roomName: string;
  shardTier?: number | null;
  biome?: string | null;
}

/** A persisted explored-room record. */
export interface ExploredRoom {
  characterId: string;
  zoneSlug: string | null;
  roomId: string;
  roomType: string;
  roomName: string;
  shardTier: number | null;
  biome: string | null;
  firstVisited: Date;
  lastVisited: Date;
  visitCount: number;
}

/** Aggregate exploration statistics for a character. */
export interface ExplorationStats {
  totalRooms: number;
  totalVisits: number;
  zones: number;
}

// ─── Interface ──────────────────────────────────────────────────────────────

export interface ExplorationRepository {
  /** Record a room visit (upsert: increments visit_count on revisit). */
  recordVisit(visit: ExplorationVisit): Promise<void>;

  /** Load all explored rooms for a character. */
  getExploredRooms(characterId: string): Promise<ExploredRoom[]>;

  /** Load explored rooms in a specific zone. */
  getExploredRoomsInZone(characterId: string, zoneSlug: string): Promise<ExploredRoom[]>;

  /** Check whether a character has visited a specific room. */
  hasVisited(characterId: string, zoneSlug: string | null, roomId: string): Promise<boolean>;

  /** Get aggregate exploration statistics. */
  getExplorationStats(characterId: string): Promise<ExplorationStats>;
}

// ─── Composite key helper ───────────────────────────────────────────────────

function compositeKey(characterId: string, zoneSlug: string | null, roomId: string): string {
  return `${characterId}::${zoneSlug ?? '__shard__'}::${roomId}`;
}

// ─── In-Memory Implementation ───────────────────────────────────────────────

export class InMemoryExplorationRepository implements ExplorationRepository {
  private rooms = new Map<string, ExploredRoom>();

  async recordVisit(visit: ExplorationVisit): Promise<void> {
    const key = compositeKey(visit.characterId, visit.zoneSlug, visit.roomId);
    const existing = this.rooms.get(key);

    if (existing) {
      existing.lastVisited = new Date();
      existing.visitCount += 1;
    } else {
      const now = new Date();
      this.rooms.set(key, {
        characterId: visit.characterId,
        zoneSlug: visit.zoneSlug,
        roomId: visit.roomId,
        roomType: visit.roomType,
        roomName: visit.roomName,
        shardTier: visit.shardTier ?? null,
        biome: visit.biome ?? null,
        firstVisited: now,
        lastVisited: now,
        visitCount: 1,
      });
    }
  }

  async getExploredRooms(characterId: string): Promise<ExploredRoom[]> {
    const result: ExploredRoom[] = [];
    for (const room of this.rooms.values()) {
      if (room.characterId === characterId) {
        result.push({ ...room });
      }
    }
    return result;
  }

  async getExploredRoomsInZone(characterId: string, zoneSlug: string): Promise<ExploredRoom[]> {
    const result: ExploredRoom[] = [];
    for (const room of this.rooms.values()) {
      if (room.characterId === characterId && room.zoneSlug === zoneSlug) {
        result.push({ ...room });
      }
    }
    return result;
  }

  async hasVisited(characterId: string, zoneSlug: string | null, roomId: string): Promise<boolean> {
    return this.rooms.has(compositeKey(characterId, zoneSlug, roomId));
  }

  async getExplorationStats(characterId: string): Promise<ExplorationStats> {
    let totalRooms = 0;
    let totalVisits = 0;
    const zoneSet = new Set<string>();

    for (const room of this.rooms.values()) {
      if (room.characterId === characterId) {
        totalRooms += 1;
        totalVisits += room.visitCount;
        zoneSet.add(room.zoneSlug ?? '__shard__');
      }
    }

    return { totalRooms, totalVisits, zones: zoneSet.size };
  }
}

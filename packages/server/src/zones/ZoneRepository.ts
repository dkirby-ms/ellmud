/**
 * ZoneRepository — persistence interface for hand-crafted MUD zones.
 *
 * Zones are authored room graphs with persistent state and periodic repop.
 * This interface abstracts over PostgreSQL (production) and in-memory (dev/test).
 *
 * Domain types come from @ellmud/shared. DB-extended types add timestamps.
 */

import type {
  ZoneDefinition as SharedZoneDefinition,
  ZoneRoomDefinition as SharedZoneRoomDefinition,
  ZoneExitDefinition as SharedZoneExitDefinition,
} from '@ellmud/shared';

// ─── DB-extended types (shared types + persistence metadata) ─────────────────

export interface ZoneDefinition extends SharedZoneDefinition {
  createdAt: Date;
  updatedAt: Date;
}

export interface ZoneRoomDefinition extends SharedZoneRoomDefinition {
  createdAt: Date;
  updatedAt: Date;
}

export interface ZoneExitDefinition extends SharedZoneExitDefinition {
  createdAt: Date;
}

/** Full zone payload: definition + all rooms + all exits. */
export interface ZoneData {
  zone: ZoneDefinition;
  rooms: ZoneRoomDefinition[];
  exits: ZoneExitDefinition[];
}

/** An exit flagged as orphaned, with a human-readable reason. */
export interface OrphanedExitInfo {
  exit: ZoneExitDefinition;
  reason: string;
}

// ─── Repository interface ────────────────────────────────────────────────────

export interface ZoneRepository {
  /** List all zone definitions (without rooms/exits). */
  getAllZones(): Promise<ZoneDefinition[]>;

  /** Fetch a full zone bundle by slug. */
  getZoneBySlug(slug: string): Promise<ZoneData | null>;

  /** Fetch a full zone bundle by ID. */
  getZoneById(id: string): Promise<ZoneData | null>;

  /** Create a new zone (returns the definition without rooms/exits). */
  createZone(zone: Omit<ZoneDefinition, 'id' | 'createdAt' | 'updatedAt'>): Promise<ZoneDefinition>;

  /** Partial update of a zone definition. */
  updateZone(id: string, partial: Partial<Omit<ZoneDefinition, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ZoneDefinition>;

  /** Delete a zone and all its rooms/exits (cascade). */
  deleteZone(id: string): Promise<void>;

  /** Create a room within a zone. */
  createRoom(room: Omit<ZoneRoomDefinition, 'id' | 'createdAt' | 'updatedAt'>): Promise<ZoneRoomDefinition>;

  /** Partial update of a room. */
  updateRoom(id: string, partial: Partial<Omit<ZoneRoomDefinition, 'id' | 'zoneId' | 'createdAt' | 'updatedAt'>>): Promise<ZoneRoomDefinition>;

  /** Delete a room by ID. */
  deleteRoom(id: string): Promise<void>;

  /** Create an exit within a zone. */
  createExit(exit: Omit<ZoneExitDefinition, 'id' | 'createdAt'>): Promise<ZoneExitDefinition>;

  /** Partial update of an exit. */
  updateExit(id: string, partial: Partial<Omit<ZoneExitDefinition, 'id' | 'zoneId' | 'createdAt'>>): Promise<ZoneExitDefinition>;

  /** Delete an exit by ID. */
  deleteExit(id: string): Promise<void>;

  /** Find exits that reference non-existent rooms or zones (dry run). */
  findOrphanedExits(): Promise<OrphanedExitInfo[]>;

  /** Delete all orphaned exits and return what was removed. */
  removeOrphanedExits(): Promise<OrphanedExitInfo[]>;
}

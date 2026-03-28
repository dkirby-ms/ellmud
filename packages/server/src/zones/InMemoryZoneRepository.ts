/**
 * InMemoryZoneRepository — in-memory implementation of ZoneRepository.
 *
 * Used for local development without DATABASE_URL and for unit tests.
 * All data is held in Maps and lost when the process exits.
 */

import { randomUUID } from 'node:crypto';
import type {
  ZoneRepository,
  ZoneDefinition,
  ZoneRoomDefinition,
  ZoneExitDefinition,
  ZoneData,
  OrphanedExitInfo,
} from './ZoneRepository.js';

export class InMemoryZoneRepository implements ZoneRepository {
  private zones = new Map<string, ZoneDefinition>();
  private rooms = new Map<string, ZoneRoomDefinition>();
  private exits = new Map<string, ZoneExitDefinition>();

  // ── Zone CRUD ────────────────────────────────────────────────────────────

  async getAllZones(): Promise<ZoneDefinition[]> {
    return [...this.zones.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  async getZoneBySlug(slug: string): Promise<ZoneData | null> {
    const zone = [...this.zones.values()].find((z) => z.slug === slug);
    if (!zone) return null;
    return this.buildBundle(zone);
  }

  async getZoneById(id: string): Promise<ZoneData | null> {
    const zone = this.zones.get(id);
    if (!zone) return null;
    return this.buildBundle(zone);
  }

  async createZone(
    input: Omit<ZoneDefinition, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ZoneDefinition> {
    const now = new Date();
    const zone: ZoneDefinition = {
      ...input,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this.zones.set(zone.id, zone);
    return zone;
  }

  async updateZone(
    id: string,
    partial: Partial<Omit<ZoneDefinition, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<ZoneDefinition> {
    const existing = this.zones.get(id);
    if (!existing) throw new Error(`Zone with id '${id}' not found`);

    const updated: ZoneDefinition = {
      ...existing,
      ...partial,
      id,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    };
    this.zones.set(id, updated);
    return updated;
  }

  async deleteZone(id: string): Promise<void> {
    this.zones.delete(id);
    // Cascade: remove rooms and exits belonging to this zone
    for (const [roomId, room] of this.rooms) {
      if (room.zoneId === id) this.rooms.delete(roomId);
    }
    for (const [exitId, exit] of this.exits) {
      if (exit.zoneId === id) this.exits.delete(exitId);
    }
  }

  // ── Room CRUD ────────────────────────────────────────────────────────────

  async createRoom(
    input: Omit<ZoneRoomDefinition, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ZoneRoomDefinition> {
    const now = new Date();
    const room: ZoneRoomDefinition = {
      ...input,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this.rooms.set(room.id, room);
    return room;
  }

  async updateRoom(
    id: string,
    partial: Partial<Omit<ZoneRoomDefinition, 'id' | 'zoneId' | 'createdAt' | 'updatedAt'>>,
  ): Promise<ZoneRoomDefinition> {
    const existing = this.rooms.get(id);
    if (!existing) throw new Error(`Zone room with id '${id}' not found`);

    const updated: ZoneRoomDefinition = {
      ...existing,
      ...partial,
      id,
      zoneId: existing.zoneId,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    };
    this.rooms.set(id, updated);
    return updated;
  }

  async deleteRoom(id: string): Promise<void> {
    this.rooms.delete(id);
  }

  // ── Exit CRUD ────────────────────────────────────────────────────────────

  async createExit(
    input: Omit<ZoneExitDefinition, 'id' | 'createdAt'>,
  ): Promise<ZoneExitDefinition> {
    const exit: ZoneExitDefinition = {
      ...input,
      id: randomUUID(),
      createdAt: new Date(),
    };
    this.exits.set(exit.id, exit);
    return exit;
  }

  async deleteExit(id: string): Promise<void> {
    this.exits.delete(id);
  }

  // ── Orphaned-exit cleanup ────────────────────────────────────────────────

  async findOrphanedExits(): Promise<OrphanedExitInfo[]> {
    const orphans: OrphanedExitInfo[] = [];
    const allRooms = [...this.rooms.values()];
    const allZones = [...this.zones.values()];

    for (const exit of this.exits.values()) {
      const zoneRoomSlugs = new Set(
        allRooms.filter((r) => r.zoneId === exit.zoneId).map((r) => r.slug),
      );

      // 1) from_room_slug doesn't exist
      if (!zoneRoomSlugs.has(exit.fromRoomSlug)) {
        orphans.push({ exit, reason: 'from_room_slug not found in zone' });
        continue;
      }

      if (!exit.targetZoneSlug) {
        // 2) intra-zone: to_room_slug doesn't exist
        if (!zoneRoomSlugs.has(exit.toRoomSlug)) {
          orphans.push({ exit, reason: 'to_room_slug not found in zone (intra-zone)' });
        }
      } else {
        // 3) cross-zone: target zone doesn't exist
        const targetZone = allZones.find((z) => z.slug === exit.targetZoneSlug);
        if (!targetZone) {
          orphans.push({ exit, reason: 'target zone does not exist' });
          continue;
        }
        // 4) cross-zone: target room doesn't exist in target zone
        if (exit.targetRoomSlug) {
          const targetRoomSlugs = new Set(
            allRooms.filter((r) => r.zoneId === targetZone.id).map((r) => r.slug),
          );
          if (!targetRoomSlugs.has(exit.targetRoomSlug)) {
            orphans.push({ exit, reason: 'target room not found in target zone' });
          }
        }
      }
    }

    return orphans;
  }

  async removeOrphanedExits(): Promise<OrphanedExitInfo[]> {
    const orphans = await this.findOrphanedExits();
    for (const { exit } of orphans) {
      this.exits.delete(exit.id);
    }
    return orphans;
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private buildBundle(zone: ZoneDefinition): ZoneData {
    const rooms = [...this.rooms.values()]
      .filter((r) => r.zoneId === zone.id)
      .sort((a, b) => a.slug.localeCompare(b.slug));
    const exits = [...this.exits.values()]
      .filter((e) => e.zoneId === zone.id)
      .sort((a, b) => a.fromRoomSlug.localeCompare(b.fromRoomSlug) || a.direction.localeCompare(b.direction));
    return { zone, rooms, exits };
  }
}

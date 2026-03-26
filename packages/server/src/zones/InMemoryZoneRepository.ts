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

/**
 * Zone management API — wraps adminFetch for zone-specific CRUD.
 * Zones use /admin/api/zones (not the generic /admin/api/content route).
 */

import { adminFetch } from './admin-api';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ZoneDefinition {
  id: string;
  slug: string;
  name: string;
  description: string;
  levelMin: number;
  levelMax: number;
  tier: number;
  theme: string;
  entryRoomSlugs: string[];
  lifecycle: 'persistent' | 'scheduled' | 'event';
  category: 'hub' | 'dungeon' | 'wilderness' | 'social';
  maxPlayers: number;
  pvpEnabled: boolean;
  repopIntervalSeconds: number;
}

export interface RoomNPC {
  creatureId: string;
  spawnCount: number;
}

export interface RoomLootContainer {
  id: string;
  type: string;
  items: string[];
}

export interface ZoneRoomDefinition {
  id: string;
  zoneId: string;
  slug: string;
  name: string;
  description: string;
  type: string;
  properties: string[];
  lootContainers: RoomLootContainer[];
  hazards: unknown[];
  npcs: RoomNPC[];
}

export interface ZoneExitDefinition {
  id: string;
  zoneId: string;
  fromRoomSlug: string;
  direction: string;
  toRoomSlug: string;
  targetZoneSlug?: string;
  targetRoomSlug?: string;
  locked: boolean;
  hidden: boolean;
  condition?: Record<string, unknown>;
}

export interface ZoneData {
  zone: ZoneDefinition;
  rooms: ZoneRoomDefinition[];
  exits: ZoneExitDefinition[];
}

// ─── Zone CRUD ───────────────────────────────────────────────────────────────

export async function listZones(): Promise<ZoneDefinition[]> {
  return adminFetch<ZoneDefinition[]>('/admin/api/zones');
}

export async function getZone(slug: string): Promise<ZoneData> {
  return adminFetch<ZoneData>(`/admin/api/zones/${slug}`);
}

export async function createZone(data: Partial<ZoneDefinition>): Promise<ZoneDefinition> {
  return adminFetch<ZoneDefinition>('/admin/api/zones', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateZone(id: string, data: Partial<ZoneDefinition>): Promise<ZoneDefinition> {
  return adminFetch<ZoneDefinition>(`/admin/api/zones/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteZone(id: string): Promise<void> {
  await adminFetch(`/admin/api/zones/${id}`, {
    method: 'DELETE',
  });
}

// ─── Room CRUD ───────────────────────────────────────────────────────────────

export async function createRoom(zoneId: string, data: Partial<ZoneRoomDefinition>): Promise<ZoneRoomDefinition> {
  return adminFetch<ZoneRoomDefinition>(`/admin/api/zones/${zoneId}/rooms`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateRoom(roomId: string, data: Partial<ZoneRoomDefinition>): Promise<ZoneRoomDefinition> {
  return adminFetch<ZoneRoomDefinition>(`/admin/api/zones/rooms/${roomId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteRoom(roomId: string): Promise<void> {
  await adminFetch(`/admin/api/zones/rooms/${roomId}`, {
    method: 'DELETE',
  });
}

// ─── Exit CRUD ───────────────────────────────────────────────────────────────

export async function createExit(zoneId: string, data: Partial<ZoneExitDefinition>): Promise<ZoneExitDefinition> {
  return adminFetch<ZoneExitDefinition>(`/admin/api/zones/${zoneId}/exits`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateExit(exitId: string, data: Partial<ZoneExitDefinition>): Promise<ZoneExitDefinition> {
  return adminFetch<ZoneExitDefinition>(`/admin/api/zones/exits/${exitId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteExit(exitId: string): Promise<void> {
  await adminFetch(`/admin/api/zones/exits/${exitId}`, {
    method: 'DELETE',
  });
}

// ─── Orphaned Exit Cleanup ───────────────────────────────────────────────────

export interface OrphanedExitInfo {
  exit: ZoneExitDefinition;
  reason: string;
}

export async function getOrphanedExits(): Promise<{ count: number; orphanedExits: OrphanedExitInfo[] }> {
  return adminFetch<{ count: number; orphanedExits: OrphanedExitInfo[] }>('/admin/api/zones/cleanup/orphaned-exits');
}

export async function removeOrphanedExits(): Promise<{ removed: number; orphanedExits: OrphanedExitInfo[] }> {
  return adminFetch<{ removed: number; orphanedExits: OrphanedExitInfo[] }>('/admin/api/zones/cleanup/orphaned-exits', {
    method: 'POST',
  });
}

// ─── Creature & Item Registry ────────────────────────────────────────────────

export interface CreatureTemplate {
  type: string;
  name: string;
}

export interface ItemDefinition {
  id: string;
  name: string;
  type: string;
  tier: string;
}

export async function listCreatures(): Promise<CreatureTemplate[]> {
  const data = await adminFetch<{ templates: CreatureTemplate[]; count: number }>('/admin/api/creature-templates');
  return data.templates || [];
}

export async function listItems(): Promise<ItemDefinition[]> {
  const data = await adminFetch<{ items: ItemDefinition[]; count: number }>('/admin/api/items');
  return data.items || [];
}

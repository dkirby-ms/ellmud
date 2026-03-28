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
  biome: string;
  entryRoomSlugs: string[];
  lifecycle: 'persistent' | 'scheduled' | 'event';
  category: 'hub' | 'dungeon' | 'wilderness' | 'social';
  maxPlayers: number;
  pvpEnabled: boolean;
  repopIntervalSeconds: number;
}

export interface ZoneRoomDefinition {
  id: string;
  zoneId: string;
  slug: string;
  name: string;
  description: string;
  type: string;
  properties: string[];
  lootContainers: unknown[];
  hazards: unknown[];
  npcs: unknown[];
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

export async function deleteExit(exitId: string): Promise<void> {
  await adminFetch(`/admin/api/zones/exits/${exitId}`, {
    method: 'DELETE',
  });
}

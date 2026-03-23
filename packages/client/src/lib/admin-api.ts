/**
 * Admin API utility — centralized fetch wrapper for admin content endpoints
 * and live room management.
 *
 * All requests include Authorization: Bearer <ADMIN_TOKEN> header.
 * Token is read from localStorage (set during admin login).
 */

const ADMIN_TOKEN_KEY = 'admin_token';

export class AdminAPIError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AdminAPIError';
  }
}

function getAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string): void {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken(): void {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

async function adminFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAdminToken();
  if (!token) {
    throw new AdminAPIError('No admin token found', 401);
  }

  const url = `${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new AdminAPIError(
      error.error || `HTTP ${response.status}`,
      response.status,
      error.details
    );
  }

  // 204 No Content for DELETE
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// ─── Generic Content CRUD API ────────────────────────────────────────────────

export type EntityType =
  | 'items'
  | 'creatures'
  | 'biomes'
  | 'modifiers'
  | 'skills'
  | 'loot-tables'
  | 'factions'
  | 'rooms'
  | 'narrative';

export async function listEntities<T>(entityType: EntityType): Promise<T[]> {
  return adminFetch<T[]>(`/admin/api/content/${entityType}`);
}

export async function getEntity<T>(entityType: EntityType, id: string): Promise<T> {
  return adminFetch<T>(`/admin/api/content/${entityType}/${id}`);
}

export async function createEntity<T>(entityType: EntityType, data: Partial<T>): Promise<T> {
  return adminFetch<T>(`/admin/api/content/${entityType}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateEntity<T>(entityType: EntityType, id: string, data: Partial<T>): Promise<T> {
  return adminFetch<T>(`/admin/api/content/${entityType}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteEntity(entityType: EntityType, id: string): Promise<void> {
  return adminFetch<void>(`/admin/api/content/${entityType}/${id}`, {
    method: 'DELETE',
  });
}

// ─── Content CRUD API (typed shortcuts) ──────────────────────────────────────

export async function listItems<T>(): Promise<T[]> {
  return adminFetch<T[]>('/admin/api/content/items');
}

export async function getItem<T>(id: string): Promise<T> {
  return adminFetch<T>(`/admin/api/content/items/${id}`);
}

export async function createItem<T>(data: Partial<T>): Promise<T> {
  return adminFetch<T>('/admin/api/content/items', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateItem<T>(id: string, data: Partial<T>): Promise<T> {
  return adminFetch<T>(`/admin/api/content/items/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteItem(id: string): Promise<void> {
  return adminFetch<void>(`/admin/api/content/items/${id}`, {
    method: 'DELETE',
  });
}

// ─── Creature endpoints ──────────────────────────────────────────────────────

export async function listCreatures<T>(): Promise<T[]> {
  return adminFetch<T[]>('/admin/api/content/creatures');
}

export async function getCreature<T>(id: string): Promise<T> {
  return adminFetch<T>(`/admin/api/content/creatures/${id}`);
}

export async function createCreature<T>(data: Partial<T>): Promise<T> {
  return adminFetch<T>('/admin/api/content/creatures', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCreature<T>(id: string, data: Partial<T>): Promise<T> {
  return adminFetch<T>(`/admin/api/content/creatures/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteCreature(id: string): Promise<void> {
  return adminFetch<void>(`/admin/api/content/creatures/${id}`, {
    method: 'DELETE',
  });
}

// ─── Live Room Management API ────────────────────────────────────────────────

export interface LiveRoomSummary {
  roomId: string;
  name: string;
  clients: number;
  maxClients: number;
  locked: boolean;
  createdAt?: string;
  metadata?: Record<string, unknown>;
}

export interface LiveRoomPlayer {
  sessionId: string;
  currentRoomId: string;
  inventoryCount: number;
  currentWeight: number;
  maxCarryWeight: number;
}

export interface LiveRoomCreature {
  id: string;
  name: string;
  type: string;
  hp: number;
  maxHp: number;
  currentRoomId: string;
  behaviorState: string;
  isAlive: boolean;
}

export interface LiveRoomDetail {
  roomId: string;
  name: string;
  clients: number;
  biome?: string;
  lifecycle?: string;
  stability?: number;
  collapseTimer?: number;
  tick?: number;
  playerCount?: number;
  paused: boolean;
  players?: LiveRoomPlayer[];
  creatures?: LiveRoomCreature[];
}

export interface SpawnResult {
  roomId: string;
  spawned: { type: string; id: string; creatureId?: string; spawnRoomId?: string };
  message: string;
}

export async function fetchLiveRooms(): Promise<{ rooms: LiveRoomSummary[] }> {
  return adminFetch<{ rooms: LiveRoomSummary[] }>('/admin/api/rooms');
}

export async function fetchLiveRoomDetail(roomId: string): Promise<LiveRoomDetail> {
  return adminFetch<LiveRoomDetail>(`/admin/api/rooms/${roomId}`);
}

export async function pauseRoom(roomId: string): Promise<{ roomId: string; paused: boolean }> {
  return adminFetch<{ roomId: string; paused: boolean }>(`/admin/api/rooms/${roomId}/pause`, {
    method: 'POST',
  });
}

export async function resumeRoom(roomId: string): Promise<{ roomId: string; paused: boolean }> {
  return adminFetch<{ roomId: string; paused: boolean }>(`/admin/api/rooms/${roomId}/resume`, {
    method: 'POST',
  });
}

export async function spawnInRoom(
  roomId: string,
  type: 'creature' | 'item',
  templateId: string,
  targetRoomId?: string
): Promise<SpawnResult> {
  return adminFetch<SpawnResult>(`/admin/api/rooms/${roomId}/spawn`, {
    method: 'POST',
    body: JSON.stringify({ type, id: templateId, targetRoomId }),
  });
}

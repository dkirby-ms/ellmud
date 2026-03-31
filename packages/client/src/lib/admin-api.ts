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

export function getAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string): void {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken(): void {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export async function adminFetch<T>(
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
  return adminFetch<undefined>(`/admin/api/content/${entityType}/${id}`, {
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
  return adminFetch<undefined>(`/admin/api/content/items/${id}`, {
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
  return adminFetch<undefined>(`/admin/api/content/creatures/${id}`, {
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

// ─── Dashboard endpoints ─────────────────────────────────────────────────────

export interface DashboardMetrics {
  totalItems: number;
  entityCounts: Record<string, number>;
  activeRooms: number;
  activePlayers: number;
  entityTypes: string[];
}

export interface RecentChange {
  id: string;
  entityType: string;
  name: string;
  updatedAt: string;
  createdAt: string;
}

export interface RecentChangesResponse {
  changes: RecentChange[];
}

export interface ValidationWarning {
  entityType: string;
  entityId: string;
  entityName: string;
  message: string;
  severity: 'warning' | 'error';
}

export interface ValidationWarningsResponse {
  warnings: ValidationWarning[];
  totalWarnings: number;
  totalErrors: number;
}

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  return adminFetch<DashboardMetrics>('/admin/api/dashboard/metrics');
}

export async function fetchRecentChanges(): Promise<RecentChangesResponse> {
  return adminFetch<RecentChangesResponse>('/admin/api/dashboard/recent-changes');
}

export async function fetchValidationWarnings(): Promise<ValidationWarningsResponse> {
  return adminFetch<ValidationWarningsResponse>('/admin/api/dashboard/validation-warnings');
}

// ─── User Management API ─────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  identityId: string;
  username: string;
  email: string | null;
  role: string;
  provider: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserPayload {
  username: string;
  email?: string;
  password: string;
  role?: string;
}

export interface UpdateUserPayload {
  username?: string;
  email?: string;
  role?: string;
}

export async function listUsers(): Promise<AdminUser[]> {
  return adminFetch<AdminUser[]>('/admin/api/users');
}

export async function getUser(id: string): Promise<AdminUser> {
  return adminFetch<AdminUser>(`/admin/api/users/${id}`);
}

export async function createUser(data: CreateUserPayload): Promise<AdminUser> {
  return adminFetch<AdminUser>('/admin/api/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateUser(id: string, data: UpdateUserPayload): Promise<AdminUser> {
  return adminFetch<AdminUser>(`/admin/api/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteUser(id: string): Promise<void> {
  return adminFetch<undefined>(`/admin/api/users/${id}`, {
    method: 'DELETE',
  });
}

// ─── Notifications (wraps validation warnings + recent changes) ──────────────

export interface AdminNotification {
  id: string;
  type: 'warning' | 'error' | 'change';
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  timestamp: string;
}

export async function fetchNotifications(): Promise<AdminNotification[]> {
  const [warningsRes, changesRes] = await Promise.all([
    fetchValidationWarnings().catch(() => ({ warnings: [], totalWarnings: 0, totalErrors: 0 })),
    fetchRecentChanges().catch(() => ({ changes: [] })),
  ]);

  const notifications: AdminNotification[] = [];

  for (const w of warningsRes.warnings) {
    notifications.push({
      id: `warn-${w.entityType}-${w.entityId}`,
      type: w.severity,
      title: `${w.entityName} (${w.entityType})`,
      message: w.message,
      entityType: w.entityType,
      entityId: w.entityId,
      timestamp: new Date().toISOString(),
    });
  }

  for (const c of changesRes.changes.slice(0, 5)) {
    notifications.push({
      id: `change-${c.entityType}-${c.id}`,
      type: 'change',
      title: `${c.name} updated`,
      message: `${c.entityType} was modified`,
      entityType: c.entityType,
      entityId: c.id,
      timestamp: c.updatedAt,
    });
  }

  return notifications;
}

// ─── Audit Log API ───────────────────────────────────────────────────────────

export interface AuditEvent {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_name: string | null;
  actor: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface AuditLogResponse {
  events: AuditEvent[];
}

export interface AuditLogFilters {
  action?: string;
  entity?: string;
  actor?: string;
  limit?: number;
  offset?: number;
}

export async function fetchAuditLog(filters?: AuditLogFilters): Promise<AuditLogResponse> {
  const params = new URLSearchParams();
  
  if (filters?.action) params.append('action', filters.action);
  if (filters?.entity) params.append('entity', filters.entity);
  if (filters?.actor) params.append('actor', filters.actor);
  if (filters?.limit) params.append('limit', filters.limit.toString());
  if (filters?.offset) params.append('offset', filters.offset.toString());
  
  const query = params.toString();
  const url = query ? `/admin/api/audit-log?${query}` : '/admin/api/audit-log';
  
  return adminFetch<AuditLogResponse>(url);
}

// ─── Simulation API ──────────────────────────────────────────────────────────

export interface LootDropResult {
  items: Array<{ id: string; name: string; rarity?: string; quantity: number }>;
}

export interface LootSimulationResult {
  drops: LootDropResult[];
  summary: { totalDrops: number; itemDistribution: Record<string, number>; rarityBreakdown?: Record<string, number> };
}

export interface CreatureRerollResult {
  rolls: Array<{ stats: Record<string, number>; modifiers?: string[] }>;
  baseline: Record<string, number>;
}

export async function simulateLootDrops(id: string, count = 10): Promise<LootSimulationResult> {
  return adminFetch<LootSimulationResult>(`/admin/api/simulate/loot-table/${id}?count=${count}`, { method: 'POST' });
}

export async function simulateCreatureReroll(id: string, count = 5): Promise<CreatureRerollResult> {
  return adminFetch<CreatureRerollResult>(`/admin/api/simulate/creature/${id}/reroll?count=${count}`, { method: 'POST' });
}

// ─── Deploy API ──────────────────────────────────────────────────────────────

export interface DeployHistoryRecord {
  id: string;
  environment: 'staging' | 'production';
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';
  deployed_by: string;
  entity_count: number;
  changes_summary: Record<string, number>;
  started_at: string;
  completed_at: string | null;
  notes: string | null;
}

export interface PendingChange {
  entityType: string;
  entityId: string;
  name: string;
  action: 'created' | 'modified' | 'deleted';
  modifiedAt: string;
}

export interface DeployDiffResponse {
  pendingChanges: PendingChange[];
  lastDeploy: {
    environment: string;
    completedAt: string;
    entityCount: number;
    deployedBy: string;
  } | null;
}

export interface DeployHistoryResponse {
  deployments: DeployHistoryRecord[];
  total: number;
  limit: number;
  offset: number;
}

export async function fetchDeployDiff(): Promise<DeployDiffResponse> {
  return adminFetch<DeployDiffResponse>('/admin/api/deploy/diff');
}

export async function deployToStaging(deployedBy = 'admin'): Promise<DeployHistoryRecord> {
  return adminFetch<DeployHistoryRecord>('/admin/api/deploy/staging', {
    method: 'POST',
    body: JSON.stringify({ deployedBy }),
  });
}

export async function deployToProduction(deployedBy = 'admin'): Promise<DeployHistoryRecord> {
  return adminFetch<DeployHistoryRecord>('/admin/api/deploy/production', {
    method: 'POST',
    body: JSON.stringify({ confirm: 'DEPLOY', deployedBy }),
  });
}

export async function fetchDeployHistory(limit = 20, offset = 0): Promise<DeployHistoryResponse> {
  return adminFetch<DeployHistoryResponse>(`/admin/api/deploy/history?limit=${limit}&offset=${offset}`);
}

export async function rollbackDeployment(id: string): Promise<DeployHistoryRecord> {
  return adminFetch<DeployHistoryRecord>(`/admin/api/deploy/${id}/rollback`, {
    method: 'POST',
  });
}


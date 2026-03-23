/**
 * Admin API utility — centralized fetch wrapper for admin content endpoints.
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

// ─── Content CRUD API ────────────────────────────────────────────────────────

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

/**
 * API client for user settings endpoints.
 * Follows the same patterns as api.ts (BASE_URL, request<T>, Bearer auth).
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? '';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UserSettingsConfig {
  display?: { fontSize?: number };
  narration?: { verbosity?: string; narrationStyle?: string };
}

export interface UserSettingsResponse {
  id?: string;
  playerId?: string;
  config: UserSettingsConfig;
  createdAt?: string;
  updatedAt?: string;
}

// ─── API calls ───────────────────────────────────────────────────────────────

export async function fetchUserSettings(token: string): Promise<UserSettingsResponse> {
  const res = await fetch(`${BASE_URL}/api/user/settings`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new SettingsApiError(res.status, body.error ?? body.message ?? 'Failed to fetch settings');
  }

  return res.json() as Promise<UserSettingsResponse>;
}

export async function updateUserSettings(
  token: string,
  config: UserSettingsConfig,
): Promise<UserSettingsResponse> {
  const res = await fetch(`${BASE_URL}/api/user/settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ config }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new SettingsApiError(res.status, body.error ?? body.message ?? 'Failed to update settings');
  }

  return res.json() as Promise<UserSettingsResponse>;
}

export class SettingsApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'SettingsApiError';
  }
}

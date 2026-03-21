/**
 * API client for auth endpoints.
 * Server runs on port 2567; base URL configurable via VITE_API_URL.
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? '';

export interface AuthResponse {
  playerId: string;
  token: string;
}

// Global 401 handler — called when any API request returns 401 (stale token).
let _on401: (() => void) | null = null;

/** Register a callback to fire when any API call receives a 401 response. */
export function onAuthError(handler: () => void): void {
  _on401 = handler;
}

async function request<T>(path: string, options: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
      _on401?.();
    }
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, body.error ?? body.message ?? 'Request failed');
  }

  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function login(username: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function register(username: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function logout(token: string): Promise<void> {
  await request<{ message: string }>('/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

/**
 * Lightweight token validation — probes the server with the stored token.
 * Returns false if the server responds with 401 (token revoked/expired).
 * Returns true for any other outcome (valid, server unreachable, no /auth/me yet).
 */
export async function validateToken(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.status !== 401;
  } catch {
    // Server unreachable — keep token, let normal flow handle it
    return true;
  }
}

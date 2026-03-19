/**
 * Colyseus onAuth integration.
 *
 * Validates a Bearer token from the client's join options.
 * Returns player data on success; throws on invalid/expired token.
 *
 * Auth is OPTIONAL — if no token is provided and AUTH_REQUIRED is false,
 * the client joins anonymously. This preserves existing test behavior.
 */

import type { AuthService, TokenPayload } from './AuthService.js';

let _authService: AuthService | null = null;
let _authRequired = false;

/** Initialize the auth hook with the AuthService instance. */
export function initColyseusAuth(authService: AuthService, required = false): void {
  _authService = authService;
  _authRequired = required;
}

/**
 * Authenticate a client attempting to join a room.
 * Call from Room.onAuth(client, options).
 *
 * @param token - The session token from client join options
 * @returns Player data if authenticated, or anonymous context if auth is optional
 */
export async function authenticateClient(
  token?: string,
): Promise<TokenPayload | { playerId: string; username: string }> {
  // If auth not initialized (e.g., in tests), allow anonymous
  if (!_authService) {
    if (_authRequired) {
      throw new Error('Auth service not initialized');
    }
    return { playerId: 'anonymous', username: 'anonymous' };
  }

  // No token provided
  if (!token) {
    if (_authRequired) {
      throw new Error('Authentication required. Please login first.');
    }
    return { playerId: 'anonymous', username: 'anonymous' };
  }

  const payload = await _authService.validateToken(token);
  if (!payload) {
    throw new Error('Session expired or invalid. Please login again.');
  }

  return payload;
}

/** Reset auth state — for testing. */
export function resetColyseusAuth(): void {
  _authService = null;
  _authRequired = false;
}

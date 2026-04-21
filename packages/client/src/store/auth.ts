/**
 * Auth store — identity, authentication, and role.
 */

import type { UserRole } from '@ellmud/shared';
import { createStore } from './createStore.js';

// ─── State ───────────────────────────────────────────────────────────────────

export interface AuthState {
  authenticated: boolean;
  token: string | null;
  playerId: string | null;
  email: string | null;
  username: string | null;
  userRole: UserRole;
}

export const initialAuthState: AuthState = {
  authenticated: false,
  token: null,
  playerId: null,
  email: null,
  username: null,
  userRole: 'player',
};

// ─── Actions ─────────────────────────────────────────────────────────────────

export type AuthAction =
  | { type: 'LOGIN_SUCCESS'; token: string; playerId: string; email?: string; username?: string; role?: UserRole }
  | { type: 'LOGOUT' }
  | { type: 'SET_USER_ROLE'; role: UserRole };

// ─── Reducer ─────────────────────────────────────────────────────────────────

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        authenticated: true,
        token: action.token,
        playerId: action.playerId,
        email: action.email ?? null,
        username: action.username ?? null,
        userRole: action.role ?? 'player',
      };
    case 'LOGOUT':
      return { ...initialAuthState };
    case 'SET_USER_ROLE':
      return { ...state, userRole: action.role };
    default:
      return state;
  }
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useAuthStore = createStore('auth', initialAuthState, authReducer);

// ─── Test Helpers ────────────────────────────────────────────────────────────

export function resetAuthStore(): void {
  useAuthStore.setState({ ...initialAuthState });
}

export function initializeAuthStore(partial: Partial<AuthState>): void {
  useAuthStore.setState({ ...initialAuthState, ...partial });
}

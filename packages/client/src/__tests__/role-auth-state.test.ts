/**
 * role-auth-state.test.ts — Role stored in app state from /auth/me (Issue #373).
 *
 * Design Decisions:
 *   - GET /auth/me returns user's role
 *   - Role is stored in app state
 *   - Role defaults to 'player' if missing from response
 *
 * TDD: Will fail until Jarlaxle adds role to AppState and AppAction types.
 */

import { describe, it, expect } from 'vitest';
import { appReducer, initialState, type AppAction, type AppState } from '../store.js';

// ─── Role in App State Tests ─────────────────────────────────────────────────

describe('Role in App State (Issue #373)', () => {
  describe('initial state', () => {
    it('has a role field', () => {
      // Jarlaxle will add 'role' to AppState
      expect(initialState).toHaveProperty('role');
    });

    it('defaults role to "player"', () => {
      expect((initialState as AppState & { role: string }).role).toBe('player');
    });
  });

  describe('LOGIN_SUCCESS stores role', () => {
    it('stores role from LOGIN_SUCCESS action', () => {
      // Jarlaxle will add 'role' to the LOGIN_SUCCESS action type
      const action = {
        type: 'LOGIN_SUCCESS',
        token: 'tok',
        playerId: 'p1',
        username: 'TestUser',
        role: 'admin',
      } as AppAction;

      const state = appReducer(initialState, action);
      expect((state as AppState & { role: string }).role).toBe('admin');
    });

    it('stores content-dev role from LOGIN_SUCCESS', () => {
      const action = {
        type: 'LOGIN_SUCCESS',
        token: 'tok',
        playerId: 'p1',
        username: 'DevUser',
        role: 'content-dev',
      } as AppAction;

      const state = appReducer(initialState, action);
      expect((state as AppState & { role: string }).role).toBe('content-dev');
    });

    it('defaults role to "player" when LOGIN_SUCCESS omits role', () => {
      const action: AppAction = {
        type: 'LOGIN_SUCCESS',
        token: 'tok',
        playerId: 'p1',
        username: 'NewPlayer',
      };

      const state = appReducer(initialState, action);
      expect((state as AppState & { role: string }).role).toBe('player');
    });
  });

  describe('LOGOUT resets role', () => {
    it('resets role to "player" on logout', () => {
      // First, login as admin
      const loginAction = {
        type: 'LOGIN_SUCCESS',
        token: 'tok',
        playerId: 'p1',
        username: 'Admin',
        role: 'admin',
      } as AppAction;

      const loggedInState = appReducer(initialState, loginAction);
      expect((loggedInState as AppState & { role: string }).role).toBe('admin');

      // Then logout
      const loggedOutState = appReducer(loggedInState, { type: 'LOGOUT' });
      expect((loggedOutState as AppState & { role: string }).role).toBe('player');
    });
  });

  describe('SET_ROLE action', () => {
    it('updates role via SET_ROLE action', () => {
      // Jarlaxle may add a SET_ROLE action for when /auth/me returns role
      const action = {
        type: 'SET_ROLE',
        role: 'content-dev',
      } as unknown as AppAction;

      const state = appReducer(initialState, action);
      expect((state as AppState & { role: string }).role).toBe('content-dev');
    });

    it('SET_ROLE to admin works', () => {
      const action = {
        type: 'SET_ROLE',
        role: 'admin',
      } as unknown as AppAction;

      const state = appReducer(initialState, action);
      expect((state as AppState & { role: string }).role).toBe('admin');
    });

    it('SET_ROLE to player works', () => {
      // Start with an admin state
      const adminState = appReducer(initialState, {
        type: 'LOGIN_SUCCESS',
        token: 'tok',
        playerId: 'p1',
        role: 'admin',
      } as AppAction);

      const action = {
        type: 'SET_ROLE',
        role: 'player',
      } as unknown as AppAction;

      const state = appReducer(adminState, action);
      expect((state as AppState & { role: string }).role).toBe('player');
    });
  });
});

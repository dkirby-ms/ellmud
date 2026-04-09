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
      expect(initialState).toHaveProperty('userRole');
    });

    it('defaults role to "player"', () => {
      expect(initialState.userRole).toBe('player');
    });
  });

  describe('LOGIN_SUCCESS stores role', () => {
    it('stores role from LOGIN_SUCCESS action', () => {
      const action: AppAction = {
        type: 'LOGIN_SUCCESS',
        token: 'tok',
        playerId: 'p1',
        username: 'TestUser',
        role: 'admin',
      };

      const state = appReducer(initialState, action);
      expect(state.userRole).toBe('admin');
    });

    it('stores content-dev role from LOGIN_SUCCESS', () => {
      const action: AppAction = {
        type: 'LOGIN_SUCCESS',
        token: 'tok',
        playerId: 'p1',
        username: 'DevUser',
        role: 'content-dev',
      };

      const state = appReducer(initialState, action);
      expect(state.userRole).toBe('content-dev');
    });

    it('defaults role to "player" when LOGIN_SUCCESS omits role', () => {
      const action: AppAction = {
        type: 'LOGIN_SUCCESS',
        token: 'tok',
        playerId: 'p1',
        username: 'NewPlayer',
      };

      const state = appReducer(initialState, action);
      expect(state.userRole).toBe('player');
    });
  });

  describe('LOGOUT resets role', () => {
    it('resets role to "player" on logout', () => {
      const loginAction: AppAction = {
        type: 'LOGIN_SUCCESS',
        token: 'tok',
        playerId: 'p1',
        username: 'Admin',
        role: 'admin',
      };

      const loggedInState = appReducer(initialState, loginAction);
      expect(loggedInState.userRole).toBe('admin');

      const loggedOutState = appReducer(loggedInState, { type: 'LOGOUT' });
      expect(loggedOutState.userRole).toBe('player');
    });
  });

  describe('SET_USER_ROLE action', () => {
    it('updates role via SET_USER_ROLE action', () => {
      const action: AppAction = {
        type: 'SET_USER_ROLE',
        role: 'content-dev',
      };

      const state = appReducer(initialState, action);
      expect(state.userRole).toBe('content-dev');
    });

    it('SET_USER_ROLE to admin works', () => {
      const action: AppAction = {
        type: 'SET_USER_ROLE',
        role: 'admin',
      };

      const state = appReducer(initialState, action);
      expect(state.userRole).toBe('admin');
    });

    it('SET_USER_ROLE to player works', () => {
      const adminState = appReducer(initialState, {
        type: 'LOGIN_SUCCESS',
        token: 'tok',
        playerId: 'p1',
        role: 'admin',
      } as AppAction);

      const action: AppAction = {
        type: 'SET_USER_ROLE',
        role: 'player',
      };

      const state = appReducer(adminState, action);
      expect(state.userRole).toBe('player');
    });
  });
});

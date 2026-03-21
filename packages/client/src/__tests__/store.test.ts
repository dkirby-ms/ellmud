/**
 * store.test.ts — State reducer logic.
 */

import { describe, it, expect } from 'vitest';
import { appReducer, initialState, type AppAction, type TerminalMessage } from '../store.js';

function makeMsg(id: string, text = 'test'): TerminalMessage {
  return { id, text, type: 'room', timestamp: Date.now() };
}

describe('appReducer', () => {
  it('LOGIN_SUCCESS sets auth state', () => {
    const state = appReducer(initialState, {
      type: 'LOGIN_SUCCESS',
      token: 'tok',
      playerId: 'p1',
    });
    expect(state.authenticated).toBe(true);
    expect(state.token).toBe('tok');
    expect(state.playerId).toBe('p1');
  });

  it('LOGOUT resets to initial state', () => {
    const loggedIn = appReducer(initialState, {
      type: 'LOGIN_SUCCESS',
      token: 'tok',
      playerId: 'p1',
    });
    const state = appReducer(loggedIn, { type: 'LOGOUT' });
    expect(state).toEqual(initialState);
  });

  it('ADD_MESSAGE appends message', () => {
    const msg = makeMsg('m1');
    const state = appReducer(initialState, { type: 'ADD_MESSAGE', message: msg });
    expect(state.messages).toHaveLength(1);
    expect(state.messages[0]).toBe(msg);
  });

  it('ADD_MESSAGE enforces 500-message cap', () => {
    let state = initialState;
    for (let i = 0; i < 510; i++) {
      state = appReducer(state, { type: 'ADD_MESSAGE', message: makeMsg(`m${i}`) });
    }
    expect(state.messages).toHaveLength(500);
    // Most recent message should be last
    expect(state.messages[499].id).toBe('m509');
    // Oldest should have been trimmed
    expect(state.messages[0].id).toBe('m10');
  });

  it('SET_ROOM_HEADER updates roomHeader', () => {
    const header = { roomName: 'Crypt', exits: ['north'], stability: 0.8 };
    const state = appReducer(initialState, { type: 'SET_ROOM_HEADER', header });
    expect(state.roomHeader).toEqual(header);
  });

  it('SET_SHARD_STATE updates shardState', () => {
    const state = appReducer(initialState, { type: 'SET_SHARD_STATE', state: 'active' });
    expect(state.shardState).toBe('active');
  });

  it('SET_CONNECTION_STATUS updates connectionStatus', () => {
    const state = appReducer(initialState, { type: 'SET_CONNECTION_STATUS', status: 'connecting' });
    expect(state.connectionStatus).toBe('connecting');
  });

  it('SET_ERROR and CLEAR_ERROR', () => {
    const s1 = appReducer(initialState, { type: 'SET_ERROR', error: 'oops' });
    expect(s1.error).toBe('oops');
    const s2 = appReducer(s1, { type: 'CLEAR_ERROR' });
    expect(s2.error).toBeNull();
  });

  it('returns current state for unknown action', () => {
    const state = appReducer(initialState, { type: 'UNKNOWN' } as unknown as AppAction);
    expect(state).toBe(initialState);
  });
});

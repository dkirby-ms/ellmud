/**
 * store.test.ts — State reducer logic.
 */

import { describe, it, expect } from 'vitest';
import { appReducer, initialState, type AppAction, type TerminalMessage, type SoundCue, type EnemyStatus, type InventoryItem } from '../store.js';

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

  it('LOGIN_SUCCESS stores username when provided', () => {
    const state = appReducer(initialState, {
      type: 'LOGIN_SUCCESS',
      token: 'tok',
      playerId: 'p1',
      username: 'TestHero',
    });
    expect(state.authenticated).toBe(true);
    expect(state.token).toBe('tok');
    expect(state.playerId).toBe('p1');
    expect(state.username).toBe('TestHero');
  });

  it('LOGIN_SUCCESS sets username to null when not provided', () => {
    const state = appReducer(initialState, {
      type: 'LOGIN_SUCCESS',
      token: 'tok',
      playerId: 'p1',
    });
    expect(state.username).toBeNull();
  });

  it('LOGIN_SUCCESS with email and username stores both', () => {
    const state = appReducer(initialState, {
      type: 'LOGIN_SUCCESS',
      token: 'tok',
      playerId: 'p1',
      email: 'hero@example.com',
      username: 'TestHero',
    });
    expect(state.email).toBe('hero@example.com');
    expect(state.username).toBe('TestHero');
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

  it('LOGOUT clears username', () => {
    const loggedIn = appReducer(initialState, {
      type: 'LOGIN_SUCCESS',
      token: 'tok',
      playerId: 'p1',
      username: 'TestHero',
      email: 'hero@example.com',
    });
    const state = appReducer(loggedIn, { type: 'LOGOUT' });
    expect(state.username).toBeNull();
    expect(state.email).toBeNull();
    expect(state.token).toBeNull();
    expect(state.authenticated).toBe(false);
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

  it('SET_ZONE_STATE updates zoneState', () => {
    const state = appReducer(initialState, { type: 'SET_ZONE_STATE', state: 'open' });
    expect(state.zoneState).toBe('open');
  });

  it('ADD_SOUND_CUE appends sound cue', () => {
    const cue: SoundCue = { id: 'sc-1', text: 'Footsteps', timestamp: Date.now() };
    const state = appReducer(initialState, { type: 'ADD_SOUND_CUE', cue });
    expect(state.soundCues).toHaveLength(1);
    expect(state.soundCues[0]).toBe(cue);
  });

  it('ADD_SOUND_CUE enforces 20-cue cap', () => {
    let state = initialState;
    for (let i = 0; i < 25; i++) {
      state = appReducer(state, { type: 'ADD_SOUND_CUE', cue: { id: `sc-${i}`, text: `sound ${i}`, timestamp: Date.now() } });
    }
    expect(state.soundCues).toHaveLength(20);
    expect(state.soundCues[19].id).toBe('sc-24');
    expect(state.soundCues[0].id).toBe('sc-5');
  });

  it('SET_COMBAT_STATE enables combat', () => {
    const state = appReducer(initialState, { type: 'SET_COMBAT_STATE', inCombat: true });
    expect(state.inCombat).toBe(true);
  });

  it('SET_COMBAT_STATE disabling clears enemy/tick/action', () => {
    let state = appReducer(initialState, { type: 'SET_COMBAT_STATE', inCombat: true });
    state = appReducer(state, { type: 'SET_COMBAT_TICK', tick: 5 });
    state = appReducer(state, { type: 'SET_ENEMY_STATUS', status: { name: 'E', hp: 10, maxHp: 10, hpTier: 'Uninjured', telegraphedAction: null } });
    state = appReducer(state, { type: 'SET_PENDING_COMBAT_ACTION', action: 'strike' });
    state = appReducer(state, { type: 'SET_COMBAT_STATE', inCombat: false });
    expect(state.inCombat).toBe(false);
    expect(state.enemyStatus).toBeNull();
    expect(state.combatTick).toBe(0);
    expect(state.pendingCombatAction).toBeNull();
  });

  it('SET_COMBAT_TICK updates tick', () => {
    const state = appReducer(initialState, { type: 'SET_COMBAT_TICK', tick: 3 });
    expect(state.combatTick).toBe(3);
  });

  it('SET_ENEMY_STATUS updates enemy status', () => {
    const enemy: EnemyStatus = { name: 'Goblin', hp: 50, maxHp: 100, hpTier: 'Wounded', telegraphedAction: null };
    const state = appReducer(initialState, { type: 'SET_ENEMY_STATUS', status: enemy });
    expect(state.enemyStatus).toEqual(enemy);
  });

  it('SET_ENEMY_STATUS can clear to null', () => {
    const enemy: EnemyStatus = { name: 'Goblin', hp: 50, maxHp: 100, hpTier: 'Wounded', telegraphedAction: null };
    let state = appReducer(initialState, { type: 'SET_ENEMY_STATUS', status: enemy });
    state = appReducer(state, { type: 'SET_ENEMY_STATUS', status: null });
    expect(state.enemyStatus).toBeNull();
  });

  it('SET_PENDING_COMBAT_ACTION updates action', () => {
    const state = appReducer(initialState, { type: 'SET_PENDING_COMBAT_ACTION', action: 'dodge' });
    expect(state.pendingCombatAction).toBe('dodge');
  });

  it('SET_PLAYER_STATE updates posture', () => {
    const state = appReducer(initialState, {
      type: 'SET_PLAYER_STATE',
      hp: 80, maxHp: 100, stamina: 0, maxStamina: 0,
      statusEffects: [],
      posture: 'sitting',
    });
    expect(state.posture).toBe('sitting');
  });

  it('initial posture is standing', () => {
    expect(initialState.posture).toBe('standing');
  });

  it('SET_INVENTORY updates inventory', () => {
    const items: InventoryItem[] = [{ id: 'i1', name: 'Sword', tier: 'common', weight: 3 }];
    const state = appReducer(initialState, { type: 'SET_INVENTORY', items });
    expect(state.inventory).toEqual(items);
  });

  it('CLEAR_MESSAGES empties messages array', () => {
    let state = initialState;
    for (let i = 0; i < 5; i++) {
      state = appReducer(state, { type: 'ADD_MESSAGE', message: makeMsg(`m${i}`) });
    }
    expect(state.messages).toHaveLength(5);
    state = appReducer(state, { type: 'CLEAR_MESSAGES' });
    expect(state.messages).toHaveLength(0);
    expect(state.messages).toEqual([]);
  });

  it('CLEAR_MESSAGES preserves other state', () => {
    let state = appReducer(initialState, { type: 'LOGIN_SUCCESS', token: 'tok', playerId: 'p1' });
    state = appReducer(state, { type: 'ADD_MESSAGE', message: makeMsg('m1') });
    state = appReducer(state, { type: 'CLEAR_MESSAGES' });
    expect(state.messages).toHaveLength(0);
    expect(state.authenticated).toBe(true);
    expect(state.token).toBe('tok');
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

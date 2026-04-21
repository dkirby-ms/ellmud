/**
 * combat-state-reducer.test.ts — Tests for expanded COMBAT_STATE reducer (Issue #467 Phase A)
 *
 * Validates the client-side store handles a combatant list from the new
 * COMBAT_STATE server message. These tests are proactive — the
 * SET_COMBAT_STATE_FULL action type and combatState field will be added
 * by Regis once the server message lands.
 *
 * The existing SET_COMBAT_STATE (boolean) is already tested in store.test.ts.
 * These tests cover the NEW combatant-list-aware reducer extension.
 */

import { describe, it, expect } from 'vitest';
import {
  appReducer,
  initialState,
} from '../store.js';

// ─── Shared fixture types (mirrors the proposed COMBAT_STATE payload) ────────

interface CombatantEntry {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  isPlayer: boolean;
  status: 'alive' | 'dead';
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

function _makeCombatant(overrides: Partial<CombatantEntry> = {}): CombatantEntry {
  return {
    id: 'c1',
    name: 'Goblin',
    hp: 50,
    maxHp: 50,
    isPlayer: false,
    status: 'alive',
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('COMBAT_STATE reducer extension (proactive)', () => {
  /**
   * NOTE: These tests document the EXPECTED behaviour once Regis adds
   * SET_COMBAT_STATE_FULL (or renames SET_COMBAT_STATE). Until then, they
   * verify the existing boolean SET_COMBAT_STATE still works and assert
   * invariants that the new reducer must satisfy.
   */

  it('existing SET_COMBAT_STATE still toggles inCombat boolean', () => {
    const on = appReducer(initialState, { type: 'SET_COMBAT_STATE', inCombat: true });
    expect(on.inCombat).toBe(true);

    const off = appReducer(on, { type: 'SET_COMBAT_STATE', inCombat: false });
    expect(off.inCombat).toBe(false);
  });

  it('disabling combat clears enemyStatus, combatTick, and pendingCombatAction', () => {
    let state = appReducer(initialState, { type: 'SET_COMBAT_STATE', inCombat: true });
    state = appReducer(state, { type: 'SET_COMBAT_TICK', tick: 7 });
    state = appReducer(state, {
      type: 'SET_ENEMY_STATUS',
      status: { name: 'Orc', hp: 40, maxHp: 80, hpTier: 'Wounded', telegraphedAction: null },
    });
    state = appReducer(state, { type: 'SET_PENDING_COMBAT_ACTION', action: 'strike' });

    // Disable combat
    state = appReducer(state, { type: 'SET_COMBAT_STATE', inCombat: false });
    expect(state.inCombat).toBe(false);
    expect(state.enemyStatus).toBeNull();
    expect(state.combatTick).toBe(0);
    expect(state.pendingCombatAction).toBeNull();
  });

  it('enabling combat does NOT reset existing enemy status or tick', () => {
    // Start fresh in combat
    let state = appReducer(initialState, { type: 'SET_COMBAT_STATE', inCombat: true });
    state = appReducer(state, { type: 'SET_COMBAT_TICK', tick: 3 });
    state = appReducer(state, {
      type: 'SET_ENEMY_STATUS',
      status: { name: 'Orc', hp: 80, maxHp: 80, hpTier: 'Uninjured', telegraphedAction: null },
    });

    // Re-enable (shouldn't clear)
    state = appReducer(state, { type: 'SET_COMBAT_STATE', inCombat: true });
    expect(state.inCombat).toBe(true);
    expect(state.combatTick).toBe(3);
    expect(state.enemyStatus).not.toBeNull();
  });

  /**
   * The following test documents the contract for the NEW combatant-list
   * state field. Once Regis adds `combatState` (or similar) to AppState
   * and a matching action, un-skip this test and adapt.
   */
  it.todo('SET_COMBAT_STATE_FULL populates combatant list in state');
  it.todo('SET_COMBAT_STATE_FULL with empty combatants array clears combat state');
  it.todo('SET_COMBAT_STATE_FULL updates HP on subsequent ticks');
});

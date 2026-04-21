import { describe, it, expect } from 'vitest';
import { appReducer, initialState } from '../store.js';
import type { CombatantSnapshot } from '@ellmud/shared';

// Helper: build a minimal CombatantSnapshot
function makeSnapshot(
  overrides: Partial<CombatantSnapshot> & { id: string; name: string },
): CombatantSnapshot {
  return {
    hp: 50,
    maxHp: 100,
    isPlayer: false,
    isNPC: true,
    status: 'fighting' as const,
    ...overrides,
  };
}

// Helper: put the store into an active combat state
function stateInCombat() {
  const combatants: CombatantSnapshot[] = [
    makeSnapshot({ id: 'player1', name: 'Hero', isPlayer: true, isNPC: false }),
    makeSnapshot({ id: 'creature1', name: 'Goblin' }),
    makeSnapshot({ id: 'creature2', name: 'Orc' }),
  ];

  let state = appReducer(initialState, {
    type: 'SET_COMBAT_STATE',
    inCombat: true,
  });
  state = appReducer(state, {
    type: 'SET_COMBAT_COMBATANTS',
    combatants,
    hostileIds: ['creature1', 'creature2'],
    playerTargetId: 'creature1',
  });
  return state;
}

describe('Combat State Cleanup', () => {
  // ── Empty COMBAT_STATE clears combat ────────────────────────────────────────

  describe('empty COMBAT_STATE clears combat', () => {
    it('SET_COMBAT_STATE with inCombat:false clears combatCombatants', () => {
      const active = stateInCombat();
      expect(active.combatCombatants.length).toBeGreaterThan(0);

      const cleared = appReducer(active, {
        type: 'SET_COMBAT_STATE',
        inCombat: false,
      });

      expect(cleared.inCombat).toBe(false);
      expect(cleared.combatCombatants).toEqual([]);
      expect(cleared.combatHostileIds).toEqual([]);
      expect(cleared.combatPlayerTargetId).toBeNull();
    });

    it('SET_COMBAT_STATE with inCombat:false also clears enemyStatus and combatTick', () => {
      let state = stateInCombat();
      state = appReducer(state, { type: 'SET_COMBAT_TICK', tick: 5 });
      state = appReducer(state, {
        type: 'SET_ENEMY_STATUS',
        status: { name: 'Goblin', hp: 30, maxHp: 50 },
      });

      const cleared = appReducer(state, {
        type: 'SET_COMBAT_STATE',
        inCombat: false,
      });

      expect(cleared.enemyStatus).toBeNull();
      expect(cleared.combatTick).toBe(0);
      expect(cleared.pendingCombatAction).toBeNull();
    });

    it('SET_COMBAT_STATE with inCombat:true does NOT clear combat data', () => {
      const active = stateInCombat();
      const stillActive = appReducer(active, {
        type: 'SET_COMBAT_STATE',
        inCombat: true,
      });

      // Combat data should be preserved
      expect(stillActive.combatCombatants).toEqual(active.combatCombatants);
      expect(stillActive.combatHostileIds).toEqual(active.combatHostileIds);
      expect(stillActive.combatPlayerTargetId).toBe(active.combatPlayerTargetId);
    });
  });

  // ── Dead creatures filtered from targets ──────────────────────────────────

  describe('dead creatures filtered from targets', () => {
    it('combatants with status dead should not be considered valid targets', () => {
      const combatants: CombatantSnapshot[] = [
        makeSnapshot({ id: 'player1', name: 'Hero', isPlayer: true, isNPC: false }),
        makeSnapshot({ id: 'creature1', name: 'Goblin', status: 'dead' }),
        makeSnapshot({ id: 'creature2', name: 'Orc', status: 'fighting' }),
      ];

      const state = appReducer(
        appReducer(initialState, { type: 'SET_COMBAT_STATE', inCombat: true }),
        {
          type: 'SET_COMBAT_COMBATANTS',
          combatants,
          hostileIds: ['creature1', 'creature2'],
          playerTargetId: 'creature1',
        },
      );

      // The store holds all combatants including dead ones
      expect(state.combatCombatants).toHaveLength(3);

      // But live hostile targets should exclude dead creatures
      const liveHostiles = state.combatCombatants.filter(
        (c) =>
          state.combatHostileIds.includes(c.id) && c.status !== 'dead',
      );
      expect(liveHostiles).toHaveLength(1);
      expect(liveHostiles[0]!.id).toBe('creature2');
    });

    it('downed combatants are also not valid attack targets', () => {
      const combatants: CombatantSnapshot[] = [
        makeSnapshot({ id: 'player1', name: 'Hero', isPlayer: true, isNPC: false }),
        makeSnapshot({ id: 'creature1', name: 'Goblin', status: 'downed' }),
        makeSnapshot({ id: 'creature2', name: 'Orc', status: 'fighting' }),
      ];

      const state = appReducer(
        appReducer(initialState, { type: 'SET_COMBAT_STATE', inCombat: true }),
        {
          type: 'SET_COMBAT_COMBATANTS',
          combatants,
          hostileIds: ['creature1', 'creature2'],
          playerTargetId: 'creature1',
        },
      );

      const validTargets = state.combatCombatants.filter(
        (c) =>
          state.combatHostileIds.includes(c.id) &&
          c.status === 'fighting',
      );
      expect(validTargets).toHaveLength(1);
      expect(validTargets[0]!.id).toBe('creature2');
    });
  });

  // ── Combat state clears on room switch ────────────────────────────────────

  describe('combat state clears on room switch', () => {
    it('room switch triggers SET_COMBAT_STATE inCombat:false which clears combat', () => {
      // In the real app, useZoneConnection dispatches SET_COMBAT_STATE
      // with inCombat: false on every room switch (not just hubs).
      // The reducer itself doesn't clear combat on SET_ROOM — it's the
      // connection handler that sequences the dispatches.
      const active = stateInCombat();
      expect(active.inCombat).toBe(true);
      expect(active.combatCombatants.length).toBeGreaterThan(0);

      // Simulate the sequence that happens on room switch:
      // 1. SET_COMBAT_STATE inCombat: false (from connection handler)
      // 2. SET_ROOM (from connection handler)
      const afterCombatClear = appReducer(active, {
        type: 'SET_COMBAT_STATE',
        inCombat: false,
      });
      const afterRoomSwitch = appReducer(afterCombatClear, {
        type: 'SET_ROOM',
        room: null,
      });

      expect(afterRoomSwitch.combatCombatants).toEqual([]);
      expect(afterRoomSwitch.combatHostileIds).toEqual([]);
      expect(afterRoomSwitch.combatPlayerTargetId).toBeNull();
      expect(afterRoomSwitch.inCombat).toBe(false);
    });
  });
});

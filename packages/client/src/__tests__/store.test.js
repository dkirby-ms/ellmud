"use strict";
/**
 * store.test.ts — State reducer logic.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const store_js_1 = require("../store.js");
function makeMsg(id, text = 'test') {
    return { id, text, type: 'room', timestamp: Date.now() };
}
(0, vitest_1.describe)('appReducer', () => {
    (0, vitest_1.it)('LOGIN_SUCCESS sets auth state', () => {
        const state = (0, store_js_1.appReducer)(store_js_1.initialState, {
            type: 'LOGIN_SUCCESS',
            token: 'tok',
            playerId: 'p1',
        });
        (0, vitest_1.expect)(state.authenticated).toBe(true);
        (0, vitest_1.expect)(state.token).toBe('tok');
        (0, vitest_1.expect)(state.playerId).toBe('p1');
    });
    (0, vitest_1.it)('LOGOUT resets to initial state', () => {
        const loggedIn = (0, store_js_1.appReducer)(store_js_1.initialState, {
            type: 'LOGIN_SUCCESS',
            token: 'tok',
            playerId: 'p1',
        });
        const state = (0, store_js_1.appReducer)(loggedIn, { type: 'LOGOUT' });
        (0, vitest_1.expect)(state).toEqual(store_js_1.initialState);
    });
    (0, vitest_1.it)('ADD_MESSAGE appends message', () => {
        const msg = makeMsg('m1');
        const state = (0, store_js_1.appReducer)(store_js_1.initialState, { type: 'ADD_MESSAGE', message: msg });
        (0, vitest_1.expect)(state.messages).toHaveLength(1);
        (0, vitest_1.expect)(state.messages[0]).toBe(msg);
    });
    (0, vitest_1.it)('ADD_MESSAGE enforces 500-message cap', () => {
        let state = store_js_1.initialState;
        for (let i = 0; i < 510; i++) {
            state = (0, store_js_1.appReducer)(state, { type: 'ADD_MESSAGE', message: makeMsg(`m${i}`) });
        }
        (0, vitest_1.expect)(state.messages).toHaveLength(500);
        // Most recent message should be last
        (0, vitest_1.expect)(state.messages[499].id).toBe('m509');
        // Oldest should have been trimmed
        (0, vitest_1.expect)(state.messages[0].id).toBe('m10');
    });
    (0, vitest_1.it)('SET_ROOM_HEADER updates roomHeader', () => {
        const header = { roomName: 'Crypt', exits: ['north'], stability: 0.8 };
        const state = (0, store_js_1.appReducer)(store_js_1.initialState, { type: 'SET_ROOM_HEADER', header });
        (0, vitest_1.expect)(state.roomHeader).toEqual(header);
    });
    (0, vitest_1.it)('SET_SHARD_STATE updates shardState', () => {
        const state = (0, store_js_1.appReducer)(store_js_1.initialState, { type: 'SET_SHARD_STATE', state: 'active' });
        (0, vitest_1.expect)(state.shardState).toBe('active');
    });
    (0, vitest_1.it)('SET_SHARD_STATE sets collapseTimer and collapseTimerMax', () => {
        const state = (0, store_js_1.appReducer)(store_js_1.initialState, { type: 'SET_SHARD_STATE', state: 'active', collapseTimer: 120 });
        (0, vitest_1.expect)(state.collapseTimer).toBe(120);
        (0, vitest_1.expect)(state.collapseTimerMax).toBe(120);
    });
    (0, vitest_1.it)('SET_SHARD_STATE preserves higher collapseTimerMax', () => {
        const s1 = (0, store_js_1.appReducer)(store_js_1.initialState, { type: 'SET_SHARD_STATE', state: 'active', collapseTimer: 120 });
        const s2 = (0, store_js_1.appReducer)(s1, { type: 'SET_SHARD_STATE', state: 'active', collapseTimer: 90 });
        (0, vitest_1.expect)(s2.collapseTimer).toBe(90);
        (0, vitest_1.expect)(s2.collapseTimerMax).toBe(120);
    });
    (0, vitest_1.it)('SET_SHARD_STATE without collapseTimer sets timer to null', () => {
        const state = (0, store_js_1.appReducer)(store_js_1.initialState, { type: 'SET_SHARD_STATE', state: 'active' });
        (0, vitest_1.expect)(state.collapseTimer).toBeNull();
    });
    (0, vitest_1.it)('ADD_SOUND_CUE appends sound cue', () => {
        const cue = { id: 'sc-1', text: 'Footsteps', timestamp: Date.now() };
        const state = (0, store_js_1.appReducer)(store_js_1.initialState, { type: 'ADD_SOUND_CUE', cue });
        (0, vitest_1.expect)(state.soundCues).toHaveLength(1);
        (0, vitest_1.expect)(state.soundCues[0]).toBe(cue);
    });
    (0, vitest_1.it)('ADD_SOUND_CUE enforces 20-cue cap', () => {
        let state = store_js_1.initialState;
        for (let i = 0; i < 25; i++) {
            state = (0, store_js_1.appReducer)(state, { type: 'ADD_SOUND_CUE', cue: { id: `sc-${i}`, text: `sound ${i}`, timestamp: Date.now() } });
        }
        (0, vitest_1.expect)(state.soundCues).toHaveLength(20);
        (0, vitest_1.expect)(state.soundCues[19].id).toBe('sc-24');
        (0, vitest_1.expect)(state.soundCues[0].id).toBe('sc-5');
    });
    (0, vitest_1.it)('SET_COMBAT_STATE enables combat', () => {
        const state = (0, store_js_1.appReducer)(store_js_1.initialState, { type: 'SET_COMBAT_STATE', inCombat: true });
        (0, vitest_1.expect)(state.inCombat).toBe(true);
    });
    (0, vitest_1.it)('SET_COMBAT_STATE disabling clears enemy/tick/action', () => {
        let state = (0, store_js_1.appReducer)(store_js_1.initialState, { type: 'SET_COMBAT_STATE', inCombat: true });
        state = (0, store_js_1.appReducer)(state, { type: 'SET_COMBAT_TICK', tick: 5 });
        state = (0, store_js_1.appReducer)(state, { type: 'SET_ENEMY_STATUS', status: { name: 'E', hp: 10, maxHp: 10, hpTier: 'Uninjured', telegraphedAction: null } });
        state = (0, store_js_1.appReducer)(state, { type: 'SET_PENDING_COMBAT_ACTION', action: 'strike' });
        state = (0, store_js_1.appReducer)(state, { type: 'SET_COMBAT_STATE', inCombat: false });
        (0, vitest_1.expect)(state.inCombat).toBe(false);
        (0, vitest_1.expect)(state.enemyStatus).toBeNull();
        (0, vitest_1.expect)(state.combatTick).toBe(0);
        (0, vitest_1.expect)(state.pendingCombatAction).toBeNull();
    });
    (0, vitest_1.it)('SET_COMBAT_TICK updates tick', () => {
        const state = (0, store_js_1.appReducer)(store_js_1.initialState, { type: 'SET_COMBAT_TICK', tick: 3 });
        (0, vitest_1.expect)(state.combatTick).toBe(3);
    });
    (0, vitest_1.it)('SET_ENEMY_STATUS updates enemy status', () => {
        const enemy = { name: 'Goblin', hp: 50, maxHp: 100, hpTier: 'Wounded', telegraphedAction: null };
        const state = (0, store_js_1.appReducer)(store_js_1.initialState, { type: 'SET_ENEMY_STATUS', status: enemy });
        (0, vitest_1.expect)(state.enemyStatus).toEqual(enemy);
    });
    (0, vitest_1.it)('SET_ENEMY_STATUS can clear to null', () => {
        const enemy = { name: 'Goblin', hp: 50, maxHp: 100, hpTier: 'Wounded', telegraphedAction: null };
        let state = (0, store_js_1.appReducer)(store_js_1.initialState, { type: 'SET_ENEMY_STATUS', status: enemy });
        state = (0, store_js_1.appReducer)(state, { type: 'SET_ENEMY_STATUS', status: null });
        (0, vitest_1.expect)(state.enemyStatus).toBeNull();
    });
    (0, vitest_1.it)('SET_PENDING_COMBAT_ACTION updates action', () => {
        const state = (0, store_js_1.appReducer)(store_js_1.initialState, { type: 'SET_PENDING_COMBAT_ACTION', action: 'dodge' });
        (0, vitest_1.expect)(state.pendingCombatAction).toBe('dodge');
    });
    (0, vitest_1.it)('SET_COLLAPSE_TIMER updates timer', () => {
        const state = (0, store_js_1.appReducer)(store_js_1.initialState, { type: 'SET_COLLAPSE_TIMER', timer: 45 });
        (0, vitest_1.expect)(state.collapseTimer).toBe(45);
    });
    (0, vitest_1.it)('SET_COLLAPSE_TIMER can set to null', () => {
        let state = (0, store_js_1.appReducer)(store_js_1.initialState, { type: 'SET_COLLAPSE_TIMER', timer: 45 });
        state = (0, store_js_1.appReducer)(state, { type: 'SET_COLLAPSE_TIMER', timer: null });
        (0, vitest_1.expect)(state.collapseTimer).toBeNull();
    });
    (0, vitest_1.it)('SET_INVENTORY updates inventory', () => {
        const items = [{ id: 'i1', name: 'Sword', tier: 'common' }];
        const state = (0, store_js_1.appReducer)(store_js_1.initialState, { type: 'SET_INVENTORY', items });
        (0, vitest_1.expect)(state.inventory).toEqual(items);
    });
    (0, vitest_1.it)('CLEAR_MESSAGES empties messages array', () => {
        let state = store_js_1.initialState;
        for (let i = 0; i < 5; i++) {
            state = (0, store_js_1.appReducer)(state, { type: 'ADD_MESSAGE', message: makeMsg(`m${i}`) });
        }
        (0, vitest_1.expect)(state.messages).toHaveLength(5);
        state = (0, store_js_1.appReducer)(state, { type: 'CLEAR_MESSAGES' });
        (0, vitest_1.expect)(state.messages).toHaveLength(0);
        (0, vitest_1.expect)(state.messages).toEqual([]);
    });
    (0, vitest_1.it)('CLEAR_MESSAGES preserves other state', () => {
        let state = (0, store_js_1.appReducer)(store_js_1.initialState, { type: 'LOGIN_SUCCESS', token: 'tok', playerId: 'p1' });
        state = (0, store_js_1.appReducer)(state, { type: 'ADD_MESSAGE', message: makeMsg('m1') });
        state = (0, store_js_1.appReducer)(state, { type: 'CLEAR_MESSAGES' });
        (0, vitest_1.expect)(state.messages).toHaveLength(0);
        (0, vitest_1.expect)(state.authenticated).toBe(true);
        (0, vitest_1.expect)(state.token).toBe('tok');
    });
    (0, vitest_1.it)('SET_CONNECTION_STATUS updates connectionStatus', () => {
        const state = (0, store_js_1.appReducer)(store_js_1.initialState, { type: 'SET_CONNECTION_STATUS', status: 'connecting' });
        (0, vitest_1.expect)(state.connectionStatus).toBe('connecting');
    });
    (0, vitest_1.it)('SET_ERROR and CLEAR_ERROR', () => {
        const s1 = (0, store_js_1.appReducer)(store_js_1.initialState, { type: 'SET_ERROR', error: 'oops' });
        (0, vitest_1.expect)(s1.error).toBe('oops');
        const s2 = (0, store_js_1.appReducer)(s1, { type: 'CLEAR_ERROR' });
        (0, vitest_1.expect)(s2.error).toBeNull();
    });
    (0, vitest_1.it)('returns current state for unknown action', () => {
        const state = (0, store_js_1.appReducer)(store_js_1.initialState, { type: 'UNKNOWN' });
        (0, vitest_1.expect)(state).toBe(store_js_1.initialState);
    });
});
//# sourceMappingURL=store.test.js.map
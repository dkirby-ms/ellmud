/**
 * Combat store — combat state, HP/stamina, combatants, posture.
 */

import type { CombatAction, Posture, CombatantSnapshot } from '@ellmud/shared';
import { createStore } from './createStore.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export type HpTier = 'Uninjured' | 'Wounded' | 'Badly Wounded' | 'Near Death';

export interface EnemyStatus {
  name: string;
  hp: number;
  maxHp: number;
  hpTier: HpTier;
  telegraphedAction: string | null;
}

export interface StatusEffect {
  id: string;
  name: string;
  duration: number;
}

export function getHpTier(hp: number, maxHp: number): HpTier {
  if (maxHp <= 0) return 'Near Death';
  const ratio = hp / maxHp;
  if (ratio > 0.75) return 'Uninjured';
  if (ratio > 0.4) return 'Wounded';
  if (ratio > 0.15) return 'Badly Wounded';
  return 'Near Death';
}

// ─── State ───────────────────────────────────────────────────────────────────

export interface CombatState {
  inCombat: boolean;
  combatTick: number;
  enemyStatus: EnemyStatus | null;
  pendingCombatAction: CombatAction | null;
  statusEffects: StatusEffect[];
  playerHp: number;
  playerMaxHp: number;
  playerStamina: number;
  playerMaxStamina: number;
  posture: Posture;
  combatCombatants: CombatantSnapshot[];
  combatHostileIds: string[];
  combatPlayerTargetId: string | null;
}

export const initialCombatState: CombatState = {
  inCombat: false,
  combatTick: 0,
  enemyStatus: null,
  pendingCombatAction: null,
  statusEffects: [],
  playerHp: 100,
  playerMaxHp: 100,
  playerStamina: 0,
  playerMaxStamina: 0,
  posture: 'standing',
  combatCombatants: [],
  combatHostileIds: [],
  combatPlayerTargetId: null,
};

// ─── Actions ─────────────────────────────────────────────────────────────────

export type CombatStoreAction =
  | { type: 'SET_COMBAT_STATE'; inCombat: boolean }
  | { type: 'SET_COMBAT_TICK'; tick: number }
  | { type: 'SET_ENEMY_STATUS'; status: EnemyStatus | null }
  | { type: 'SET_PENDING_COMBAT_ACTION'; action: CombatAction | null }
  | { type: 'SET_PLAYER_STATE'; hp: number; maxHp: number; stamina: number; maxStamina: number; statusEffects: StatusEffect[]; posture: Posture }
  | { type: 'SET_COMBAT_COMBATANTS'; combatants: CombatantSnapshot[]; hostileIds: string[]; playerTargetId?: string };

// ─── Reducer ─────────────────────────────────────────────────────────────────

export function combatReducer(state: CombatState, action: CombatStoreAction): CombatState {
  switch (action.type) {
    case 'SET_COMBAT_STATE':
      return {
        ...state,
        inCombat: action.inCombat,
        ...(action.inCombat
          ? {}
          : {
              enemyStatus: null,
              combatTick: 0,
              pendingCombatAction: null,
              combatCombatants: [],
              combatHostileIds: [],
              combatPlayerTargetId: null,
            }),
      };
    case 'SET_COMBAT_TICK':
      return { ...state, combatTick: action.tick };
    case 'SET_ENEMY_STATUS':
      return { ...state, enemyStatus: action.status };
    case 'SET_PENDING_COMBAT_ACTION':
      return { ...state, pendingCombatAction: action.action };
    case 'SET_PLAYER_STATE':
      return {
        ...state,
        playerHp: action.hp,
        playerMaxHp: action.maxHp,
        playerStamina: action.stamina,
        playerMaxStamina: action.maxStamina,
        statusEffects: action.statusEffects,
        posture: action.posture,
      };
    case 'SET_COMBAT_COMBATANTS':
      return {
        ...state,
        combatCombatants: action.combatants,
        combatHostileIds: action.hostileIds,
        combatPlayerTargetId: action.playerTargetId ?? state.combatPlayerTargetId,
      };
    default:
      return state;
  }
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useCombatStore = createStore('combat', initialCombatState, combatReducer);

// ─── Test Helpers ────────────────────────────────────────────────────────────

export function resetCombatStore(): void {
  useCombatStore.setState({ ...initialCombatState });
}

export function initializeCombatStore(partial: Partial<CombatState>): void {
  useCombatStore.setState({ ...initialCombatState, ...partial });
}

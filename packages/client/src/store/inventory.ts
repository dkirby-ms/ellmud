/**
 * Inventory store — character progression, gear, stats, room occupants.
 */

import type {
  EquipmentSlots, DisplayItem, CharacterSummary, GearTier,
  BaseStatsMessage,
} from '@ellmud/shared';
import { createEmptyEquipmentSlots } from '@ellmud/shared';
import { createStore } from './createStore.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface InventoryItem {
  id: string;
  name: string;
  tier: GearTier;
  weight: number;
}

/** Effective combat stats with equipment bonuses */
export interface EffectiveStats {
  maxHp: number;
  attack: number;
  armour: number;
  shieldBlock: number;
  dodge: number;
}

/** Player base combat stats (synced from server PlayerState) */
export interface CombatStats {
  maxHp: number;
  unarmed: number;
  oneHanded: number;
  twoHanded: number;
  ranged: number;
  shieldBlock: number;
  dodge: number;
  armour: number;
}

// ─── State ───────────────────────────────────────────────────────────────────

export interface InventoryState {
  inventory: InventoryItem[];
  loadout: EquipmentSlots;
  stashItems: DisplayItem[];
  pendingEquipAction: boolean;
  combatStats: CombatStats;
  effectiveStats: EffectiveStats | null;
  baseStats: BaseStatsMessage | null;
  statPointsAvailable: number;
  activeCharacter: CharacterSummary | null;
  roomOccupants: {
    creatures: Array<{ id: string; name: string; type: string; aggressive: boolean }>;
    players: Array<{ id: string; name: string; disconnected?: boolean }>;
  };
}

export const initialInventoryState: InventoryState = {
  inventory: [],
  loadout: createEmptyEquipmentSlots(),
  stashItems: [],
  pendingEquipAction: false,
  combatStats: {
    maxHp: 100,
    unarmed: 5,
    oneHanded: 5,
    twoHanded: 5,
    ranged: 5,
    shieldBlock: 5,
    dodge: 5,
    armour: 0,
  },
  effectiveStats: null,
  baseStats: null,
  statPointsAvailable: 0,
  activeCharacter: null,
  roomOccupants: { creatures: [], players: [] },
};

// ─── Actions ─────────────────────────────────────────────────────────────────

export type InventoryAction =
  | { type: 'SET_INVENTORY'; items: InventoryItem[] }
  | { type: 'SET_LOADOUT'; slots: EquipmentSlots }
  | { type: 'SET_STASH_ITEMS'; items: DisplayItem[] }
  | { type: 'SET_PENDING_EQUIP'; pending: boolean }
  | { type: 'SET_COMBAT_STATS'; stats: CombatStats }
  | { type: 'SET_EFFECTIVE_STATS'; stats: EffectiveStats }
  | { type: 'SET_BASE_STATS'; baseStats: BaseStatsMessage; statPointsAvailable: number }
  | { type: 'SET_ACTIVE_CHARACTER'; character: CharacterSummary | null }
  | { type: 'SET_ROOM_OCCUPANTS'; occupants: InventoryState['roomOccupants'] };

// ─── Reducer ─────────────────────────────────────────────────────────────────

export function inventoryReducer(state: InventoryState, action: InventoryAction): InventoryState {
  switch (action.type) {
    case 'SET_INVENTORY':
      return { ...state, inventory: action.items };
    case 'SET_LOADOUT':
      return { ...state, loadout: action.slots, pendingEquipAction: false };
    case 'SET_STASH_ITEMS':
      return { ...state, stashItems: action.items, pendingEquipAction: false };
    case 'SET_PENDING_EQUIP':
      return { ...state, pendingEquipAction: action.pending };
    case 'SET_COMBAT_STATS':
      return { ...state, combatStats: action.stats };
    case 'SET_EFFECTIVE_STATS':
      return { ...state, effectiveStats: action.stats };
    case 'SET_BASE_STATS':
      return { ...state, baseStats: action.baseStats, statPointsAvailable: action.statPointsAvailable };
    case 'SET_ACTIVE_CHARACTER':
      return { ...state, activeCharacter: action.character };
    case 'SET_ROOM_OCCUPANTS':
      return { ...state, roomOccupants: action.occupants };
    default:
      return state;
  }
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useInventoryStore = createStore('inventory', initialInventoryState, inventoryReducer);

// ─── Test Helpers ────────────────────────────────────────────────────────────

export function resetInventoryStore(): void {
  useInventoryStore.setState({ ...initialInventoryState });
}

export function initializeInventoryStore(partial: Partial<InventoryState>): void {
  useInventoryStore.setState({ ...initialInventoryState, ...partial });
}

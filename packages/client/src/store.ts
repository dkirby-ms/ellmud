/**
 * App state — minimal React context store.
 * The server is the source of truth; we only track UI-relevant state.
 */

import { createContext, useContext } from 'react';
import type { Room } from '@colyseus/sdk';
import type {
  NarrationType, RoomHeaderMessage, ZoneState, CombatAction, GearTier,
  EquipmentSlots, DisplayItem, CharacterSummary, UserRole, Posture,
  BaseStatsMessage,
} from '@ellmud/shared';
import { createEmptyEquipmentSlots } from '@ellmud/shared';

// ─── Message types for terminal display ──────────────────────────────────────

export interface TerminalMessage {
  id: string;
  text: string;
  type: NarrationType | 'header' | 'combat';
  timestamp: number;
  combatSubtype?: 'hit_dealt' | 'hit_taken' | 'dodge' | 'defeated' | 'flee' | 'combat_end';
}

// ─── Sidebar / Combat UI types ───────────────────────────────────────────────

export interface SoundCue {
  id: string;
  text: string;
  timestamp: number;
}

export type HpTier = 'Uninjured' | 'Wounded' | 'Badly Wounded' | 'Near Death';

export interface EnemyStatus {
  name: string;
  hp: number;
  maxHp: number;
  hpTier: HpTier;
  telegraphedAction: string | null;
}

export interface InventoryItem {
  id: string;
  name: string;
  tier: GearTier;
  weight: number;
}

export interface StatusEffect {
  id: string;
  name: string;
  duration: number;
}

/** Effective combat stats with equipment bonuses (#455) */
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

export function getHpTier(hp: number, maxHp: number): HpTier {
  if (maxHp <= 0) return 'Near Death';
  const ratio = hp / maxHp;
  if (ratio > 0.75) return 'Uninjured';
  if (ratio > 0.4) return 'Wounded';
  if (ratio > 0.15) return 'Badly Wounded';
  return 'Near Death';
}

// ─── App state shape ─────────────────────────────────────────────────────────

export interface AppState {
  authenticated: boolean;
  token: string | null;
  playerId: string | null;
  email: string | null;
  username: string | null;
  userRole: UserRole;
  activeCharacter: CharacterSummary | null;
  room: Room | null;
  messages: TerminalMessage[];
  roomHeader: RoomHeaderMessage | null;
  zoneState: ZoneState | null;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  error: string | null;
  soundCues: SoundCue[];
  inCombat: boolean;
  combatTick: number;
  enemyStatus: EnemyStatus | null;
  inventory: InventoryItem[];
  pendingCombatAction: CombatAction | null;
  posture: Posture;
  statusEffects: StatusEffect[];
  playerHp: number;
  playerMaxHp: number;
  playerStamina: number;
  playerMaxStamina: number;
  loadout: EquipmentSlots;
  stashItems: DisplayItem[];
  pendingEquipAction: boolean;
  roomOccupants: {
    creatures: Array<{ id: string; name: string; type: string; aggressive: boolean }>;
    players: Array<{ id: string; name: string; disconnected?: boolean }>;
  };
  combatStats: CombatStats;
  effectiveStats: EffectiveStats | null;
  baseStats: BaseStatsMessage | null;
  statPointsAvailable: number;
}

export const initialState: AppState = {
  authenticated: false,
  token: null,
  playerId: null,
  email: null,
  username: null,
  userRole: 'player',
  activeCharacter: null,
  room: null,
  messages: [],
  roomHeader: null,
  zoneState: null,
  connectionStatus: 'disconnected',
  error: null,
  soundCues: [],
  inCombat: false,
  combatTick: 0,
  enemyStatus: null,
  inventory: [],
  pendingCombatAction: null,
  posture: 'standing',
  statusEffects: [],
  playerHp: 100,
  playerMaxHp: 100,
  playerStamina: 0,
  playerMaxStamina: 0,
  loadout: createEmptyEquipmentSlots(),
  stashItems: [],
  pendingEquipAction: false,
  roomOccupants: { creatures: [], players: [] },
  // TODO: Server needs to send combat stats via room state or player_state message.
  // These are placeholder defaults until server-side sync is wired up.
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
};

// ─── Actions ─────────────────────────────────────────────────────────────────

const MAX_SOUND_CUES = 20;

export type AppAction =
  | { type: 'LOGIN_SUCCESS'; token: string; playerId: string; email?: string; username?: string; role?: UserRole }
  | { type: 'LOGOUT' }
  | { type: 'SET_USER_ROLE'; role: UserRole }
  | { type: 'SET_ROOM'; room: Room | null }
  | { type: 'ADD_MESSAGE'; message: TerminalMessage }
  | { type: 'SET_ROOM_HEADER'; header: RoomHeaderMessage }
  | { type: 'SET_ZONE_STATE'; state: ZoneState }
  | { type: 'SET_CONNECTION_STATUS'; status: AppState['connectionStatus'] }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'ADD_SOUND_CUE'; cue: SoundCue }
  | { type: 'SET_COMBAT_STATE'; inCombat: boolean }
  | { type: 'SET_COMBAT_TICK'; tick: number }
  | { type: 'SET_ENEMY_STATUS'; status: EnemyStatus | null }
  | { type: 'SET_PENDING_COMBAT_ACTION'; action: CombatAction | null }
  | { type: 'SET_INVENTORY'; items: InventoryItem[] }
  | { type: 'CLEAR_MESSAGES' }
  | { type: 'SET_LOADOUT'; slots: EquipmentSlots }
  | { type: 'SET_STASH_ITEMS'; items: DisplayItem[] }
  | { type: 'SET_PENDING_EQUIP'; pending: boolean }
  | { type: 'SET_ACTIVE_CHARACTER'; character: CharacterSummary | null }
  | { type: 'SET_PLAYER_STATE'; hp: number; maxHp: number; stamina: number; maxStamina: number; statusEffects: StatusEffect[]; posture: Posture }
  | { type: 'SET_ROOM_OCCUPANTS'; occupants: AppState['roomOccupants'] }
  | { type: 'SET_COMBAT_STATS'; stats: CombatStats }
  | { type: 'SET_EFFECTIVE_STATS'; stats: EffectiveStats }
  | { type: 'SET_BASE_STATS'; baseStats: BaseStatsMessage; statPointsAvailable: number };

const MAX_MESSAGES = 500;

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return { ...state, authenticated: true, token: action.token, playerId: action.playerId, email: action.email ?? null, username: action.username ?? null, userRole: action.role ?? 'player', error: null };
    case 'LOGOUT':
      return { ...initialState };
    case 'SET_USER_ROLE':
      return { ...state, userRole: action.role };
    case 'SET_ROOM':
      return action.room
        ? { ...state, room: action.room, connectionStatus: 'connected' }
        : { ...state, room: null, connectionStatus: 'disconnected', roomHeader: null, roomOccupants: { creatures: [], players: [] } };
    case 'ADD_MESSAGE': {
      const messages = [...state.messages, action.message];
      return { ...state, messages: messages.length > MAX_MESSAGES ? messages.slice(messages.length - MAX_MESSAGES) : messages };
    }
    case 'SET_ROOM_HEADER':
      return { ...state, roomHeader: action.header };
    case 'SET_ZONE_STATE':
      return { ...state, zoneState: action.state };
    case 'SET_CONNECTION_STATUS':
      return { ...state, connectionStatus: action.status };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'ADD_SOUND_CUE': {
      const cues = [...state.soundCues, action.cue];
      return { ...state, soundCues: cues.length > MAX_SOUND_CUES ? cues.slice(cues.length - MAX_SOUND_CUES) : cues };
    }
    case 'SET_COMBAT_STATE':
      return { ...state, inCombat: action.inCombat, ...(action.inCombat ? {} : { enemyStatus: null, combatTick: 0, pendingCombatAction: null }) };
    case 'SET_COMBAT_TICK':
      return { ...state, combatTick: action.tick };
    case 'SET_ENEMY_STATUS':
      return { ...state, enemyStatus: action.status };
    case 'SET_PENDING_COMBAT_ACTION':
      return { ...state, pendingCombatAction: action.action };
    case 'SET_INVENTORY':
      return { ...state, inventory: action.items };
    case 'CLEAR_MESSAGES':
      return { ...state, messages: [], roomOccupants: { creatures: [], players: [] } };
    case 'SET_LOADOUT':
      return { ...state, loadout: action.slots, pendingEquipAction: false };
    case 'SET_STASH_ITEMS':
      return { ...state, stashItems: action.items, pendingEquipAction: false };
    case 'SET_PENDING_EQUIP':
      return { ...state, pendingEquipAction: action.pending };
    case 'SET_ACTIVE_CHARACTER':
      return { ...state, activeCharacter: action.character };
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
    case 'SET_ROOM_OCCUPANTS':
      return { ...state, roomOccupants: action.occupants };
    case 'SET_COMBAT_STATS':
      return { ...state, combatStats: action.stats };
    case 'SET_EFFECTIVE_STATS':
      return { ...state, effectiveStats: action.stats };
    case 'SET_BASE_STATS':
      return { ...state, baseStats: action.baseStats, statPointsAvailable: action.statPointsAvailable };
    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

export interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}

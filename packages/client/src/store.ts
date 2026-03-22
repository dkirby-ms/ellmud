/**
 * App state — minimal React context store.
 * The server is the source of truth; we only track UI-relevant state.
 */

import { createContext, useContext } from 'react';
import type { Room } from '@colyseus/sdk';
import type { NarrationType, RoomHeaderMessage, ShardState, CombatAction, GearTier } from '@ellmud/shared';

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

// ─── App state shape ─────────────────────────────────────────────────────────

export interface AppState {
  authenticated: boolean;
  token: string | null;
  playerId: string | null;
  room: Room | null;
  messages: TerminalMessage[];
  roomHeader: RoomHeaderMessage | null;
  shardState: ShardState | null;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  error: string | null;
  collapseTimer: number | null;
  collapseTimerMax: number | null;
  soundCues: SoundCue[];
  inCombat: boolean;
  combatTick: number;
  enemyStatus: EnemyStatus | null;
  inventory: InventoryItem[];
  pendingCombatAction: CombatAction | null;
  statusEffects: StatusEffect[];
  playerHp: number;
  playerMaxHp: number;
}

export const initialState: AppState = {
  authenticated: false,
  token: null,
  playerId: null,
  room: null,
  messages: [],
  roomHeader: null,
  shardState: null,
  connectionStatus: 'disconnected',
  error: null,
  collapseTimer: null,
  collapseTimerMax: null,
  soundCues: [],
  inCombat: false,
  combatTick: 0,
  enemyStatus: null,
  inventory: [],
  pendingCombatAction: null,
  statusEffects: [],
  playerHp: 100,
  playerMaxHp: 100,
};

// ─── Actions ─────────────────────────────────────────────────────────────────

const MAX_SOUND_CUES = 20;

export type AppAction =
  | { type: 'LOGIN_SUCCESS'; token: string; playerId: string }
  | { type: 'LOGOUT' }
  | { type: 'SET_ROOM'; room: Room }
  | { type: 'ADD_MESSAGE'; message: TerminalMessage }
  | { type: 'SET_ROOM_HEADER'; header: RoomHeaderMessage }
  | { type: 'SET_SHARD_STATE'; state: ShardState; collapseTimer?: number }
  | { type: 'SET_CONNECTION_STATUS'; status: AppState['connectionStatus'] }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'ADD_SOUND_CUE'; cue: SoundCue }
  | { type: 'SET_COMBAT_STATE'; inCombat: boolean }
  | { type: 'SET_COMBAT_TICK'; tick: number }
  | { type: 'SET_ENEMY_STATUS'; status: EnemyStatus | null }
  | { type: 'SET_PENDING_COMBAT_ACTION'; action: CombatAction | null }
  | { type: 'SET_COLLAPSE_TIMER'; timer: number | null }
  | { type: 'SET_INVENTORY'; items: InventoryItem[] };

const MAX_MESSAGES = 500;

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return { ...state, authenticated: true, token: action.token, playerId: action.playerId, error: null };
    case 'LOGOUT':
      return { ...initialState };
    case 'SET_ROOM':
      return { ...state, room: action.room, connectionStatus: 'connected' };
    case 'ADD_MESSAGE': {
      const messages = [...state.messages, action.message];
      return { ...state, messages: messages.length > MAX_MESSAGES ? messages.slice(messages.length - MAX_MESSAGES) : messages };
    }
    case 'SET_ROOM_HEADER':
      return { ...state, roomHeader: action.header };
    case 'SET_SHARD_STATE': {
      const timer = action.collapseTimer ?? null;
      const maxTimer = timer != null && (state.collapseTimerMax == null || timer > state.collapseTimerMax) ? timer : state.collapseTimerMax;
      return { ...state, shardState: action.state, collapseTimer: timer, collapseTimerMax: maxTimer };
    }
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
    case 'SET_COLLAPSE_TIMER':
      return { ...state, collapseTimer: action.timer };
    case 'SET_INVENTORY':
      return { ...state, inventory: action.items };
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

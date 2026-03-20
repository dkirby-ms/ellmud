/**
 * App state — minimal React context store.
 * The server is the source of truth; we only track UI-relevant state.
 */

import { createContext, useContext } from 'react';
import type { Room } from '@colyseus/sdk';
import type { NarrationType, RoomHeaderMessage, ShardState } from '@ellmud/shared';

// ─── Message types for terminal display ──────────────────────────────────────

export interface TerminalMessage {
  id: string;
  text: string;
  type: NarrationType | 'header' | 'combat';
  timestamp: number;
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
};

// ─── Actions ─────────────────────────────────────────────────────────────────

export type AppAction =
  | { type: 'LOGIN_SUCCESS'; token: string; playerId: string }
  | { type: 'LOGOUT' }
  | { type: 'SET_ROOM'; room: Room }
  | { type: 'ADD_MESSAGE'; message: TerminalMessage }
  | { type: 'SET_ROOM_HEADER'; header: RoomHeaderMessage }
  | { type: 'SET_SHARD_STATE'; state: ShardState }
  | { type: 'SET_CONNECTION_STATUS'; status: AppState['connectionStatus'] }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' };

const MAX_MESSAGES = 500;

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        authenticated: true,
        token: action.token,
        playerId: action.playerId,
        error: null,
      };
    case 'LOGOUT':
      return { ...initialState };
    case 'SET_ROOM':
      return { ...state, room: action.room, connectionStatus: 'connected' };
    case 'ADD_MESSAGE': {
      const messages = [...state.messages, action.message];
      return {
        ...state,
        messages: messages.length > MAX_MESSAGES
          ? messages.slice(messages.length - MAX_MESSAGES)
          : messages,
      };
    }
    case 'SET_ROOM_HEADER':
      return { ...state, roomHeader: action.header };
    case 'SET_SHARD_STATE':
      return { ...state, shardState: action.state };
    case 'SET_CONNECTION_STATUS':
      return { ...state, connectionStatus: action.status };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
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

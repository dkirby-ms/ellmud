/**
 * Connection store — server connectivity lifecycle and room reference.
 */

import type { Room } from '@colyseus/sdk';
import { createStore } from './createStore.js';

// ─── State ───────────────────────────────────────────────────────────────────

export interface ConnectionState {
  room: Room | null;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  error: string | null;
}

export const initialConnectionState: ConnectionState = {
  room: null,
  connectionStatus: 'disconnected',
  error: null,
};

// ─── Actions ─────────────────────────────────────────────────────────────────

export type ConnectionAction =
  | { type: 'SET_ROOM'; room: Room | null }
  | { type: 'SET_CONNECTION_STATUS'; status: ConnectionState['connectionStatus'] }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' };

// ─── Reducer ─────────────────────────────────────────────────────────────────

export function connectionReducer(state: ConnectionState, action: ConnectionAction): ConnectionState {
  switch (action.type) {
    case 'SET_ROOM':
      return action.room
        ? { ...state, room: action.room, connectionStatus: 'connected' }
        : { ...state, room: null, connectionStatus: 'disconnected' };
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

// ─── Store ───────────────────────────────────────────────────────────────────

export const useConnectionStore = createStore('connection', initialConnectionState, connectionReducer);

// ─── Test Helpers ────────────────────────────────────────────────────────────

export function resetConnectionStore(): void {
  useConnectionStore.setState({ ...initialConnectionState });
}

export function initializeConnectionStore(partial: Partial<ConnectionState>): void {
  useConnectionStore.setState({ ...initialConnectionState, ...partial });
}

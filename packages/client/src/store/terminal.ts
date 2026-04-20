/**
 * Terminal store — messages, sound cues, room header, zone state.
 */

import type { RoomHeaderMessage, ZoneState, NarrationType } from '@ellmud/shared';
import { createStore } from './createStore.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TerminalMessage {
  id: string;
  text: string;
  type: NarrationType | 'header' | 'combat';
  timestamp: number;
  combatSubtype?: 'hit_dealt' | 'hit_taken' | 'dodge' | 'defeated' | 'flee' | 'combat_end';
}

export interface SoundCue {
  id: string;
  text: string;
  timestamp: number;
}

// ─── State ───────────────────────────────────────────────────────────────────

export interface TerminalState {
  messages: TerminalMessage[];
  soundCues: SoundCue[];
  roomHeader: RoomHeaderMessage | null;
  zoneState: ZoneState | null;
}

export const initialTerminalState: TerminalState = {
  messages: [],
  soundCues: [],
  roomHeader: null,
  zoneState: null,
};

// ─── Actions ─────────────────────────────────────────────────────────────────

export type TerminalAction =
  | { type: 'ADD_MESSAGE'; message: TerminalMessage }
  | { type: 'CLEAR_MESSAGES' }
  | { type: 'ADD_SOUND_CUE'; cue: SoundCue }
  | { type: 'SET_ROOM_HEADER'; header: RoomHeaderMessage }
  | { type: 'SET_ZONE_STATE'; state: ZoneState };

// ─── Reducer ─────────────────────────────────────────────────────────────────

const MAX_MESSAGES = 500;
const MAX_SOUND_CUES = 20;

export function terminalReducer(state: TerminalState, action: TerminalAction): TerminalState {
  switch (action.type) {
    case 'ADD_MESSAGE': {
      const messages = [...state.messages, action.message];
      return {
        ...state,
        messages: messages.length > MAX_MESSAGES
          ? messages.slice(messages.length - MAX_MESSAGES)
          : messages,
      };
    }
    case 'CLEAR_MESSAGES':
      return { ...state, messages: [] };
    case 'ADD_SOUND_CUE': {
      const cues = [...state.soundCues, action.cue];
      return {
        ...state,
        soundCues: cues.length > MAX_SOUND_CUES
          ? cues.slice(cues.length - MAX_SOUND_CUES)
          : cues,
      };
    }
    case 'SET_ROOM_HEADER':
      return { ...state, roomHeader: action.header };
    case 'SET_ZONE_STATE':
      return { ...state, zoneState: action.state };
    default:
      return state;
  }
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useTerminalStore = createStore('terminal', initialTerminalState, terminalReducer);

// ─── Test Helpers ────────────────────────────────────────────────────────────

export function resetTerminalStore(): void {
  useTerminalStore.setState({ ...initialTerminalState });
}

export function initializeTerminalStore(partial: Partial<TerminalState>): void {
  useTerminalStore.setState({ ...initialTerminalState, ...partial });
}

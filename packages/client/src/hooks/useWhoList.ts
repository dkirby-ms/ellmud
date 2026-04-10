/**
 * useWhoList — fetches the server-wide player list via Colyseus messaging.
 *
 * Sends REQUEST_PLAYER_LIST when requested, listens for PLAYER_LIST response.
 * Auto-requests on first call when `autoRequest` is true.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppContext } from '../store.js';
import { sendRequestPlayerList } from '../services/connection.js';
import { MessageTypes, type PlayerListEntry } from '@ellmud/shared';

export interface UseWhoListReturn {
  players: PlayerListEntry[];
  loading: boolean;
  refresh: () => void;
}

export function useWhoList(active: boolean): UseWhoListReturn {
  const { state } = useAppContext();
  const [players, setPlayers] = useState<PlayerListEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const requestedRef = useRef(false);

  const refresh = useCallback(() => {
    if (!state.room) return;
    setLoading(true);
    sendRequestPlayerList(state.room);
  }, [state.room]);

  // Auto-request when the modal opens
  useEffect(() => {
    if (active && state.room && !requestedRef.current) {
      requestedRef.current = true;
      refresh();
    }
    if (!active) {
      requestedRef.current = false;
    }
  }, [active, state.room, refresh]);

  // Listen for PLAYER_LIST response
  useEffect(() => {
    const room = state.room;
    if (!room) return;

    const handler = (msg: { players: PlayerListEntry[] }) => {
      setPlayers(msg.players ?? []);
      setLoading(false);
    };

    room.onMessage(MessageTypes.PLAYER_LIST, handler);

    // Colyseus SDK doesn't expose an offMessage — cleanup handled by room leave
  }, [state.room]);

  return { players, loading, refresh };
}

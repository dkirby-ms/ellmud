/**
 * useWhoList — fetches the server-wide player list via Colyseus messaging.
 *
 * Sends REQUEST_PLAYER_LIST when requested, listens for PLAYER_LIST response.
 * Auto-requests on first call when `autoRequest` is true.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useConnectionStore } from '../store/connection.js';
import { sendRequestPlayerList } from '../services/connection.js';
import { MessageTypes, type PlayerListEntry } from '@ellmud/shared';

export interface UseWhoListReturn {
  players: PlayerListEntry[];
  loading: boolean;
  refresh: () => void;
}

export function useWhoList(active: boolean): UseWhoListReturn {
  const room = useConnectionStore(s => s.room);
  const [players, setPlayers] = useState<PlayerListEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const requestedRef = useRef(false);

  const refresh = useCallback(() => {
    if (!room) return;
    setLoading(true);
    sendRequestPlayerList(room);
  }, [room]);

  // Auto-request when the modal opens
  useEffect(() => {
    if (active && room && !requestedRef.current) {
      requestedRef.current = true;
      refresh();
    }
    if (!active) {
      requestedRef.current = false;
    }
  }, [active, room, refresh]);

  // Listen for PLAYER_LIST response
  useEffect(() => {
    if (!room) return;

    const handler = (msg: { players: PlayerListEntry[] }) => {
      setPlayers(msg.players ?? []);
      setLoading(false);
    };

    room.onMessage(MessageTypes.PLAYER_LIST, handler);

    // Colyseus SDK doesn't expose an offMessage — cleanup handled by room leave
  }, [room]);

  return { players, loading, refresh };
}

/**
 * useFlags — manages character flag toggles (Anon, RP).
 *
 * Flags are character-level and stored server-side in character_flags.
 * This hook provides optimistic localStorage caching and sends
 * TOGGLE_FLAG messages to the server via the Colyseus room when available.
 */

import { useState, useCallback } from 'react';
import { useAppContext } from '../store.js';
import { sendToggleFlag } from '../services/connection.js';
import type { UserFlagType } from '@ellmud/shared';

const LS_FLAG_ANON = 'ellmud_flag_anon';
const LS_FLAG_RP = 'ellmud_flag_rp';

export interface FlagState {
  anon: boolean;
  rp: boolean;
}

function loadFromLocalStorage(): FlagState {
  return {
    anon: localStorage.getItem(LS_FLAG_ANON) === 'true',
    rp: localStorage.getItem(LS_FLAG_RP) === 'true',
  };
}

function writeToLocalStorage(flags: FlagState): void {
  localStorage.setItem(LS_FLAG_ANON, String(flags.anon));
  localStorage.setItem(LS_FLAG_RP, String(flags.rp));
}

export interface UseFlagsReturn {
  flags: FlagState;
  toggleFlag: (flag: UserFlagType, enabled: boolean) => void;
}

export function useFlags(): UseFlagsReturn {
  const { state } = useAppContext();
  const [flags, setFlags] = useState<FlagState>(loadFromLocalStorage);

  const toggleFlag = useCallback(
    (flag: UserFlagType, enabled: boolean) => {
      setFlags((prev) => {
        const next: FlagState = { ...prev, [flag]: enabled };
        writeToLocalStorage(next);
        return next;
      });

      // Send to server if connected to a room
      if (state.room) {
        sendToggleFlag(state.room, { flag, enabled });
      }
    },
    [state.room],
  );

  return { flags, toggleFlag };
}

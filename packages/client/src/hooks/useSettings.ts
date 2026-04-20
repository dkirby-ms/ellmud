/**
 * useSettings — syncs user settings between localStorage (fast) and server (authoritative).
 *
 * On mount: loads from localStorage instantly, then fetches from server if authenticated.
 * On change: writes to localStorage (optimistic) AND sends PUT to server.
 * On token change (login): fetches from server and merges.
 * On logout: keeps localStorage cache so settings survive being logged out.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '../store/auth.js';
import { fetchUserSettings, updateUserSettings } from '../services/settings-api.js';
import type { UserSettingsConfig } from '../services/settings-api.js';

// ─── localStorage keys & defaults ────────────────────────────────────────────

const LS_FONT_SIZE = 'ellmud_fontSize';
const LS_VERBOSITY = 'ellmud_verbosity';
const LS_NARRATION_STYLE = 'ellmud_narrationStyle';

export interface ResolvedSettings {
  display: { fontSize: number };
  narration: { verbosity: string; narrationStyle: string };
}

const DEFAULTS: ResolvedSettings = {
  display: { fontSize: 16 },
  narration: { verbosity: 'standard', narrationStyle: 'default' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function loadFromLocalStorage(): ResolvedSettings {
  return {
    display: {
      fontSize: Number(localStorage.getItem(LS_FONT_SIZE) ?? DEFAULTS.display.fontSize),
    },
    narration: {
      verbosity: localStorage.getItem(LS_VERBOSITY) ?? DEFAULTS.narration.verbosity,
      narrationStyle: localStorage.getItem(LS_NARRATION_STYLE) ?? DEFAULTS.narration.narrationStyle,
    },
  };
}

function writeToLocalStorage(settings: ResolvedSettings): void {
  localStorage.setItem(LS_FONT_SIZE, String(settings.display.fontSize));
  localStorage.setItem(LS_VERBOSITY, settings.narration.verbosity);
  localStorage.setItem(LS_NARRATION_STYLE, settings.narration.narrationStyle);
}

/** Merge a partial server config onto resolved settings. Server wins. */
function mergeServerConfig(local: ResolvedSettings, config: UserSettingsConfig): ResolvedSettings {
  return {
    display: {
      fontSize: config.display?.fontSize ?? local.display.fontSize,
    },
    narration: {
      verbosity: config.narration?.verbosity ?? local.narration.verbosity,
      narrationStyle: config.narration?.narrationStyle ?? local.narration.narrationStyle,
    },
  };
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export interface UseSettingsReturn {
  settings: ResolvedSettings;
  updateSetting: (category: 'display' | 'narration', key: string, value: string | number) => void;
  isLoading: boolean;
  isSynced: boolean;
}

export function useSettings(): UseSettingsReturn {
  const token = useAuthStore(s => s.token);

  const [settings, setSettings] = useState<ResolvedSettings>(loadFromLocalStorage);
  const [isLoading, setIsLoading] = useState(false);
  const [isSynced, setIsSynced] = useState(false);

  // Track token to detect login transitions
  const prevTokenRef = useRef<string | null>(null);

  // Fetch from server when token becomes available
  useEffect(() => {
    // Only fetch when we transition to having a token
    if (!token) {
      prevTokenRef.current = null;
      return;
    }

    // Already fetched for this token
    if (prevTokenRef.current === token) return;
    prevTokenRef.current = token;

    let cancelled = false;
    setIsLoading(true);
    setIsSynced(false);

    fetchUserSettings(token)
      .then((res) => {
        if (cancelled) return;
        const merged = mergeServerConfig(loadFromLocalStorage(), res.config);
        setSettings(merged);
        writeToLocalStorage(merged);
        setIsSynced(true);
      })
      .catch(() => {
        // Server unreachable — keep localStorage values
        if (!cancelled) setIsSynced(false);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [token]);

  const updateSetting = useCallback(
    (category: 'display' | 'narration', key: string, value: string | number) => {
      setSettings((prev) => {
        const next: ResolvedSettings = {
          ...prev,
          [category]: {
            ...prev[category],
            [key]: value,
          },
        };

        // Optimistic: write to localStorage immediately
        writeToLocalStorage(next);

        // Fire-and-forget PUT to server (don't block UI)
        if (token) {
          const patch: UserSettingsConfig = {
            [category]: { [key]: value },
          };
          updateUserSettings(token, patch).catch(() => {
            // Server error — localStorage still has the value
          });
        }

        return next;
      });
    },
    [token],
  );

  return { settings, updateSetting, isLoading, isSynced };
}

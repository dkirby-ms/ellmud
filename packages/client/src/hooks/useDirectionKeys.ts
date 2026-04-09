/**
 * useDirectionKeys — Global keyboard shortcut hook for directional movement.
 *
 * Maps arrow keys, PageUp/PageDown, and numpad keys to movement commands.
 * Only fires when the command input does NOT have focus so that arrow keys
 * still work for text editing / command history.
 */

import { useEffect, useCallback } from 'react';

/** Maps keyboard events to direction names. */
const KEY_DIRECTION_MAP: Record<string, string> = {
  // Arrow keys
  ArrowUp: 'north',
  ArrowDown: 'south',
  ArrowLeft: 'west',
  ArrowRight: 'east',
  // Page keys
  PageUp: 'up',
  PageDown: 'down',
};

/** Numpad key codes (event.code) — cardinal only, no ordinals. */
const NUMPAD_DIRECTION_MAP: Record<string, string> = {
  Numpad8: 'north',
  Numpad2: 'south',
  Numpad4: 'west',
  Numpad6: 'east',
  Numpad9: 'up',
  Numpad3: 'down',
};

/** Numpad5 is explicitly a no-op. */
const NUMPAD_NOOP = 'Numpad5';

interface UseDirectionKeysOptions {
  /** Callback that sends a movement command (e.g. handleExitClick). */
  onMove: (direction: string) => void;
  /** Ref to the command input element — shortcuts are suppressed when it has focus. */
  inputRef: React.RefObject<HTMLInputElement | null>;
  /** Whether the connection is active (don't send moves while disconnected). */
  enabled: boolean;
}

export function useDirectionKeys({ onMove, inputRef: _inputRef, enabled }: UseDirectionKeysOptions): void {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Don't intercept when a text input/textarea has focus
      const active = document.activeElement;
      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        (active instanceof HTMLElement && active.isContentEditable)
      ) {
        return;
      }

      // Numpad5 — explicit no-op
      if (e.code === NUMPAD_NOOP) {
        e.preventDefault();
        return;
      }

      // Check numpad first (by code), then regular keys (by key)
      const direction =
        NUMPAD_DIRECTION_MAP[e.code] ?? KEY_DIRECTION_MAP[e.key];

      if (direction) {
        e.preventDefault();
        onMove(direction);
      }
    },
    [onMove, enabled],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

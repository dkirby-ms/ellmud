/**
 * ReconnectionOverlay — Full-screen overlay for WebSocket connection states.
 * Styled with Tailwind to match the dark Ellmud theme.
 */

import { useState, useEffect, useRef } from 'react';
import type { OverlayState } from '../hooks/useReconnection.js';

export interface ReconnectionOverlayProps {
  state: OverlayState;
  attempt?: number;
  maxAttempts?: number;
  elapsedSeconds?: number;
  onReconnect?: () => void;
  onCancel?: () => void;
  onReturnToHub?: () => void;
}

export function ReconnectionOverlay({
  state,
  attempt = 0,
  maxAttempts = 5,
  elapsedSeconds = 0,
  onReconnect,
  onCancel,
  onReturnToHub,
}: ReconnectionOverlayProps): React.JSX.Element | null {
  const [dismissed, setDismissed] = useState(false);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (state === 'reconnected') {
      setDismissed(false);
      dismissTimer.current = setTimeout(() => setDismissed(true), 2000);
    } else {
      setDismissed(false);
    }
    return () => {
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
        dismissTimer.current = null;
      }
    };
  }, [state]);

  if (state === 'hidden' || dismissed) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80"
      role="dialog"
      aria-modal="true"
      aria-label="Connection status"
      aria-live="assertive"
    >
      <div className="bg-bg-panel border border-border-muted rounded-lg p-8 max-w-sm w-full mx-4 text-center shadow-2xl">
        {state === 'disconnected' && (
          <>
            <div className="text-4xl mb-4" aria-hidden="true">⚠</div>
            <h2
              className="text-warning text-lg mb-2 font-serif"
            >
              Connection Lost
            </h2>
            <p
              className="text-text-secondary text-sm mb-6 font-sans"
            >
              Attempt {attempt} of {maxAttempts}
            </p>
            <div className="flex gap-3">
              <button
                onClick={onReconnect}
                type="button"
                className="flex-1 bg-accent-gold hover:bg-accent-gold/90 text-bg-primary font-medium py-2 rounded transition-colors font-sans"
              >
                Reconnect Now
              </button>
              <button
                onClick={onReturnToHub}
                type="button"
                className="flex-1 border border-border-muted hover:bg-bg-elevated text-text-secondary py-2 rounded transition-colors font-sans"
              >
                Return to Hub
              </button>
            </div>
          </>
        )}

        {state === 'reconnecting' && (
          <>
            <div className="w-8 h-8 border-2 border-accent-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" aria-hidden="true" />
            <h2
              className="text-accent-gold text-lg mb-2 font-serif"
            >
              Reconnecting…
            </h2>
            <div className="h-2 bg-bg-elevated rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-accent-gold transition-all duration-300"
                style={{ width: `${maxAttempts > 0 ? Math.min((attempt / maxAttempts) * 100, 100) : 0}%` }}
              />
            </div>
            <p
              className="text-text-secondary text-sm mb-4 font-sans"
            >
              Attempt {attempt} of {maxAttempts} · {elapsedSeconds}s elapsed
            </p>
            <button
              onClick={onCancel}
              type="button"
              className="border border-border-muted hover:bg-bg-elevated text-text-secondary px-6 py-2 rounded transition-colors font-sans"
            >
              Cancel
            </button>
          </>
        )}

        {state === 'reconnected' && (
          <>
            <div className="text-4xl mb-4 text-success" aria-hidden="true">✓</div>
            <h2
              className="text-success text-lg font-serif"
            >
              Connection Restored
            </h2>
          </>
        )}
      </div>
    </div>
  );
}

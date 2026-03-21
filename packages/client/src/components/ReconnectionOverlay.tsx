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
  onReturnToRefuge?: () => void;
}

export function ReconnectionOverlay({
  state,
  attempt = 0,
  maxAttempts = 5,
  elapsedSeconds = 0,
  onReconnect,
  onCancel,
  onReturnToRefuge,
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
      <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-8 max-w-sm w-full mx-4 text-center shadow-2xl">
        {state === 'disconnected' && (
          <>
            <div className="text-4xl mb-4" aria-hidden="true">⚠</div>
            <h2
              className="text-[#B8860B] text-lg mb-2"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              Connection Lost
            </h2>
            <p
              className="text-[#8A8B95] text-sm mb-6"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              Attempt {attempt} of {maxAttempts}
            </p>
            <div className="flex gap-3">
              <button
                onClick={onReconnect}
                type="button"
                className="flex-1 bg-[#C9A84C] hover:bg-[#B89840] text-[#0A0B0F] font-medium py-2 rounded transition-colors"
                style={{ fontFamily: 'var(--font-sans)' }}
              >
                Reconnect Now
              </button>
              <button
                onClick={onReturnToRefuge}
                type="button"
                className="flex-1 border border-[#2A2B35] hover:bg-[#1C1D27] text-[#8A8B95] py-2 rounded transition-colors"
                style={{ fontFamily: 'var(--font-sans)' }}
              >
                Return to Refuge
              </button>
            </div>
          </>
        )}

        {state === 'reconnecting' && (
          <>
            <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin mx-auto mb-4" aria-hidden="true" />
            <h2
              className="text-[#C9A84C] text-lg mb-2"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              Reconnecting…
            </h2>
            <div className="h-2 bg-[#1C1D27] rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-[#C9A84C] transition-all duration-300"
                style={{ width: `${maxAttempts > 0 ? Math.min((attempt / maxAttempts) * 100, 100) : 0}%` }}
              />
            </div>
            <p
              className="text-[#8A8B95] text-sm mb-4"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              Attempt {attempt} of {maxAttempts} · {elapsedSeconds}s elapsed
            </p>
            <button
              onClick={onCancel}
              type="button"
              className="border border-[#2A2B35] hover:bg-[#1C1D27] text-[#8A8B95] px-6 py-2 rounded transition-colors"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              Cancel
            </button>
          </>
        )}

        {state === 'reconnected' && (
          <>
            <div className="text-4xl mb-4 text-[#2D6B4F]" aria-hidden="true">✓</div>
            <h2
              className="text-[#2D6B4F] text-lg"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              Connection Restored
            </h2>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * ReconnectionOverlay — Full-screen overlay for WebSocket connection states.
 *
 * Three visual states:
 * 1. Disconnected — warning icon, attempt counter, reconnect/return buttons
 * 2. Reconnecting — spinner, progress bar, elapsed time, cancel button
 * 3. Reconnected — checkmark, auto-dismiss after 2s
 */

import { useState, useEffect, useRef } from 'react';

export type OverlayState = 'disconnected' | 'reconnecting' | 'reconnected' | 'hidden';

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

  // Auto-dismiss on reconnected after 2s
  useEffect(() => {
    if (state === 'reconnected') {
      setDismissed(false);
      dismissTimer.current = setTimeout(() => {
        setDismissed(true);
      }, 2000);
    } else {
      setDismissed(false);
    }
    return () => {
      if (dismissTimer.current) { clearTimeout(dismissTimer.current); dismissTimer.current = null; }
    };
  }, [state]);

  if (state === 'hidden' || dismissed) return null;

  return (
    <div
      className="reconnect-overlay reconnect-overlay--visible"
      role="dialog"
      aria-modal="true"
      aria-label="Connection status"
      aria-live="assertive"
    >
      <div className="reconnect-card">
        {state === 'disconnected' && (
          <DisconnectedContent
            attempt={attempt}
            maxAttempts={maxAttempts}
            onReconnect={onReconnect}
            onReturnToRefuge={onReturnToRefuge}
          />
        )}
        {state === 'reconnecting' && (
          <ReconnectingContent
            attempt={attempt}
            maxAttempts={maxAttempts}
            elapsedSeconds={elapsedSeconds}
            onCancel={onCancel}
          />
        )}
        {state === 'reconnected' && <ReconnectedContent />}
      </div>
    </div>
  );
}

/* ─── Disconnected State ──────────────────────────────────────────────────── */

function DisconnectedContent({
  attempt,
  maxAttempts,
  onReconnect,
  onReturnToRefuge,
}: {
  attempt: number;
  maxAttempts: number;
  onReconnect?: () => void;
  onReturnToRefuge?: () => void;
}): React.JSX.Element {
  return (
    <>
      <div className="reconnect-icon reconnect-icon--warning" aria-hidden="true">⚠</div>
      <h2 className="reconnect-title reconnect-title--disconnected">Connection Lost</h2>
      <p className="reconnect-subtitle">
        Attempt {attempt} of {maxAttempts}
      </p>
      <div className="reconnect-actions">
        <button
          className="reconnect-btn reconnect-btn--primary"
          onClick={onReconnect}
          type="button"
          aria-label="Reconnect now"
        >
          Reconnect Now
        </button>
        <button
          className="reconnect-btn reconnect-btn--secondary"
          onClick={onReturnToRefuge}
          type="button"
          aria-label="Return to Refuge"
        >
          Return to Refuge
        </button>
      </div>
    </>
  );
}

/* ─── Reconnecting State ──────────────────────────────────────────────────── */

function ReconnectingContent({
  attempt,
  maxAttempts,
  elapsedSeconds,
  onCancel,
}: {
  attempt: number;
  maxAttempts: number;
  elapsedSeconds: number;
  onCancel?: () => void;
}): React.JSX.Element {
  const progress = maxAttempts > 0 ? Math.min((attempt / maxAttempts) * 100, 100) : 0;

  return (
    <>
      <div className="reconnect-spinner" aria-hidden="true" />
      <h2 className="reconnect-title reconnect-title--reconnecting">Reconnecting…</h2>
      <div className="reconnect-progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
        <div className="reconnect-progress__fill" style={{ width: `${progress}%` }} />
      </div>
      <p className="reconnect-subtitle">
        Attempt {attempt} of {maxAttempts} · {elapsedSeconds}s elapsed
      </p>
      <div className="reconnect-actions">
        <button
          className="reconnect-btn reconnect-btn--cancel"
          onClick={onCancel}
          type="button"
          aria-label="Cancel reconnection"
        >
          Cancel
        </button>
      </div>
    </>
  );
}

/* ─── Reconnected State ───────────────────────────────────────────────────── */

function ReconnectedContent(): React.JSX.Element {
  return (
    <>
      <div className="reconnect-icon reconnect-icon--success" aria-hidden="true">✓</div>
      <h2 className="reconnect-title reconnect-title--reconnected">Connection Restored</h2>
    </>
  );
}

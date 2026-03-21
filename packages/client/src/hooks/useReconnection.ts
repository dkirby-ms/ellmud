/**
 * useReconnection — Hook managing automatic reconnection with exponential backoff.
 *
 * Tracks connection state, attempt count, elapsed time, and provides
 * imperative controls (reconnectNow, cancel) for the overlay.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import type { OverlayState } from '../components/ReconnectionOverlay.js';

export interface UseReconnectionOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  onReconnect: () => Promise<boolean>;
  onReturnToRefuge?: () => void;
}

export interface UseReconnectionResult {
  overlayState: OverlayState;
  attempt: number;
  elapsedSeconds: number;
  /** Call when connection is lost */
  reportDisconnect: () => void;
  /** Call when connection is re-established */
  reportConnected: () => void;
  /** Immediately try to reconnect */
  reconnectNow: () => void;
  /** Cancel automatic reconnection */
  cancel: () => void;
  /** Return to refuge (leave shard) */
  returnToRefuge: () => void;
}

export function useReconnection({
  maxAttempts = 5,
  baseDelayMs = 2000,
  onReconnect,
  onReturnToRefuge,
}: UseReconnectionOptions): UseReconnectionResult {
  const [overlayState, setOverlayState] = useState<OverlayState>('hidden');
  const [attempt, setAttempt] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelled = useRef(false);
  const reconnecting = useRef(false);

  const clearTimers = useCallback(() => {
    if (retryTimer.current) { clearTimeout(retryTimer.current); retryTimer.current = null; }
    if (elapsedTimer.current) { clearInterval(elapsedTimer.current); elapsedTimer.current = null; }
  }, []);

  const startElapsedCounter = useCallback(() => {
    setElapsedSeconds(0);
    elapsedTimer.current = setInterval(() => {
      setElapsedSeconds(s => s + 1);
    }, 1000);
  }, []);

  const attemptReconnect = useCallback(async (currentAttempt: number) => {
    if (cancelled.current || reconnecting.current) return;
    if (currentAttempt > maxAttempts) {
      setOverlayState('disconnected');
      setAttempt(maxAttempts);
      clearTimers();
      return;
    }

    reconnecting.current = true;
    setOverlayState('reconnecting');
    setAttempt(currentAttempt);

    try {
      const success = await onReconnect();
      reconnecting.current = false;

      if (success) {
        clearTimers();
        setOverlayState('reconnected');
        return;
      }
    } catch {
      reconnecting.current = false;
    }

    if (cancelled.current) return;

    // Exponential backoff: 2s, 4s, 8s, 16s, 32s
    const delay = Math.min(baseDelayMs * Math.pow(2, currentAttempt - 1), 30000);
    setOverlayState('disconnected');

    retryTimer.current = setTimeout(() => {
      if (!cancelled.current) {
        attemptReconnect(currentAttempt + 1);
      }
    }, delay);
  }, [maxAttempts, baseDelayMs, onReconnect, clearTimers]);

  const reportDisconnect = useCallback(() => {
    cancelled.current = false;
    reconnecting.current = false;
    setAttempt(1);
    setOverlayState('reconnecting');
    startElapsedCounter();
    attemptReconnect(1);
  }, [attemptReconnect, startElapsedCounter]);

  const reportConnected = useCallback(() => {
    cancelled.current = false;
    reconnecting.current = false;
    clearTimers();
    if (overlayState !== 'hidden') {
      setOverlayState('reconnected');
    }
  }, [clearTimers, overlayState]);

  const reconnectNow = useCallback(() => {
    cancelled.current = false;
    reconnecting.current = false;
    clearTimers();
    startElapsedCounter();
    setAttempt(prev => prev + 1);
    attemptReconnect(attempt + 1);
  }, [clearTimers, startElapsedCounter, attemptReconnect, attempt]);

  const cancel = useCallback(() => {
    cancelled.current = true;
    reconnecting.current = false;
    clearTimers();
    setOverlayState('disconnected');
  }, [clearTimers]);

  const returnToRefuge = useCallback(() => {
    cancelled.current = true;
    reconnecting.current = false;
    clearTimers();
    setOverlayState('hidden');
    onReturnToRefuge?.();
  }, [clearTimers, onReturnToRefuge]);

  // Cleanup on unmount
  useEffect(() => clearTimers, [clearTimers]);

  return {
    overlayState,
    attempt,
    elapsedSeconds,
    reportDisconnect,
    reportConnected,
    reconnectNow,
    cancel,
    returnToRefuge,
  };
}

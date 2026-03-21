/**
 * LoadingTransitions — Loading overlays and transition banners.
 *
 * Components:
 * 1. RoomTransitionLoader — Full-screen overlay for room-to-room transitions (300ms min)
 * 2. ShardEntryLoader — Full-screen overlay for shard entry
 * 3. CombatInitiationBanner — Top banner slide-in for combat start
 * 1. RoomTransitionLoader — Full-screen overlay for room-to-room transitions (300-500ms min)
 * 2. ShardEntryLoader — Full-screen overlay for shard entry (dismissed on first room)
 * 3. CombatInitiationBanner — Top banner slide-in for combat start (no full overlay)
 * 4. LongRunningIndicator — Cancel button shown after 5s elapsed
 */

import { useState, useEffect, useRef } from 'react';

/* ─── Room Transition Loader ──────────────────────────────────────────────── */

export interface RoomTransitionLoaderProps {
  active: boolean;
}

const MIN_DISPLAY_MS = 300;

export function RoomTransitionLoader({ active }: RoomTransitionLoaderProps): React.JSX.Element | null {
  const [visible, setVisible] = useState(false);
  const showTime = useRef<number>(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (active) {
      showTime.current = Date.now();
      setVisible(true);
      if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; }
    } else if (visible) {
      const elapsed = Date.now() - showTime.current;
      const remaining = Math.max(MIN_DISPLAY_MS - elapsed, 0);
      hideTimer.current = setTimeout(() => {
        setVisible(false);
        hideTimer.current = null;
      }, remaining);
    }
    return () => {
      if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; }
    };
  }, [active]);

  if (!visible) return null;

  return (
    <div className="room-transition loading-overlay" role="status" aria-label="Room transition loading">
      <div className="loading-card">
        <div className="spinner" aria-hidden="true" />
        <p className="loading-text">Transitioning…</p>
      </div>
    </div>
  );
}

/* ─── Shard Entry Loader ──────────────────────────────────────────────────── */

export interface ShardEntryLoaderProps {
  active: boolean;
  onFirstRoom?: () => void;
}

export function ShardEntryLoader({ active }: ShardEntryLoaderProps): React.JSX.Element | null {
  if (!active) return null;

  return (
    <div className="shard-entry-loader loading-overlay" role="status" aria-label="Entering shard">
      <div className="loading-card">
        <div className="spinner" aria-hidden="true" />
        <p className="loading-text loading-text--gold">Entering shard…</p>
      </div>
    </div>
  );
}

/* ─── Combat Initiation Banner ────────────────────────────────────────────── */

export interface CombatInitiationBannerProps {
  active: boolean;
}

export function CombatInitiationBanner({ active }: CombatInitiationBannerProps): React.JSX.Element | null {
  const [visible, setVisible] = useState(false);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (active) {
      setVisible(true);
      dismissTimer.current = setTimeout(() => {
        setVisible(false);
      }, 2000);
    } else {
      setVisible(false);
    }
    return () => {
      if (dismissTimer.current) { clearTimeout(dismissTimer.current); dismissTimer.current = null; }
    };
  }, [active]);

  if (!visible) return null;

  return (
    <div className="combat-initiation banner-slide-in" role="alert" aria-label="Combat initiated">
      <span className="combat-initiation__text">⚔ COMBAT</span>
    </div>
  );
}

/* ─── Long-Running Indicator ──────────────────────────────────────────────── */

const LONG_RUNNING_THRESHOLD_MS = 5000;

export interface LongRunningIndicatorProps {
  elapsedMs: number;
  onCancel: () => void;
}

export function LongRunningIndicator({ elapsedMs, onCancel }: LongRunningIndicatorProps): React.JSX.Element {
  const showCancel = elapsedMs >= LONG_RUNNING_THRESHOLD_MS;

  return (
    <div className="long-running">
      {showCancel && (
        <button
          className="long-running__cancel"
          onClick={onCancel}
          type="button"
          aria-label="Cancel loading"
        >
          Cancel
        </button>
      )}
    </div>
  );
}

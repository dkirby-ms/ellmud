import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppContext } from '../store.js';
import { sendRawCommand } from '../services/connection.js';
import type { CombatAction } from '@ellmud/shared';

interface ActionButton {
  label: string;
  action: CombatAction;
  key: string;
  superscript: string;
}

const COMBAT_ACTIONS: ActionButton[] = [
  { label: 'Strike', action: 'strike', key: '1', superscript: '¹' },
  { label: 'Heavy Strike', action: 'heavy_strike', key: '2', superscript: '²' },
  { label: 'Dodge', action: 'dodge', key: '3', superscript: '³' },
  { label: 'Block', action: 'block', key: '4', superscript: '⁴' },
  { label: 'Use Item', action: 'use_item', key: '5', superscript: '⁵' },
  { label: 'Skill', action: 'skill', key: '6', superscript: '⁶' },
  { label: 'Flee', action: 'flee', key: '7', superscript: '⁷' },
  { label: 'Observe', action: 'observe', key: '8', superscript: '⁸' },
];

const TICK_DURATION_MS = 1000;

export function CombatOverlay(): React.JSX.Element | null {
  const { state, dispatch } = useAppContext();
  const [tickProgress, setTickProgress] = useState(1);
  const [visible, setVisible] = useState(false);
  const animFrameRef = useRef<number>(0);
  const tickStartRef = useRef<number>(Date.now());

  useEffect(() => {
    if (state.inCombat) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [state.inCombat]);

  useEffect(() => {
    if (!state.inCombat) return;
    tickStartRef.current = Date.now();
    setTickProgress(1);

    function animate() {
      const elapsed = Date.now() - tickStartRef.current;
      const remaining = Math.max(0, 1 - elapsed / TICK_DURATION_MS);
      setTickProgress(remaining);
      if (remaining > 0) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    }

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [state.inCombat, state.combatTick]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!state.inCombat) return;
    const idx = parseInt(e.key, 10);
    if (idx >= 1 && idx <= 8) {
      e.preventDefault();
      const action = COMBAT_ACTIONS[idx - 1];
      dispatch({ type: 'SET_PENDING_COMBAT_ACTION', action: action.action });
      if (state.room) sendRawCommand(state.room, action.action);
    }
  }, [state.inCombat, state.room, dispatch]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleActionClick = useCallback((action: CombatAction) => {
    dispatch({ type: 'SET_PENDING_COMBAT_ACTION', action });
    if (state.room) sendRawCommand(state.room, action);
  }, [state.room, dispatch]);

  if (!state.inCombat && !visible) return null;

  const pulsing = tickProgress < 0.2;

  return (
    <div className={`combat-overlay ${visible ? 'combat-overlay--visible' : 'combat-overlay--hidden'}`} role="region" aria-label="Combat">
      <div className="combat-banner">
        <span className="combat-banner-text">⚔ COMBAT</span>
        <div className="combat-banner-accent" />
      </div>

      <div className="tick-timer" role="progressbar" aria-valuenow={Math.round(tickProgress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Tick timer">
        <div className="tick-timer-track">
          <div
            className={`tick-timer-fill ${pulsing ? 'tick-timer-fill--pulse' : ''}`}
            style={{ width: `${tickProgress * 100}%` }}
          />
        </div>
      </div>

      <div className="action-quickbar" role="toolbar" aria-label="Combat actions">
        {COMBAT_ACTIONS.map((btn) => {
          const isActive = state.pendingCombatAction === btn.action;
          return (
            <button
              key={btn.action}
              className={`action-btn ${isActive ? 'action-btn--active' : ''}`}
              type="button"
              onClick={() => handleActionClick(btn.action)}
              aria-label={`${btn.label} (key ${btn.key})`}
            >
              <sup className="action-btn-key">{btn.superscript}</sup>
              {btn.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

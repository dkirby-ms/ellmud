import { useEffect, useRef, useCallback } from 'react';
import { useAppContext, type SoundCue } from '../store.js';
import { EnemyStatusPanel } from './EnemyStatusPanel.js';
import { sendRawCommand } from '../services/connection.js';

const TIER_COLORS: Record<string, string> = {
  scrap: 'var(--text-secondary)',
  common: 'var(--loot-common)',
  sturdy: 'var(--loot-sturdy)',
  refined: 'var(--loot-refined)',
  masterwork: 'var(--loot-masterwork)',
  anomalous: 'var(--loot-anomalous)',
};

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

function getTimerColorClass(timer: number, max: number | null): string {
  if (max == null || max <= 0) return 'timer-white';
  const ratio = timer / max;
  if (ratio > 0.6) return 'timer-white';
  if (ratio > 0.3) return 'timer-amber';
  return 'timer-red';
}

export function ShardSidebar(): React.JSX.Element {
  const { state, dispatch } = useAppContext();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const soundCuesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (state.collapseTimer == null || state.collapseTimer <= 0) return;

    timerRef.current = setInterval(() => {
      dispatch({ type: 'SET_COLLAPSE_TIMER', timer: Math.max(0, (state.collapseTimer ?? 0) - 1) });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.collapseTimer, dispatch]);

  useEffect(() => {
    if (soundCuesRef.current?.scrollTo) {
      soundCuesRef.current.scrollTo({ top: soundCuesRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [state.soundCues.length]);

  const handleMiniAction = useCallback((cmd: string) => {
    if (state.room) sendRawCommand(state.room, cmd);
  }, [state.room]);

  const roomName = state.roomHeader?.roomName ?? 'Unknown Location';
  const timer = state.collapseTimer;
  const timerMax = state.collapseTimerMax;
  const displayItems = state.inventory.slice(0, 5);

  return (
    <aside className="shard-sidebar" role="complementary" aria-label="Shard exploration">
      <div className="sidebar-section sidebar-room">
        <h2 className="sidebar-room-name">{roomName}</h2>
      </div>

      {timer != null && (
        <div className="sidebar-section sidebar-timer">
          <span className={`collapse-timer ${getTimerColorClass(timer, timerMax)}`} aria-label="Collapse timer">
            {timer}s
          </span>
        </div>
      )}

      <div className="sidebar-section sidebar-cues">
        {state.inCombat && state.enemyStatus ? (
          <EnemyStatusPanel enemy={state.enemyStatus} />
        ) : (
          <div className="sound-cues-panel" role="log" aria-label="Sound cues">
            <h3 className="sidebar-section-title">Sound Cues</h3>
            <div className="sound-cues-list" ref={soundCuesRef}>
              {state.soundCues.length === 0 ? (
                <p className="sound-cue-empty">No sounds detected...</p>
              ) : (
                state.soundCues.map((cue: SoundCue) => (
                  <div key={cue.id} className="sound-cue-item">
                    <span className="sound-cue-time">{formatTimestamp(cue.timestamp)}</span>
                    <span className="sound-cue-text">{cue.text}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div className="sidebar-section sidebar-inventory">
        <h3 className="sidebar-section-title">Inventory</h3>
        {displayItems.length === 0 ? (
          <p className="inventory-empty">Empty</p>
        ) : (
          <ul className="inventory-list">
            {displayItems.map((item) => (
              <li key={item.id} className="inventory-item" style={{ color: TIER_COLORS[item.tier] ?? 'var(--text-primary)' }}>
                {item.name}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="sidebar-section sidebar-actions">
        <button className="mini-action-btn" type="button" onClick={() => handleMiniAction('look')}>Look</button>
        <button className="mini-action-btn" type="button" onClick={() => handleMiniAction('map')}>Map</button>
        <button className="mini-action-btn" type="button" onClick={() => handleMiniAction('evade')}>Evasion</button>
        <button className="mini-action-btn" type="button" onClick={() => handleMiniAction('loot')}>Loot</button>
      </div>
    </aside>
  );
}

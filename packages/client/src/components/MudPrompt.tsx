/**
 * MudPrompt — Classic MUD-style status line pinned to the bottom of the narrative scroll.
 *
 * Displays HP (color-coded), combat stance, active status effects, and a blinking cursor.
 * Pulls all data from the Zustand store so it updates reactively.
 */

import { useAppStore } from '../store.js';

function hpColor(hp: number, maxHp: number): string {
  if (maxHp <= 0) return 'mud-prompt-hp-critical';
  const ratio = hp / maxHp;
  if (ratio > 0.6) return 'mud-prompt-hp-healthy';
  if (ratio >= 0.3) return 'mud-prompt-hp-wounded';
  return 'mud-prompt-hp-critical';
}

function stanceLabel(inCombat: boolean, pendingAction: string | null): string {
  if (!inCombat) return 'Ready';
  if (pendingAction) {
    // Capitalize first letter, replace underscores
    return pendingAction.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
  }
  return 'In Combat';
}

export default function MudPrompt() {
  const hp = useAppStore(s => s.playerHp);
  const maxHp = useAppStore(s => s.playerMaxHp);
  const inCombat = useAppStore(s => s.inCombat);
  const pendingCombatAction = useAppStore(s => s.pendingCombatAction);
  const statusEffects = useAppStore(s => s.statusEffects);
  const roomHeader = useAppStore(s => s.roomHeader);

  const stance = stanceLabel(inCombat, pendingCombatAction);
  const effects = statusEffects ?? [];
  const roomName = roomHeader?.roomName;

  return (
    <div className="mud-prompt" role="status" aria-label="Player status">
      <span className="mud-prompt-bracket">[</span>

      {/* HP */}
      <span className="mud-prompt-label">HP:</span>
      <span className={hpColor(hp, maxHp)}>
        {hp}/{maxHp}
      </span>

      <span className="mud-prompt-sep">│</span>

      {/* Stance */}
      <span className="mud-prompt-label">ST:</span>
      <span className={inCombat ? 'mud-prompt-combat' : 'mud-prompt-ready'}>
        {stance}
      </span>

      {/* Status effects */}
      {effects.length > 0 && (
        <>
          <span className="mud-prompt-sep">│</span>
          <span className="mud-prompt-label">FX:</span>
          {effects.map((fx, i) => (
            <span key={fx.id} className="mud-prompt-effect">
              {fx.name}{i < effects.length - 1 ? ',' : ''}
            </span>
          ))}
        </>
      )}

      {/* Room name (subtle) */}
      {roomName && (
        <>
          <span className="mud-prompt-sep">│</span>
          <span className="mud-prompt-room">{roomName}</span>
        </>
      )}

      <span className="mud-prompt-bracket">]</span>
    </div>
  );
}

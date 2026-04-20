/**
 * CompassControl — Persistent directional navigation widget.
 *
 * Renders a compass rose with buttons for all eight cardinal/ordinal
 * directions plus Up/Down. Only available exits are interactive;
 * unavailable directions are visually dimmed.
 *
 * Reads exits from the roomHeader in AppState and dispatches movement
 * commands via the provided onNavigate callback.
 */

import { forwardRef } from 'react';
import { useAppStore } from '../store.js';

/** All directions the compass can display, in layout order. */
const ALL_DIRECTIONS = [
  'northwest', 'north', 'northeast',
  'west', '', 'east',
  'southwest', 'south', 'southeast',
] as const;

/** Short labels for the compass grid. */
const DIR_LABELS: Record<string, string> = {
  north: 'N',
  south: 'S',
  east: 'E',
  west: 'W',
  northeast: '·',
  northwest: '·',
  southeast: '·',
  southwest: '·',
  up: '▲',
  down: '▼',
};

interface CompassControlProps {
  onNavigate: (direction: string) => void;
}

const CompassControl = forwardRef<HTMLDivElement, CompassControlProps>(function CompassControl({ onNavigate }, ref) {
  const roomHeader = useAppStore(s => s.roomHeader);
  const exits = roomHeader?.exits ?? [];
  const exitSet = new Set(exits.map((e) => e.toLowerCase()));

  const hasUp = exitSet.has('up');
  const hasDown = exitSet.has('down');

  return (
    <div ref={ref} className="p-4 border-b border-border-muted" data-testid="compass-control">
      <h3 className="text-text-secondary text-xs mb-3 font-sans">COMPASS</h3>

      {/* Compass rose — 3×3 grid for cardinal/ordinal directions */}
      <div className="grid grid-cols-3 gap-1 max-w-[9rem] mx-auto mb-2">
        {ALL_DIRECTIONS.map((dir, _i) => {
          if (dir === '') {
            // Center cell — decorative compass dot
            return (
              <div
                key="center"
                className="flex items-center justify-center h-8 text-text-disabled text-xs font-mono select-none"
                aria-hidden
              >
                ◆
              </div>
            );
          }

          const available = exitSet.has(dir);
          return (
            <button
              key={dir}
              data-direction={dir}
              disabled={!available}
              onClick={() => onNavigate(dir)}
              className={`h-8 rounded text-xs font-mono transition-colors ${
                available
                  ? 'text-interactive hover:text-accent-gold hover:bg-bg-elevated focus:text-accent-gold focus:bg-bg-elevated focus:outline-none focus:ring-2 focus:ring-accent-gold cursor-pointer'
                  : 'text-text-disabled opacity-30 cursor-default'
              }`}
              title={available ? `Go ${dir}` : `${dir} — no exit`}
            >
              {DIR_LABELS[dir]}
            </button>
          );
        })}
      </div>

      {/* Up / Down row beneath the grid */}
      <div className="flex justify-center gap-2">
        <button
          data-direction="up"
          disabled={!hasUp}
          onClick={() => onNavigate('up')}
          className={`px-3 h-7 rounded text-xs font-mono transition-colors ${
            hasUp
              ? 'text-interactive hover:text-accent-gold hover:bg-bg-elevated focus:text-accent-gold focus:bg-bg-elevated focus:outline-none focus:ring-2 focus:ring-accent-gold cursor-pointer'
              : 'text-text-disabled opacity-30 cursor-default'
          }`}
          title={hasUp ? 'Go up' : 'up — no exit'}
        >
          {DIR_LABELS.up} Up
        </button>
        <button
          data-direction="down"
          disabled={!hasDown}
          onClick={() => onNavigate('down')}
          className={`px-3 h-7 rounded text-xs font-mono transition-colors ${
            hasDown
              ? 'text-interactive hover:text-accent-gold hover:bg-bg-elevated focus:text-accent-gold focus:bg-bg-elevated focus:outline-none focus:ring-2 focus:ring-accent-gold cursor-pointer'
              : 'text-text-disabled opacity-30 cursor-default'
          }`}
          title={hasDown ? 'Go down' : 'down — no exit'}
        >
          {DIR_LABELS.down} Down
        </button>
      </div>
    </div>
  );
});

export default CompassControl;

import { useEffect, useCallback } from 'react';

export interface FloorSelectorProps {
  currentFloor: number;
  minFloor: number;
  maxFloor: number;
  onFloorChange: (floor: number) => void;
  /** Optional room counts per floor: Map<z, count>. */
  roomCounts?: Map<number, number>;
  /** When true, binds [ / ] keyboard shortcuts to the document. */
  keyboardEnabled?: boolean;
}

/** Floor label: "Ground" for z=0, "1↑" for z>0, "1↓" for z<0. */
function floorLabel(z: number): string {
  if (z === 0) return 'Ground';
  return `${Math.abs(z)}${z > 0 ? '↑' : '↓'}`;
}

/**
 * Compact pill-shaped floor selector with up/down buttons.
 * Hidden automatically when there's only one floor (min === max).
 */
export function FloorSelector({
  currentFloor,
  minFloor,
  maxFloor,
  onFloorChange,
  roomCounts,
  keyboardEnabled = false,
}: FloorSelectorProps) {
  const canGoUp = currentFloor < maxFloor;
  const canGoDown = currentFloor > minFloor;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't capture if user is typing in an input/textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === ']' && canGoUp) {
        e.preventDefault();
        onFloorChange(currentFloor + 1);
      } else if (e.key === '[' && canGoDown) {
        e.preventDefault();
        onFloorChange(currentFloor - 1);
      }
    },
    [canGoUp, canGoDown, currentFloor, onFloorChange],
  );

  useEffect(() => {
    if (!keyboardEnabled) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [keyboardEnabled, handleKeyDown]);

  // Single floor — nothing to switch
  if (minFloor === maxFloor) return null;

  const count = roomCounts?.get(currentFloor);
  const label = floorLabel(currentFloor);

  return (
    <div
      className="floor-selector"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '2px',
        background: '#1a1b26',
        border: '1px solid #2A2B35',
        borderRadius: '14px',
        padding: '2px 4px',
        userSelect: 'none',
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
      }}
    >
      <button
        onClick={() => onFloorChange(currentFloor - 1)}
        disabled={!canGoDown}
        aria-label="Floor down"
        title="Floor down ( [ )"
        style={{
          background: 'none',
          border: 'none',
          color: canGoDown ? '#8A8B95' : '#2A2B35',
          cursor: canGoDown ? 'pointer' : 'default',
          padding: '1px 4px',
          fontSize: '12px',
          lineHeight: 1,
        }}
      >
        ▾
      </button>

      <span
        style={{
          color: '#E8E0D0',
          minWidth: '48px',
          textAlign: 'center',
          whiteSpace: 'nowrap',
        }}
        title={count != null ? `${count} room${count !== 1 ? 's' : ''} on this floor` : undefined}
      >
        {label}
        {count != null && (
          <span style={{ color: '#6A6B75', fontSize: '9px', marginLeft: '2px' }}>
            ({count})
          </span>
        )}
      </span>

      <button
        onClick={() => onFloorChange(currentFloor + 1)}
        disabled={!canGoUp}
        aria-label="Floor up"
        title="Floor up ( ] )"
        style={{
          background: 'none',
          border: 'none',
          color: canGoUp ? '#8A8B95' : '#2A2B35',
          cursor: canGoUp ? 'pointer' : 'default',
          padding: '1px 4px',
          fontSize: '12px',
          lineHeight: 1,
        }}
      >
        ▴
      </button>
    </div>
  );
}

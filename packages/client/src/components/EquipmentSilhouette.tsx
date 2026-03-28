/**
 * EquipmentSilhouette — Abstract slot diagram showing player's equipped items.
 *
 * Layout: Compact grid/diagram with slots arranged logically:
 *        [Head]
 *   [Weapon] [Chest] [Offhand]
 *        [Hands]
 *        [Legs]
 *        [Feet]
 *   [Ring1] [Amulet] [Ring2]
 *
 * Features:
 * - Equipped items: border glows with tier-appropriate color
 * - Empty slots: dotted border, dimmed label
 * - Mouseover on equipped slot → shows ItemTooltip with full item details
 * - Compact design for sidebar use
 */

import { useState } from 'react';
import type { EquipmentSlots, EquipmentSlotType, GearTier } from '@ellmud/shared';
import { ItemTooltip } from './ItemTooltip.js';

// ─── Tier → Color Mapping ───────────────────────────────────────────────────

const TIER_COLORS: Record<GearTier, string> = {
  scrap:       '#808080',
  common:      '#d4d4d4',
  sturdy:      '#4ade80',
  refined:     '#60a5fa',
  masterwork:  '#c084fc',
  anomalous:   '#fbbf24',
};

function getTierColor(tier: GearTier): string {
  return TIER_COLORS[tier] ?? TIER_COLORS.common;
}

// ─── Slot Labels ─────────────────────────────────────────────────────────────

const SLOT_LABELS: Record<EquipmentSlotType, string> = {
  head:    'Head',
  chest:   'Chest',
  legs:    'Legs',
  feet:    'Feet',
  hands:   'Hands',
  weapon:  'Weapon',
  offhand: 'Offhand',
  ring1:   'Ring',
  ring2:   'Ring',
  amulet:  'Amulet',
};

// ─── Slot Layout Definition ─────────────────────────────────────────────────

// Define the visual layout grid. Each row is an array of slot IDs (or null for spacer).
const LAYOUT_GRID: (EquipmentSlotType | null)[][] = [
  [null, 'head', null],
  ['weapon', 'chest', 'offhand'],
  [null, 'hands', null],
  [null, 'legs', null],
  [null, 'feet', null],
  ['ring1', 'amulet', 'ring2'],
];

// ─── Props ───────────────────────────────────────────────────────────────────

interface EquipmentSilhouetteProps {
  loadout: EquipmentSlots;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function EquipmentSilhouette({ loadout }: EquipmentSilhouetteProps) {
  const [hoveredSlot, setHoveredSlot] = useState<EquipmentSlotType | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Check if completely naked
  const hasEquipment = Object.values(loadout).some(item => item !== null);

  const handleMouseEnter = (
    slot: EquipmentSlotType,
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    if (loadout[slot]) {
      setHoveredSlot(slot);
      setMousePos({ x: event.clientX, y: event.clientY });
    }
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (hoveredSlot && loadout[hoveredSlot]) {
      setMousePos({ x: event.clientX, y: event.clientY });
    }
  };

  const handleMouseLeave = () => {
    setHoveredSlot(null);
  };

  return (
    <div className="equipment-silhouette">
      {/* Header */}
      <h3 className="text-text-secondary text-xs mb-3 font-sans">
        EQUIPMENT
      </h3>

      {/* No equipment message */}
      {!hasEquipment ? (
        <div className="text-text-disabled text-xs italic font-sans text-center py-4">
          No equipment worn
        </div>
      ) : (
        <div className="equipment-grid">
          {LAYOUT_GRID.map((row, rowIndex) => (
            <div key={rowIndex} className="equipment-row">
              {row.map((slot, colIndex) => {
                if (slot === null) {
                  // Empty spacer cell
                  return <div key={colIndex} className="equipment-cell-spacer" />;
                }

                const item = loadout[slot];
                const tierColor = item ? getTierColor(item.tier) : undefined;
                const isEmpty = !item;

                return (
                  <div
                    key={slot}
                    className="equipment-cell"
                    data-slot={slot}
                    onMouseEnter={(e) => handleMouseEnter(slot, e)}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    style={{
                      border: isEmpty
                        ? '1px dashed var(--border-muted)'
                        : `1px solid ${tierColor}`,
                      boxShadow: isEmpty ? undefined : `0 0 4px ${tierColor}60`,
                      background: isEmpty ? 'transparent' : 'rgba(28, 29, 39, 0.6)',
                      cursor: isEmpty ? 'default' : 'help',
                    }}
                  >
                    {isEmpty ? (
                      <span className="equipment-slot-label text-text-disabled">
                        {SLOT_LABELS[slot]}
                      </span>
                    ) : (
                      <span
                        className="equipment-item-name"
                        style={{ color: tierColor }}
                      >
                        {item.name.length > 12 ? `${item.name.slice(0, 11)}…` : item.name}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Tooltip */}
      {hoveredSlot && loadout[hoveredSlot] && (
        <ItemTooltip
          item={loadout[hoveredSlot]!}
          mouseX={mousePos.x}
          mouseY={mousePos.y}
        />
      )}
    </div>
  );
}

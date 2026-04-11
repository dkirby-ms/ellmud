/**
 * ItemTooltip — Reusable mouseover tooltip for displaying item details.
 *
 * Shows item name (tier-colored), type, slot, stats, weight, description, and tier badge.
 * MUD aesthetic: dark background, tier-colored border accent, monospace feel.
 * Used by EquipmentSilhouette and can be integrated into CombinedStashLoadout.
 */

import type { DisplayItem, GearTier } from '@ellmud/shared';
import { useEffect, useRef, useState } from 'react';
import AnsiText from './AnsiText.js';

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

// ─── Props ───────────────────────────────────────────────────────────────────

interface ItemTooltipProps {
  item: DisplayItem;
  /** Mouse X position (screen coords) */
  mouseX: number;
  /** Mouse Y position (screen coords) */
  mouseY: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ItemTooltip({ item, mouseX, mouseY }: ItemTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: mouseX + 12, y: mouseY + 12 });

  // Adjust tooltip position to prevent viewport overflow
  useEffect(() => {
    if (!tooltipRef.current) return;

    const tooltip = tooltipRef.current;
    const rect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = mouseX + 12;
    let y = mouseY + 12;

    // Prevent overflow on right edge
    if (x + rect.width > viewportWidth) {
      x = mouseX - rect.width - 12;
    }

    // Prevent overflow on bottom edge
    if (y + rect.height > viewportHeight) {
      y = mouseY - rect.height - 12;
    }

    // Clamp to viewport bounds
    x = Math.max(8, Math.min(x, viewportWidth - rect.width - 8));
    y = Math.max(8, Math.min(y, viewportHeight - rect.height - 8));

    setPosition({ x, y });
  }, [mouseX, mouseY]);

  const tierColor = getTierColor(item.tier);

  // Extract stats from item (weapons show damage/speed, armour shows armour/weight)
  const isWeapon = item.type === 'weapon';
  const isArmour = item.type === 'armour';

  return (
    <div
      ref={tooltipRef}
      className="item-tooltip"
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 9999,
        background: 'rgba(10, 11, 15, 0.98)',
        border: `1px solid ${tierColor}`,
        borderRadius: '2px',
        padding: '0.75rem',
        minWidth: '200px',
        maxWidth: '300px',
        boxShadow: `0 0 8px ${tierColor}40`,
        pointerEvents: 'none',
      }}
    >
      {/* Item name with tier color */}
      <div className="flex items-center justify-between mb-2">
        <span
          className="font-mono text-sm font-bold"
          style={{ color: tierColor }}
        >
          <AnsiText text={item.name} />
        </span>
        <span
          className="text-xs font-mono px-1.5 py-0.5 rounded"
          style={{
            border: `1px solid ${tierColor}`,
            color: tierColor,
          }}
        >
          {item.tier.toUpperCase()}
        </span>
      </div>

      {/* Item type and slot */}
      <div className="text-xs text-text-disabled font-mono mb-2">
        {item.type} · {item.allowedSlots.join(', ')}
      </div>

      {/* Stats section */}
      {(isWeapon || isArmour) && (
        <div className="text-xs font-mono mb-2 text-text-secondary space-y-1">
          {isWeapon && (
            <>
              <div>Damage: <span className="text-text-primary">?</span></div>
              <div>Speed: <span className="text-text-primary">?</span></div>
            </>
          )}
          {isArmour && (
            <>
              <div>Armour: <span className="text-text-primary">?</span></div>
              <div>Weight: <span className="text-text-primary">?</span></div>
            </>
          )}
        </div>
      )}

      {/* Weight */}
      <div className="text-xs text-text-disabled font-mono mb-2">
        Weight: <span className="text-text-primary">{item.weight}</span>
      </div>

      {/* Description / Flavor text */}
      {item.description && (
        <div
          className="text-xs italic font-serif text-text-secondary pt-2 mt-2"
          style={{ borderTop: '1px solid var(--border-muted)' }}
        >
          <AnsiText text={item.description} />
        </div>
      )}
    </div>
  );
}

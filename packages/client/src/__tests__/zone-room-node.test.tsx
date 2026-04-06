/**
 * zone-room-node.test.tsx — Tests for ZoneRoomNode visual enhancements (Phase 4).
 *
 * Verifies:
 * - Node shape rendering by room type (entry=path, boss=path, feature=polygon, junction=polygon, corridor=rect)
 * - Type-based fill/stroke color assignment
 * - Selection glow (cyan stroke + drop-shadow filter)
 * - Connect-source dashed teal border
 * - Disconnected gold warning stroke + ⚠ icon
 * - Boss room red stroke override
 * - Room name label (truncated at 10 chars when showLabels=true)
 * - Floor indicator (z+N / z-N for non-zero floors)
 * - Content badges (NPC, loot, hazard)
 * - Vertical exit indicators (▲/▼)
 * - Portal exit badge (⟐)
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

// Mock @xyflow/react — Handle requires ReactFlow provider context
vi.mock('@xyflow/react', () => ({
  Handle: () => null,
  Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' },
}));

import { ZoneRoomNode, type RoomNodeData } from '../components/map/ZoneRoomNode.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Build a RoomNodeData with sensible defaults, overridable per-field. */
function makeNodeData(overrides: Partial<RoomNodeData> = {}): RoomNodeData {
  return {
    slug: 'test-room',
    name: 'Test Room',
    type: 'corridor',
    floor: 0,
    isDisconnected: false,
    isConnectSource: false,
    hasUpExits: false,
    hasDownExits: false,
    portalCount: 0,
    portalExits: [],
    npcCount: 0,
    lootCount: 0,
    hazardCount: 0,
    showLabels: false,
    properties: [],
    ...overrides,
  };
}

// ─── Shape Rendering ────────────────────────────────────────────────────────

describe('ZoneRoomNode — shape rendering', () => {
  it('renders a <rect> for corridor type (rounded rect)', () => {
    const { container } = render(
      <ZoneRoomNode data={makeNodeData({ type: 'corridor' })} />,
    );
    const rect = container.querySelector('rect');
    expect(rect).not.toBeNull();
    expect(rect?.getAttribute('rx')).toBe('6');
  });

  it('renders a <rect> for dead_end type', () => {
    const { container } = render(
      <ZoneRoomNode data={makeNodeData({ type: 'dead_end' })} />,
    );
    expect(container.querySelector('rect')).not.toBeNull();
  });

  it('renders a <path> for entry type (shield shape)', () => {
    const { container } = render(
      <ZoneRoomNode data={makeNodeData({ type: 'entry' })} />,
    );
    const path = container.querySelector('path');
    expect(path).not.toBeNull();
    // Entry uses a shield/badge path with fill from ROOM_TYPE_COLORS.entry
    expect(path?.getAttribute('fill')).toBe('#1A3A2A');
  });

  it('renders a <path> for boss type (diamond)', () => {
    const { container } = render(
      <ZoneRoomNode data={makeNodeData({ type: 'boss' })} />,
    );
    const path = container.querySelector('path');
    expect(path).not.toBeNull();
    expect(path?.getAttribute('fill')).toBe('#3A1A1A');
  });

  it('renders a <polygon> for feature_ type (pentagon)', () => {
    const { container } = render(
      <ZoneRoomNode data={makeNodeData({ type: 'feature_trap' })} />,
    );
    const polygon = container.querySelector('polygon');
    expect(polygon).not.toBeNull();
    // Feature rooms use FEATURE_COLOR
    expect(polygon?.getAttribute('fill')).toBe('#2A1A3A');
    expect(polygon?.getAttribute('stroke')).toBe('#7B4FA0');
  });

  it('renders a <polygon> for junction type (hexagon)', () => {
    const { container } = render(
      <ZoneRoomNode data={makeNodeData({ type: 'junction' })} />,
    );
    const polygon = container.querySelector('polygon');
    expect(polygon).not.toBeNull();
    expect(polygon?.getAttribute('fill')).toBe('#1A3A3A');
  });
});

// ─── Type → Color Mapping ───────────────────────────────────────────────────

describe('ZoneRoomNode — type → color mapping', () => {
  it('entry rooms get green tones (#1A3A2A fill, #2D6B4F stroke)', () => {
    const { container } = render(
      <ZoneRoomNode data={makeNodeData({ type: 'entry' })} />,
    );
    const path = container.querySelector('path');
    expect(path?.getAttribute('fill')).toBe('#1A3A2A');
    expect(path?.getAttribute('stroke')).toBe('#2D6B4F');
  });

  it('boss rooms get red tones (#3A1A1A fill, #DC2626 stroke override)', () => {
    const { container } = render(
      <ZoneRoomNode data={makeNodeData({ type: 'boss' })} />,
    );
    const path = container.querySelector('path');
    expect(path?.getAttribute('fill')).toBe('#3A1A1A');
    // Boss room has red stroke override when not selected/connectSource
    expect(path?.getAttribute('stroke')).toBe('#DC2626');
  });

  it('corridor rooms get neutral tones (#1C1D27 fill, #4A4B55 stroke)', () => {
    const { container } = render(
      <ZoneRoomNode data={makeNodeData({ type: 'corridor' })} />,
    );
    const rect = container.querySelector('rect');
    expect(rect?.getAttribute('fill')).toBe('#1C1D27');
    expect(rect?.getAttribute('stroke')).toBe('#4A4B55');
  });

  it('unknown types fall back to default color', () => {
    const { container } = render(
      <ZoneRoomNode data={makeNodeData({ type: 'mystery' })} />,
    );
    const rect = container.querySelector('rect');
    expect(rect?.getAttribute('fill')).toBe('#1C1D27');
    expect(rect?.getAttribute('stroke')).toBe('#4A4B55');
  });
});

// ─── Selection Glow ─────────────────────────────────────────────────────────

describe('ZoneRoomNode — selection state', () => {
  it('selected node gets cyan stroke (#22D3EE) and wider strokeWidth', () => {
    const { container } = render(
      <ZoneRoomNode data={makeNodeData({ type: 'corridor' })} selected={true} />,
    );
    const rect = container.querySelector('rect');
    expect(rect?.getAttribute('stroke')).toBe('#22D3EE');
    expect(rect?.getAttribute('stroke-width')).toBe('3');
  });

  it('selected node gets drop-shadow filter for glow effect', () => {
    const { container } = render(
      <ZoneRoomNode data={makeNodeData({ type: 'corridor' })} selected={true} />,
    );
    const rect = container.querySelector('rect');
    expect(rect?.getAttribute('filter')).toContain('drop-shadow');
  });

  it('selection overrides boss red stroke', () => {
    const { container } = render(
      <ZoneRoomNode data={makeNodeData({ type: 'boss' })} selected={true} />,
    );
    const path = container.querySelector('path');
    expect(path?.getAttribute('stroke')).toBe('#22D3EE');
  });

  it('non-selected node has no drop-shadow filter', () => {
    const { container } = render(
      <ZoneRoomNode data={makeNodeData({ type: 'corridor' })} selected={false} />,
    );
    const rect = container.querySelector('rect');
    // filter is undefined → getAttribute returns null
    expect(rect?.getAttribute('filter')).toBeNull();
  });
});

// ─── Connect Source State ───────────────────────────────────────────────────

describe('ZoneRoomNode — connect source state', () => {
  it('connect source gets teal stroke with dashed border', () => {
    const { container } = render(
      <ZoneRoomNode
        data={makeNodeData({ type: 'corridor', isConnectSource: true })}
      />,
    );
    const rect = container.querySelector('rect');
    expect(rect?.getAttribute('stroke')).toBe('#3A7D7B');
    expect(rect?.getAttribute('stroke-width')).toBe('3');
    expect(rect?.getAttribute('stroke-dasharray')).toBe('4 2');
  });
});

// ─── Disconnected Warning ───────────────────────────────────────────────────

describe('ZoneRoomNode — disconnected warning', () => {
  it('disconnected node gets gold stroke', () => {
    const { container } = render(
      <ZoneRoomNode
        data={makeNodeData({ type: 'corridor', isDisconnected: true })}
      />,
    );
    const rect = container.querySelector('rect');
    expect(rect?.getAttribute('stroke')).toBe('#B8860B');
    expect(rect?.getAttribute('stroke-width')).toBe('2');
  });

  it('shows ⚠ warning icon when disconnected', () => {
    const { container } = render(
      <ZoneRoomNode
        data={makeNodeData({ isDisconnected: true })}
      />,
    );
    const warningTexts = container.querySelectorAll('text');
    const warningText = Array.from(warningTexts).find(
      (t) => t.textContent === '⚠' && t.getAttribute('fill') === '#B8860B',
    );
    expect(warningText).toBeDefined();
  });

  it('hides ⚠ when not disconnected', () => {
    const { container } = render(
      <ZoneRoomNode data={makeNodeData({ isDisconnected: false })} />,
    );
    const warningTexts = Array.from(container.querySelectorAll('text')).filter(
      (t) => t.textContent === '⚠' && t.getAttribute('fill') === '#B8860B',
    );
    expect(warningTexts).toHaveLength(0);
  });
});

// ─── Labels & Floor Indicator ───────────────────────────────────────────────

describe('ZoneRoomNode — labels and floor indicator', () => {
  it('shows room name when showLabels is true', () => {
    const { container } = render(
      <ZoneRoomNode
        data={makeNodeData({ name: 'Hall', showLabels: true })}
      />,
    );
    expect(container.textContent).toContain('Hall');
  });

  it('shows full room name (text wraps instead of truncating)', () => {
    const { container } = render(
      <ZoneRoomNode
        data={makeNodeData({ name: 'The Grand Hallway of Doom', showLabels: true })}
      />,
    );
    expect(container.textContent).toContain('The Grand Hallway of Doom');
  });

  it('hides room name when showLabels is false', () => {
    const { container } = render(
      <ZoneRoomNode
        data={makeNodeData({ name: 'Hidden Room', showLabels: false })}
      />,
    );
    // Room name should not be present when labels are off
    const foreignObjects = container.querySelectorAll('foreignObject');
    const hasNameLabel = Array.from(foreignObjects).some(
      (fo) => fo.textContent?.includes('Hidden Room') && fo.querySelector('div[style*="font-weight"]'),
    );
    expect(hasNameLabel).toBe(false);
  });

  it('always renders slug text', () => {
    const { container } = render(
      <ZoneRoomNode data={makeNodeData({ slug: 'grand-hall' })} />,
    );
    expect(container.textContent).toContain('grand-hall');
  });

  it('shows positive floor indicator (z+1)', () => {
    const { container } = render(
      <ZoneRoomNode data={makeNodeData({ floor: 1 })} />,
    );
    const texts = Array.from(container.querySelectorAll('text'));
    expect(texts.some((t) => t.textContent === 'z+1')).toBe(true);
  });

  it('shows negative floor indicator (z-2)', () => {
    const { container } = render(
      <ZoneRoomNode data={makeNodeData({ floor: -2 })} />,
    );
    const texts = Array.from(container.querySelectorAll('text'));
    expect(texts.some((t) => t.textContent === 'z-2')).toBe(true);
  });

  it('hides floor indicator when floor is 0', () => {
    const { container } = render(
      <ZoneRoomNode data={makeNodeData({ floor: 0 })} />,
    );
    const texts = Array.from(container.querySelectorAll('text'));
    expect(texts.some((t) => t.textContent?.startsWith('z'))).toBe(false);
  });
});

// ─── Content Badges ─────────────────────────────────────────────────────────

describe('ZoneRoomNode — content badges', () => {
  it('shows NPC badge with count title when npcCount > 0', () => {
    const { container } = render(
      <ZoneRoomNode data={makeNodeData({ npcCount: 3 })} />,
    );
    const badge = container.querySelector('[title="3 NPCs"]');
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toBe('👤');
  });

  it('shows singular NPC title for 1 NPC', () => {
    const { container } = render(
      <ZoneRoomNode data={makeNodeData({ npcCount: 1 })} />,
    );
    expect(container.querySelector('[title="1 NPC"]')).not.toBeNull();
  });

  it('shows loot badge when lootCount > 0', () => {
    const { container } = render(
      <ZoneRoomNode data={makeNodeData({ lootCount: 2 })} />,
    );
    const badge = container.querySelector('[title="2 loot containers"]');
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toBe('📦');
  });

  it('shows hazard badge when hazardCount > 0', () => {
    const { container } = render(
      <ZoneRoomNode data={makeNodeData({ hazardCount: 1 })} />,
    );
    const badge = container.querySelector('[title="1 hazard"]');
    expect(badge).not.toBeNull();
  });

  it('hides all badges when counts are zero', () => {
    const { container } = render(
      <ZoneRoomNode
        data={makeNodeData({ npcCount: 0, lootCount: 0, hazardCount: 0 })}
      />,
    );
    expect(container.querySelector('[title*="NPC"]')).toBeNull();
    expect(container.querySelector('[title*="loot"]')).toBeNull();
    expect(container.querySelector('[title*="hazard"]')).toBeNull();
  });
});

// ─── Vertical Exit Indicators ───────────────────────────────────────────────

describe('ZoneRoomNode — vertical exit indicators', () => {
  it('shows ▲ when hasUpExits is true', () => {
    const { container } = render(
      <ZoneRoomNode data={makeNodeData({ hasUpExits: true })} />,
    );
    const up = container.querySelector('[title="Has up exit"]');
    expect(up).not.toBeNull();
    expect(up?.textContent).toBe('▲');
  });

  it('shows ▼ when hasDownExits is true', () => {
    const { container } = render(
      <ZoneRoomNode data={makeNodeData({ hasDownExits: true })} />,
    );
    const down = container.querySelector('[title="Has down exit"]');
    expect(down).not.toBeNull();
    expect(down?.textContent).toBe('▼');
  });

  it('shows both ▲▼ when room has up and down exits', () => {
    const { container } = render(
      <ZoneRoomNode
        data={makeNodeData({ hasUpExits: true, hasDownExits: true })}
      />,
    );
    expect(container.querySelector('[title="Has up exit"]')).not.toBeNull();
    expect(container.querySelector('[title="Has down exit"]')).not.toBeNull();
  });

  it('hides vertical indicators when no vertical exits', () => {
    const { container } = render(
      <ZoneRoomNode
        data={makeNodeData({ hasUpExits: false, hasDownExits: false })}
      />,
    );
    expect(container.querySelector('[title="Has up exit"]')).toBeNull();
    expect(container.querySelector('[title="Has down exit"]')).toBeNull();
  });
});

// ─── Portal Badge ───────────────────────────────────────────────────────────

describe('ZoneRoomNode — portal badge', () => {
  it('shows ⟐ badge when portalCount > 0', () => {
    const { container } = render(
      <ZoneRoomNode data={makeNodeData({ portalCount: 2, portalExits: [
        { direction: 'north', targetZoneSlug: 'siltgate' },
        { direction: 'east', targetZoneSlug: 'warrens' },
      ] })} />,
    );
    const portal = container.querySelector('[title="2 portal exits"]');
    expect(portal).not.toBeNull();
    expect(portal?.textContent).toBe('⟐');
  });

  it('hides portal badge when portalCount is 0', () => {
    const { container } = render(
      <ZoneRoomNode data={makeNodeData({ portalCount: 0 })} />,
    );
    expect(container.querySelector('[title*="portal"]')).toBeNull();
  });
});

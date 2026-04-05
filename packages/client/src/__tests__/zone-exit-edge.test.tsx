/**
 * zone-exit-edge.test.tsx — Tests for ZoneExitEdge visual enhancements (Phase 4).
 *
 * Verifies:
 * - Direction-based Bézier curve coloring (N/S = blue gradient, E/W = amber gradient)
 * - Up/down = purple gradient
 * - Selected edge styling (gold stroke, wider)
 * - Orphan edge styling (red, dashed)
 * - Portal edge styling (cyan, dashed)
 * - One-way edge styling (amber, arrowhead)
 * - Lock/hidden modifier icons
 * - Portal target label rendering
 * - Invisible hit-target path for click accuracy
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ZoneExitEdge, type ExitEdgeData } from '../components/map/ZoneExitEdge.js';
import type { EdgeProps, Position } from '@xyflow/react';

// ─── Mock @xyflow/react ─────────────────────────────────────────────────────

vi.mock('@xyflow/react', () => ({
  getBezierPath: vi.fn(() => ['M 0 0 C 50 0, 50 100, 100 100', 50, 50]),
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Build EdgeProps with sensible defaults for test rendering. */
function makeEdgeProps(
  dataOverrides: Partial<ExitEdgeData> = {},
  propsOverrides: Partial<EdgeProps> = {},
): EdgeProps {
  return {
    id: 'edge-1',
    source: 'room-a',
    target: 'room-b',
    sourceX: 100,
    sourceY: 100,
    targetX: 200,
    targetY: 200,
    sourcePosition: 'bottom' as Position,
    targetPosition: 'top' as Position,
    selected: false,
    data: {
      direction: 'south',
      isBidirectional: true,
      isOrphan: false,
      isPortal: false,
      locked: false,
      hidden: false,
      ...dataOverrides,
    } as unknown as Record<string, unknown>,
    ...propsOverrides,
  } as unknown as EdgeProps;
}

/** Render the edge inside an SVG (required for SVG elements to mount). */
function renderEdge(props: EdgeProps) {
  return render(
    <svg>
      <ZoneExitEdge {...props} />
    </svg>,
  );
}

// ─── Direction-Based Coloring (Bézier Curves) ──────────────────────────────

describe('ZoneExitEdge — direction-based coloring', () => {
  it('north/south bidirectional exits use N/S blue gradient', () => {
    const { container } = renderEdge(
      makeEdgeProps({ direction: 'north', isBidirectional: true }),
    );
    const mainPath = container.querySelector('path.react-flow__edge-path');
    expect(mainPath?.getAttribute('stroke')).toBe('url(#exit-ns-gradient)');
  });

  it('south direction also uses N/S blue gradient', () => {
    const { container } = renderEdge(
      makeEdgeProps({ direction: 'south', isBidirectional: true }),
    );
    const mainPath = container.querySelector('path.react-flow__edge-path');
    expect(mainPath?.getAttribute('stroke')).toBe('url(#exit-ns-gradient)');
  });

  it('east/west bidirectional exits use E/W amber gradient', () => {
    const { container } = renderEdge(
      makeEdgeProps({ direction: 'east', isBidirectional: true }),
    );
    const mainPath = container.querySelector('path.react-flow__edge-path');
    expect(mainPath?.getAttribute('stroke')).toBe('url(#exit-ew-gradient)');
  });

  it('west direction also uses E/W amber gradient', () => {
    const { container } = renderEdge(
      makeEdgeProps({ direction: 'west', isBidirectional: true }),
    );
    const mainPath = container.querySelector('path.react-flow__edge-path');
    expect(mainPath?.getAttribute('stroke')).toBe('url(#exit-ew-gradient)');
  });

  it('up/down bidirectional exits use U/D purple gradient', () => {
    const { container } = renderEdge(
      makeEdgeProps({ direction: 'up', isBidirectional: true }),
    );
    const mainPath = container.querySelector('path.react-flow__edge-path');
    expect(mainPath?.getAttribute('stroke')).toBe('url(#exit-ud-gradient)');
  });

  it('diagonal/unknown directions fall back to U/D gradient', () => {
    const { container } = renderEdge(
      makeEdgeProps({ direction: 'northeast', isBidirectional: true }),
    );
    const mainPath = container.querySelector('path.react-flow__edge-path');
    expect(mainPath?.getAttribute('stroke')).toBe('url(#exit-ud-gradient)');
  });
});

// ─── Selection Styling ──────────────────────────────────────────────────────

describe('ZoneExitEdge — selection state', () => {
  it('selected edge uses gold stroke (#C9A84C)', () => {
    const { container } = renderEdge(
      makeEdgeProps({ direction: 'north', isBidirectional: true }, { selected: true } as Partial<EdgeProps>),
    );
    const mainPath = container.querySelector('path.react-flow__edge-path');
    expect(mainPath?.getAttribute('stroke')).toBe('#C9A84C');
  });

  it('selected edge gets wider stroke (3)', () => {
    const { container } = renderEdge(
      makeEdgeProps({ direction: 'east', isBidirectional: true }, { selected: true } as Partial<EdgeProps>),
    );
    const mainPath = container.querySelector('path.react-flow__edge-path');
    expect(mainPath?.getAttribute('stroke-width')).toBe('3');
  });

  it('selected one-way edge uses selected arrowhead marker', () => {
    const { container } = renderEdge(
      makeEdgeProps(
        { direction: 'south', isBidirectional: false, isPortal: false, isOrphan: false },
        { selected: true } as Partial<EdgeProps>,
      ),
    );
    const mainPath = container.querySelector('path.react-flow__edge-path');
    expect(mainPath?.getAttribute('marker-end')).toBe('url(#arrowhead-oneway-selected)');
  });

  it('selected bidirectional edge has no arrowhead', () => {
    const { container } = renderEdge(
      makeEdgeProps(
        { direction: 'north', isBidirectional: true },
        { selected: true } as Partial<EdgeProps>,
      ),
    );
    const mainPath = container.querySelector('path.react-flow__edge-path');
    // undefined → no attribute set
    expect(mainPath?.getAttribute('marker-end')).toBeNull();
  });
});

// ─── Orphan Edge Styling ────────────────────────────────────────────────────

describe('ZoneExitEdge — orphan edges', () => {
  it('orphan edges use red stroke (#EF4444)', () => {
    const { container } = renderEdge(
      makeEdgeProps({ isOrphan: true, isBidirectional: false }),
    );
    const mainPath = container.querySelector('path.react-flow__edge-path');
    expect(mainPath?.getAttribute('stroke')).toBe('#EF4444');
  });

  it('orphan edges are dashed (6 3)', () => {
    const { container } = renderEdge(
      makeEdgeProps({ isOrphan: true, isBidirectional: false }),
    );
    const mainPath = container.querySelector('path.react-flow__edge-path');
    expect(mainPath?.getAttribute('stroke-dasharray')).toBe('6 3');
  });

  it('orphan edges have orphan arrowhead marker', () => {
    const { container } = renderEdge(
      makeEdgeProps({ isOrphan: true, isBidirectional: false }),
    );
    const mainPath = container.querySelector('path.react-flow__edge-path');
    expect(mainPath?.getAttribute('marker-end')).toBe('url(#arrowhead-orphan)');
  });
});

// ─── Portal Edge Styling ────────────────────────────────────────────────────

describe('ZoneExitEdge — portal edges', () => {
  it('portal edges use cyan stroke (#06b6d4)', () => {
    const { container } = renderEdge(
      makeEdgeProps({ isPortal: true, isBidirectional: false, isOrphan: false }),
    );
    const mainPath = container.querySelector('path.react-flow__edge-path');
    expect(mainPath?.getAttribute('stroke')).toBe('#06b6d4');
  });

  it('portal edges are dashed (4 2)', () => {
    const { container } = renderEdge(
      makeEdgeProps({ isPortal: true, isBidirectional: false, isOrphan: false }),
    );
    const mainPath = container.querySelector('path.react-flow__edge-path');
    expect(mainPath?.getAttribute('stroke-dasharray')).toBe('4 2');
  });

  it('portal edges show target zone label', () => {
    const { container } = renderEdge(
      makeEdgeProps({
        isPortal: true,
        isBidirectional: false,
        isOrphan: false,
        targetZoneSlug: 'the-foundry',
        direction: 'east',
      }),
    );
    const label = Array.from(container.querySelectorAll('text')).find(
      (t) => t.textContent?.includes('the-foundry'),
    );
    expect(label).toBeDefined();
    expect(label?.textContent).toContain('east');
    expect(label?.textContent).toContain('→');
  });

  it('portal label uses selected color when edge is selected', () => {
    const { container } = renderEdge(
      makeEdgeProps(
        { isPortal: true, isBidirectional: false, isOrphan: false, targetZoneSlug: 'the-refuge', direction: 'north' },
        { selected: true } as Partial<EdgeProps>,
      ),
    );
    const label = Array.from(container.querySelectorAll('text')).find(
      (t) => t.textContent?.includes('the-refuge'),
    );
    expect(label?.getAttribute('fill')).toBe('#C9A84C');
  });
});

// ─── One-Way Edge Styling ───────────────────────────────────────────────────

describe('ZoneExitEdge — one-way edges', () => {
  it('one-way (non-portal, non-orphan) uses amber stroke (#F59E0B)', () => {
    const { container } = renderEdge(
      makeEdgeProps({ isBidirectional: false, isPortal: false, isOrphan: false }),
    );
    const mainPath = container.querySelector('path.react-flow__edge-path');
    expect(mainPath?.getAttribute('stroke')).toBe('#F59E0B');
  });

  it('one-way edges have arrowhead marker', () => {
    const { container } = renderEdge(
      makeEdgeProps({ isBidirectional: false, isPortal: false, isOrphan: false }),
    );
    const mainPath = container.querySelector('path.react-flow__edge-path');
    expect(mainPath?.getAttribute('marker-end')).toBe('url(#arrowhead-oneway)');
  });

  it('one-way edges have thicker stroke (2.5)', () => {
    const { container } = renderEdge(
      makeEdgeProps({ isBidirectional: false, isPortal: false, isOrphan: false }),
    );
    const mainPath = container.querySelector('path.react-flow__edge-path');
    expect(mainPath?.getAttribute('stroke-width')).toBe('2.5');
  });
});

// ─── Modifier Icons ─────────────────────────────────────────────────────────

describe('ZoneExitEdge — lock/hidden modifiers', () => {
  it('shows 🔒 icon when exit is locked', () => {
    const { container } = renderEdge(
      makeEdgeProps({ locked: true, hidden: false }),
    );
    const texts = Array.from(container.querySelectorAll('text'));
    expect(texts.some((t) => t.textContent?.includes('🔒'))).toBe(true);
  });

  it('shows 👁 icon when exit is hidden', () => {
    const { container } = renderEdge(
      makeEdgeProps({ locked: false, hidden: true }),
    );
    const texts = Array.from(container.querySelectorAll('text'));
    expect(texts.some((t) => t.textContent?.includes('👁'))).toBe(true);
  });

  it('shows both icons when locked AND hidden', () => {
    const { container } = renderEdge(
      makeEdgeProps({ locked: true, hidden: true }),
    );
    const texts = Array.from(container.querySelectorAll('text'));
    const modText = texts.find(
      (t) => t.textContent?.includes('🔒') && t.textContent?.includes('👁'),
    );
    expect(modText).toBeDefined();
  });

  it('shows no modifier icons when neither locked nor hidden', () => {
    const { container } = renderEdge(
      makeEdgeProps({ locked: false, hidden: false }),
    );
    const texts = Array.from(container.querySelectorAll('text'));
    expect(texts.some((t) => t.textContent?.includes('🔒'))).toBe(false);
    expect(texts.some((t) => t.textContent?.includes('👁'))).toBe(false);
  });
});

// ─── Hit-Target Path ────────────────────────────────────────────────────────

describe('ZoneExitEdge — invisible hit-target path', () => {
  it('renders a wider transparent path for click targeting', () => {
    const { container } = renderEdge(makeEdgeProps());
    const paths = container.querySelectorAll('path');
    const hitPath = Array.from(paths).find(
      (p) => p.getAttribute('stroke') === 'transparent',
    );
    expect(hitPath).not.toBeUndefined();
    expect(Number(hitPath?.getAttribute('stroke-width'))).toBeGreaterThanOrEqual(10);
  });
});

// ─── Priority Ordering ──────────────────────────────────────────────────────

describe('ZoneExitEdge — styling priority', () => {
  it('selected overrides orphan styling', () => {
    const { container } = renderEdge(
      makeEdgeProps(
        { isOrphan: true, isBidirectional: false },
        { selected: true } as Partial<EdgeProps>,
      ),
    );
    const mainPath = container.querySelector('path.react-flow__edge-path');
    expect(mainPath?.getAttribute('stroke')).toBe('#C9A84C');
  });

  it('orphan overrides portal styling (orphan checked first)', () => {
    const { container } = renderEdge(
      makeEdgeProps({ isOrphan: true, isPortal: true, isBidirectional: false }),
    );
    const mainPath = container.querySelector('path.react-flow__edge-path');
    // Orphan takes precedence over portal in the if-else chain
    expect(mainPath?.getAttribute('stroke')).toBe('#EF4444');
  });
});

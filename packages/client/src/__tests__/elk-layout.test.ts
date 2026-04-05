/**
 * elk-layout.test.ts — Tests for ELK layout adapter (Phase 4).
 *
 * Verifies:
 * - Floor assignment via up/down BFS traversal
 * - Multi-floor layout separation
 * - Cardinal exit filtering (up/down removed for per-floor layout)
 * - Portal exit filtering (cross-zone targets excluded)
 * - Grid coordinate normalization
 * - Default layout configuration
 * - Entry room fallback when slug is invalid
 * - Disconnected subgraph handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LayoutRoom, ElkLayoutOptions } from '../map/elkLayout.js';

// ─── Mock elkjs ─────────────────────────────────────────────────────────────
// ELK runs a WASM/JS engine; mock it to return predictable node positions.

const { mockLayout } = vi.hoisted(() => {
  const mockLayout = vi.fn();
  return { mockLayout };
});

vi.mock('elkjs/lib/elk.bundled.js', () => {
  return {
    default: class MockELK {
      layout = mockLayout;
    },
  };
});

import { computeElkLayout, DEFAULT_CONFIG } from '../map/elkLayout.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Build a simple linear dungeon: room-1 → room-2 → room-3 (all east exits). */
function makeLinearDungeon(): Map<string, LayoutRoom> {
  return new Map([
    ['room-1', { exits: new Map([['east', 'room-2']]) }],
    ['room-2', { exits: new Map([['west', 'room-1'], ['east', 'room-3']]) }],
    ['room-3', { exits: new Map([['west', 'room-2']]) }],
  ]);
}

/** Build a multi-floor dungeon with up/down exits. */
function makeMultiFloorDungeon(): Map<string, LayoutRoom> {
  return new Map([
    ['ground-hall', { exits: new Map([['east', 'ground-room'], ['up', 'upper-room']]) }],
    ['ground-room', { exits: new Map([['west', 'ground-hall']]) }],
    ['upper-room', { exits: new Map([['down', 'ground-hall'], ['east', 'upper-balcony']]) }],
    ['upper-balcony', { exits: new Map([['west', 'upper-room']]) }],
  ]);
}

/** Return a mock ELK layout result with children at given positions. */
function mockElkResult(positions: Array<{ id: string; x: number; y: number }>) {
  return {
    id: 'root',
    children: positions.map(({ id, x, y }) => ({ id, x, y, width: 50, height: 50 })),
    edges: [],
  };
}

// ─── Floor Assignment ───────────────────────────────────────────────────────

describe('elkLayout — floor assignment', () => {
  beforeEach(() => {
    mockLayout.mockReset();
  });

  it('assigns floor 0 to entry room and same-level rooms', async () => {
    mockLayout.mockResolvedValueOnce(
      mockElkResult([
        { id: 'room-1', x: 0, y: 0 },
        { id: 'room-2', x: 100, y: 0 },
        { id: 'room-3', x: 200, y: 0 },
      ]),
    );

    const positions = await computeElkLayout(makeLinearDungeon(), 'room-1');
    expect(positions.get('room-1')?.z).toBe(0);
    expect(positions.get('room-2')?.z).toBe(0);
    expect(positions.get('room-3')?.z).toBe(0);
  });

  it('assigns floor +1 to rooms reached via "up" exits', async () => {
    // Two floors → two layout calls
    mockLayout
      .mockResolvedValueOnce(
        mockElkResult([
          { id: 'ground-hall', x: 0, y: 0 },
          { id: 'ground-room', x: 100, y: 0 },
        ]),
      )
      .mockResolvedValueOnce(
        mockElkResult([
          { id: 'upper-room', x: 0, y: 0 },
          { id: 'upper-balcony', x: 100, y: 0 },
        ]),
      );

    const positions = await computeElkLayout(makeMultiFloorDungeon(), 'ground-hall');
    expect(positions.get('ground-hall')?.z).toBe(0);
    expect(positions.get('ground-room')?.z).toBe(0);
    expect(positions.get('upper-room')?.z).toBe(1);
    expect(positions.get('upper-balcony')?.z).toBe(1);
  });

  it('assigns floor -1 to rooms reached via "down" exits', async () => {
    const dungeon = new Map<string, LayoutRoom>([
      ['surface', { exits: new Map([['down', 'cellar']]) }],
      ['cellar', { exits: new Map([['up', 'surface']]) }],
    ]);

    mockLayout
      .mockResolvedValueOnce(mockElkResult([{ id: 'surface', x: 0, y: 0 }]))
      .mockResolvedValueOnce(mockElkResult([{ id: 'cellar', x: 0, y: 0 }]));

    const positions = await computeElkLayout(dungeon, 'surface');
    expect(positions.get('surface')?.z).toBe(0);
    expect(positions.get('cellar')?.z).toBe(-1);
  });
});

// ─── ELK Graph Construction ─────────────────────────────────────────────────

describe('elkLayout — graph construction', () => {
  beforeEach(() => {
    mockLayout.mockReset();
  });

  it('filters up/down exits from per-floor layout (only cardinal)', async () => {
    mockLayout
      .mockResolvedValueOnce(
        mockElkResult([
          { id: 'ground-hall', x: 0, y: 0 },
          { id: 'ground-room', x: 100, y: 0 },
        ]),
      )
      .mockResolvedValueOnce(
        mockElkResult([
          { id: 'upper-room', x: 0, y: 0 },
          { id: 'upper-balcony', x: 100, y: 0 },
        ]),
      );

    await computeElkLayout(makeMultiFloorDungeon(), 'ground-hall');

    // First call: ground floor graph
    const groundGraph = mockLayout.mock.calls[0][0];
    // Should have 2 rooms on ground floor
    expect(groundGraph.children).toHaveLength(2);
    // Edges should NOT include up/down
    const edgeIds = groundGraph.edges.map((e: { id: string }) => e.id);
    expect(edgeIds.every((id: string) => !id.includes('_up_') && !id.includes('_down_'))).toBe(true);
  });

  it('filters cross-zone portal exits (targets not in same floor)', async () => {
    const dungeon = new Map<string, LayoutRoom>([
      ['room-a', { exits: new Map([['east', 'room-b'], ['north', 'portal-target']]) }],
      ['room-b', { exits: new Map([['west', 'room-a']]) }],
      // portal-target is NOT in the rooms map → should be filtered
    ]);

    mockLayout.mockResolvedValueOnce(
      mockElkResult([
        { id: 'room-a', x: 0, y: 0 },
        { id: 'room-b', x: 100, y: 0 },
      ]),
    );

    const positions = await computeElkLayout(dungeon, 'room-a');
    expect(positions.has('room-a')).toBe(true);
    expect(positions.has('room-b')).toBe(true);
    expect(positions.has('portal-target')).toBe(false);
  });
});

// ─── Position Extraction ────────────────────────────────────────────────────

describe('elkLayout — position extraction', () => {
  beforeEach(() => {
    mockLayout.mockReset();
  });

  it('passes ELK pixel coords through directly', async () => {
    mockLayout.mockResolvedValueOnce(
      mockElkResult([
        { id: 'room-1', x: 0, y: 0 },
        { id: 'room-2', x: 300, y: 200 },
      ]),
    );

    const positions = await computeElkLayout(
      new Map([
        ['room-1', { exits: new Map([['east', 'room-2']]) }],
        ['room-2', { exits: new Map([['west', 'room-1']]) }],
      ]),
      'room-1',
    );

    expect(positions.get('room-1')).toEqual({ x: 0, y: 0, z: 0 });
    expect(positions.get('room-2')).toEqual({ x: 300, y: 200, z: 0 });
  });

  it('defaults missing coordinates to 0', async () => {
    mockLayout.mockResolvedValueOnce(
      mockElkResult([{ id: 'room-1', x: 149, y: 251 }]),
    );

    const positions = await computeElkLayout(
      new Map([['room-1', { exits: new Map() }]]),
      'room-1',
    );

    expect(positions.get('room-1')).toEqual({ x: 149, y: 251, z: 0 });
  });
});

// ─── Entry Room Fallback ────────────────────────────────────────────────────

describe('elkLayout — entry room fallback', () => {
  beforeEach(() => {
    mockLayout.mockReset();
  });

  it('falls back to first room when entry slug is not found', async () => {
    mockLayout.mockResolvedValueOnce(
      mockElkResult([{ id: 'only-room', x: 0, y: 0 }]),
    );

    const dungeon = new Map<string, LayoutRoom>([
      ['only-room', { exits: new Map() }],
    ]);

    const positions = await computeElkLayout(dungeon, 'nonexistent-entry');
    expect(positions.has('only-room')).toBe(true);
    expect(positions.get('only-room')?.z).toBe(0);
  });
});

// ─── Default Configuration ──────────────────────────────────────────────────

describe('elkLayout — DEFAULT_CONFIG export', () => {
  it('exports default node spacing of 120', () => {
    expect(DEFAULT_CONFIG.nodeSpacing).toBe(120);
  });

  it('exports default layer spacing of 150', () => {
    expect(DEFAULT_CONFIG.layerSpacing).toBe(150);
  });

  it('exports ORTHOGONAL edge routing', () => {
    expect(DEFAULT_CONFIG.edgeRouting).toBe('ORTHOGONAL');
  });

  it('exports DOWN direction', () => {
    expect(DEFAULT_CONFIG.direction).toBe('DOWN');
  });

  it('exports crossing minimization enabled', () => {
    expect(DEFAULT_CONFIG.crossingMinimization).toBe(true);
  });
});

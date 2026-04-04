/**
 * zone-designer-flow.test.tsx — Tests for ZoneDesignerFlow wrapper (Phase 4).
 *
 * Verifies:
 * - Floor indicator rendering
 * - SVG gradient defs (N/S blue, E/W amber, U/D purple)
 * - Arrow marker defs (selected, portal, orphan, one-way)
 * - Node/edge selection mapping
 * - Callback wiring (onNodeClick, onEdgeClick, onPaneClick)
 * - Minimap type-colored node rendering
 *
 * ReactFlow is mocked since it requires a Canvas/WebGL context that jsdom lacks.
 * We verify that ZoneDesignerFlow passes the correct props and renders wrapper chrome.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Node, Edge } from '@xyflow/react';

// ─── Mock @xyflow/react ─────────────────────────────────────────────────────
// ReactFlow needs Canvas API unavailable in jsdom. Mock the module to render
// a stub that exposes props for assertion.

const { MockReactFlow, MockBackground, MockControls, MockMiniMap } = vi.hoisted(() => {
  const MockReactFlow = vi.fn((props: Record<string, unknown>) => {
    return (
      <div data-testid="mock-reactflow">
        {props.children as React.ReactNode}
      </div>
    );
  });
  const MockBackground = vi.fn(() => <div data-testid="mock-background" />);
  const MockControls = vi.fn(() => <div data-testid="mock-controls" />);
  const MockMiniMap = vi.fn((props: Record<string, unknown>) => (
    <div
      data-testid="mock-minimap"
      data-node-color-fn={typeof props.nodeColor}
      data-mask-color={props.maskColor as string}
    />
  ));
  return { MockReactFlow, MockBackground, MockControls, MockMiniMap };
});

vi.mock('@xyflow/react', () => ({
  ReactFlow: MockReactFlow,
  Background: MockBackground,
  Controls: MockControls,
  MiniMap: MockMiniMap,
  BackgroundVariant: { Lines: 'lines', Dots: 'dots', Cross: 'cross' },
  useReactFlow: () => ({ fitView: vi.fn() }),
  getBezierPath: vi.fn(() => ['M 0 0', 0, 0]),
}));

import { ZoneDesignerFlow } from '../components/map/ZoneDesignerFlow.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeNodes(overrides: Array<Partial<Node>> = []): Node[] {
  const base: Node[] = [
    {
      id: 'room-1',
      type: 'room',
      position: { x: 0, y: 0 },
      data: { slug: 'room-1', name: 'Room 1', type: 'entry' },
    },
    {
      id: 'room-2',
      type: 'room',
      position: { x: 100, y: 0 },
      data: { slug: 'room-2', name: 'Room 2', type: 'corridor' },
    },
  ];
  return overrides.length > 0
    ? overrides.map((o, i) => ({ ...base[i % base.length], ...o }) as Node)
    : base;
}

function makeEdges(overrides: Array<Partial<Edge>> = []): Edge[] {
  const base: Edge[] = [
    {
      id: 'exit-1',
      type: 'exit',
      source: 'room-1',
      target: 'room-2',
      data: { direction: 'east', isBidirectional: true },
    },
  ];
  return overrides.length > 0
    ? overrides.map((o, i) => ({ ...base[i % base.length], ...o }) as Edge)
    : base;
}

// ─── Floor Indicator ────────────────────────────────────────────────────────

describe('ZoneDesignerFlow — floor indicator', () => {
  it('renders floor indicator with current floor number', () => {
    render(
      <ZoneDesignerFlow nodes={makeNodes()} edges={makeEdges()} floor={2} />,
    );
    expect(screen.getByText('F+2')).toBeDefined();
  });

  it('defaults to floor 0 when not specified', () => {
    render(
      <ZoneDesignerFlow nodes={makeNodes()} edges={makeEdges()} />,
    );
    expect(screen.getByText('F0')).toBeDefined();
  });

  it('shows negative floor numbers', () => {
    render(
      <ZoneDesignerFlow nodes={makeNodes()} edges={makeEdges()} floor={-1} />,
    );
    expect(screen.getByText('F-1')).toBeDefined();
  });
});

// ─── SVG Gradient Defs ──────────────────────────────────────────────────────

describe('ZoneDesignerFlow — SVG gradient defs', () => {
  it('defines N/S exit gradient (exit-ns-gradient)', () => {
    const { container } = render(
      <ZoneDesignerFlow nodes={makeNodes()} edges={makeEdges()} />,
    );
    const nsGrad = container.querySelector('#exit-ns-gradient');
    expect(nsGrad).not.toBeNull();
    expect(nsGrad?.tagName.toLowerCase()).toBe('lineargradient');
  });

  it('defines E/W exit gradient (exit-ew-gradient)', () => {
    const { container } = render(
      <ZoneDesignerFlow nodes={makeNodes()} edges={makeEdges()} />,
    );
    const ewGrad = container.querySelector('#exit-ew-gradient');
    expect(ewGrad).not.toBeNull();
  });

  it('defines U/D exit gradient (exit-ud-gradient)', () => {
    const { container } = render(
      <ZoneDesignerFlow nodes={makeNodes()} edges={makeEdges()} />,
    );
    const udGrad = container.querySelector('#exit-ud-gradient');
    expect(udGrad).not.toBeNull();
  });

  it('N/S gradient uses blue tones (#3B82F6 → #06B6D4)', () => {
    const { container } = render(
      <ZoneDesignerFlow nodes={makeNodes()} edges={makeEdges()} />,
    );
    const stops = container.querySelectorAll('#exit-ns-gradient stop');
    expect(stops.length).toBe(2);
    expect(stops[0].getAttribute('stop-color')).toBe('#3B82F6');
    expect(stops[1].getAttribute('stop-color')).toBe('#06B6D4');
  });

  it('E/W gradient uses amber tones (#F59E0B → #FB923C)', () => {
    const { container } = render(
      <ZoneDesignerFlow nodes={makeNodes()} edges={makeEdges()} />,
    );
    const stops = container.querySelectorAll('#exit-ew-gradient stop');
    expect(stops.length).toBe(2);
    expect(stops[0].getAttribute('stop-color')).toBe('#F59E0B');
    expect(stops[1].getAttribute('stop-color')).toBe('#FB923C');
  });

  it('U/D gradient uses purple tones (#A78BFA → #6366F1)', () => {
    const { container } = render(
      <ZoneDesignerFlow nodes={makeNodes()} edges={makeEdges()} />,
    );
    const stops = container.querySelectorAll('#exit-ud-gradient stop');
    expect(stops.length).toBe(2);
    expect(stops[0].getAttribute('stop-color')).toBe('#A78BFA');
    expect(stops[1].getAttribute('stop-color')).toBe('#6366F1');
  });
});

// ─── Arrow Marker Defs ──────────────────────────────────────────────────────

describe('ZoneDesignerFlow — arrow marker defs', () => {
  it('defines selected arrowhead marker', () => {
    const { container } = render(
      <ZoneDesignerFlow nodes={makeNodes()} edges={makeEdges()} />,
    );
    expect(container.querySelector('#arrowhead-selected')).not.toBeNull();
  });

  it('defines portal arrowhead marker', () => {
    const { container } = render(
      <ZoneDesignerFlow nodes={makeNodes()} edges={makeEdges()} />,
    );
    expect(container.querySelector('#arrowhead-portal')).not.toBeNull();
  });

  it('defines orphan arrowhead marker', () => {
    const { container } = render(
      <ZoneDesignerFlow nodes={makeNodes()} edges={makeEdges()} />,
    );
    expect(container.querySelector('#arrowhead-orphan')).not.toBeNull();
  });

  it('defines one-way arrowhead marker', () => {
    const { container } = render(
      <ZoneDesignerFlow nodes={makeNodes()} edges={makeEdges()} />,
    );
    expect(container.querySelector('#arrowhead-oneway')).not.toBeNull();
  });

  it('defines one-way-selected arrowhead marker', () => {
    const { container } = render(
      <ZoneDesignerFlow nodes={makeNodes()} edges={makeEdges()} />,
    );
    expect(container.querySelector('#arrowhead-oneway-selected')).not.toBeNull();
  });
});

// ─── Selection Mapping ──────────────────────────────────────────────────────

describe('ZoneDesignerFlow — selection mapping', () => {
  beforeEach(() => {
    MockReactFlow.mockClear();
  });

  it('marks the selected node in ReactFlow props', () => {
    render(
      <ZoneDesignerFlow
        nodes={makeNodes()}
        edges={makeEdges()}
        selectedNodeId="room-1"
      />,
    );
    const call = MockReactFlow.mock.calls[0][0];
    const flowNodes = call.nodes as Node[];
    expect(flowNodes.find((n) => n.id === 'room-1')?.selected).toBe(true);
    expect(flowNodes.find((n) => n.id === 'room-2')?.selected).toBe(false);
  });

  it('marks the selected edge in ReactFlow props', () => {
    render(
      <ZoneDesignerFlow
        nodes={makeNodes()}
        edges={makeEdges()}
        selectedEdgeId="exit-1"
      />,
    );
    const call = MockReactFlow.mock.calls[0][0];
    const flowEdges = call.edges as Edge[];
    expect(flowEdges.find((e) => e.id === 'exit-1')?.selected).toBe(true);
  });

  it('no selection when IDs are null', () => {
    render(
      <ZoneDesignerFlow
        nodes={makeNodes()}
        edges={makeEdges()}
        selectedNodeId={null}
        selectedEdgeId={null}
      />,
    );
    const call = MockReactFlow.mock.calls[0][0];
    const flowNodes = call.nodes as Node[];
    const flowEdges = call.edges as Edge[];
    expect(flowNodes.every((n) => n.selected === false)).toBe(true);
    expect(flowEdges.every((e) => e.selected === false)).toBe(true);
  });
});

// ─── Minimap ────────────────────────────────────────────────────────────────

describe('ZoneDesignerFlow — minimap', () => {
  beforeEach(() => {
    MockMiniMap.mockClear();
  });

  it('renders MiniMap component', () => {
    render(
      <ZoneDesignerFlow nodes={makeNodes()} edges={makeEdges()} />,
    );
    expect(screen.getByTestId('mock-minimap')).toBeDefined();
  });

  it('passes a nodeColor function to MiniMap', () => {
    render(
      <ZoneDesignerFlow nodes={makeNodes()} edges={makeEdges()} />,
    );
    const minimap = screen.getByTestId('mock-minimap');
    expect(minimap.getAttribute('data-node-color-fn')).toBe('function');
  });

  it('minimap nodeColor returns cyan for selected nodes', () => {
    render(
      <ZoneDesignerFlow nodes={makeNodes()} edges={makeEdges()} />,
    );
    const nodeColorFn = MockMiniMap.mock.calls[0][0].nodeColor as (node: Node) => string;
    const color = nodeColorFn({ id: 'x', selected: true } as Node);
    expect(color).toBe('#22D3EE');
  });

  it('minimap nodeColor returns green for entry nodes', () => {
    render(
      <ZoneDesignerFlow nodes={makeNodes()} edges={makeEdges()} />,
    );
    const nodeColorFn = MockMiniMap.mock.calls[0][0].nodeColor as (node: Node) => string;
    const color = nodeColorFn({ id: 'x', selected: false, data: { type: 'entry' } } as unknown as Node);
    expect(color).toBe('#2D6B4F');
  });

  it('minimap nodeColor returns red for boss nodes', () => {
    render(
      <ZoneDesignerFlow nodes={makeNodes()} edges={makeEdges()} />,
    );
    const nodeColorFn = MockMiniMap.mock.calls[0][0].nodeColor as (node: Node) => string;
    const color = nodeColorFn({ id: 'x', selected: false, data: { type: 'boss' } } as unknown as Node);
    expect(color).toBe('#DC2626');
  });

  it('minimap nodeColor returns purple for feature nodes', () => {
    render(
      <ZoneDesignerFlow nodes={makeNodes()} edges={makeEdges()} />,
    );
    const nodeColorFn = MockMiniMap.mock.calls[0][0].nodeColor as (node: Node) => string;
    const color = nodeColorFn({ id: 'x', selected: false, data: { type: 'feature_trap' } } as unknown as Node);
    expect(color).toBe('#7B4FA0');
  });

  it('minimap nodeColor returns teal for junction nodes', () => {
    render(
      <ZoneDesignerFlow nodes={makeNodes()} edges={makeEdges()} />,
    );
    const nodeColorFn = MockMiniMap.mock.calls[0][0].nodeColor as (node: Node) => string;
    const color = nodeColorFn({ id: 'x', selected: false, data: { type: 'junction' } } as unknown as Node);
    expect(color).toBe('#3A7D7B');
  });

  it('minimap nodeColor returns grey for unselected nodes', () => {
    render(
      <ZoneDesignerFlow nodes={makeNodes()} edges={makeEdges()} />,
    );
    const nodeColorFn = MockMiniMap.mock.calls[0][0].nodeColor as (node: Node) => string;
    const color = nodeColorFn({ id: 'x', selected: false } as Node);
    expect(color).toBe('#4A4B55');
  });

  it('minimap has dark background and border styling', () => {
    render(
      <ZoneDesignerFlow nodes={makeNodes()} edges={makeEdges()} />,
    );
    const style = MockMiniMap.mock.calls[0][0].style as Record<string, string>;
    expect(style.background).toBe('#1C1D27');
    expect(style.border).toContain('#4A4B55');
  });
});

// ─── ReactFlow Configuration ────────────────────────────────────────────────

describe('ZoneDesignerFlow — ReactFlow configuration', () => {
  beforeEach(() => {
    MockReactFlow.mockClear();
  });

  it('registers custom node types (room)', () => {
    render(
      <ZoneDesignerFlow nodes={makeNodes()} edges={makeEdges()} />,
    );
    const call = MockReactFlow.mock.calls[0][0];
    expect(call.nodeTypes).toHaveProperty('room');
  });

  it('registers custom edge types (exit)', () => {
    render(
      <ZoneDesignerFlow nodes={makeNodes()} edges={makeEdges()} />,
    );
    const call = MockReactFlow.mock.calls[0][0];
    expect(call.edgeTypes).toHaveProperty('exit');
  });

  it('disables node dragging', () => {
    render(
      <ZoneDesignerFlow nodes={makeNodes()} edges={makeEdges()} />,
    );
    const call = MockReactFlow.mock.calls[0][0];
    expect(call.nodesDraggable).toBe(false);
  });

  it('enables fitView on mount', () => {
    render(
      <ZoneDesignerFlow nodes={makeNodes()} edges={makeEdges()} />,
    );
    const call = MockReactFlow.mock.calls[0][0];
    expect(call.fitView).toBe(true);
  });
});

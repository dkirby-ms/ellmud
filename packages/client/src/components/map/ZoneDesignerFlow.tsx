/**
 * ZoneDesignerFlow — ReactFlow wrapper for zone designer visualization.
 *
 * This component will eventually replace the hand-rolled SVG rendering in ZoneDesigner.tsx (~3600 lines).
 * ReactFlow provides interactive node/edge manipulation, built-in zoom/pan, minimap, and controls.
 *
 * Phase 0: SKELETON ONLY — compiles and renders empty flow, not yet integrated into ZoneDesigner.
 */

import { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type Node,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ZoneDesignerFlowProps {
  /** ReactFlow nodes (rooms) */
  nodes: Node[];
  /** ReactFlow edges (exits) */
  edges: Edge[];
  /** Callback when a node is clicked */
  onNodeClick?: (nodeId: string) => void;
  /** Callback when an edge is clicked */
  onEdgeClick?: (edgeId: string) => void;
  /** Callback when two nodes are connected (exit creation) */
  onConnect?: (connection: Connection) => void;
  /** ID of the currently selected node (for highlighting) */
  selectedNodeId?: string | null;
  /** ID of the currently selected edge (for highlighting) */
  selectedEdgeId?: string | null;
  /** Current floor/z-level being displayed */
  floor?: number;
}

// ─── Custom Node Component ──────────────────────────────────────────────────

/**
 * RoomNode — custom node component for rendering zone rooms.
 *
 * TODO (Phase 1+):
 * - Render room type-specific styling (colors, icons)
 * - Display room name/slug
 * - Show selection state
 * - Add port handles for compass-direction exits
 * - Support drag-to-reposition
 */
function RoomNode({ data }: { data: { label: string } }) {
  return (
    <div
      style={{
        padding: '10px 20px',
        border: '2px solid #4A4B55',
        borderRadius: '4px',
        background: '#1C1D27',
        color: '#E5E7EB',
        fontSize: '12px',
        fontWeight: 500,
      }}
    >
      {data.label}
    </div>
  );
}

// ─── Custom Edge Component ──────────────────────────────────────────────────

/**
 * ExitEdge — custom edge component for rendering zone exits.
 *
 * TODO (Phase 1+):
 * - Render directional arrows
 * - Show exit type styling (portal, one-way, inter-floor)
 * - Display edge labels (direction, target zone)
 * - Support selection state
 */
// Currently using default ReactFlow edges; custom implementation will come in Phase 1+

// ─── Node & Edge Types ──────────────────────────────────────────────────────

const nodeTypes: NodeTypes = {
  room: RoomNode,
};

const edgeTypes: EdgeTypes = {
  // Using default edges for Phase 0; custom ExitEdge component will come in Phase 1+
};

// ─── Main Component ─────────────────────────────────────────────────────────

/**
 * ZoneDesignerFlow — ReactFlow-based zone visualization.
 *
 * Phase 0 skeleton features:
 * - Renders ReactFlow with Background, Controls, MiniMap
 * - Accepts nodes/edges as props
 * - Provides click handlers for nodes/edges
 * - Supports connection events (exit creation)
 * - Custom node type (RoomNode) with basic styling
 *
 * Not yet integrated into ZoneDesigner.tsx — this is a standalone component
 * that will be wired up in Phase 1.
 */
export function ZoneDesignerFlow({
  nodes,
  edges,
  onNodeClick,
  onEdgeClick,
  onConnect,
  selectedNodeId,
  selectedEdgeId,
  floor = 0,
}: ZoneDesignerFlowProps) {
  // Handle node click events
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      onNodeClick?.(node.id);
    },
    [onNodeClick]
  );

  // Handle edge click events
  const handleEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      onEdgeClick?.(edge.id);
    },
    [onEdgeClick]
  );

  // Handle connection events (drag from one node to another)
  const handleConnect = useCallback(
    (connection: Connection) => {
      onConnect?.(connection);
    },
    [onConnect]
  );

  // Apply selection styling to nodes
  const nodesWithSelection = nodes.map((node) => ({
    ...node,
    selected: node.id === selectedNodeId,
  }));

  // Apply selection styling to edges
  const edgesWithSelection = edges.map((edge) => ({
    ...edge,
    selected: edge.id === selectedEdgeId,
  }));

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodesWithSelection}
        edges={edgesWithSelection}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onConnect={handleConnect}
        fitView
        attributionPosition="bottom-right"
      >
        {/* Grid background */}
        <Background
          color="#4A4B55"
          gap={100}
          size={1}
          variant={BackgroundVariant.Lines}
        />
        
        {/* Zoom/pan controls */}
        <Controls
          showZoom
          showFitView
          showInteractive
          position="top-right"
        />
        
        {/* Minimap overview */}
        <MiniMap
          nodeColor={(node) => {
            // TODO: Color nodes by room type
            return node.selected ? '#7B4FA0' : '#4A4B55';
          }}
          maskColor="rgba(0, 0, 0, 0.6)"
          position="bottom-left"
          style={{
            background: '#1C1D27',
            border: '1px solid #4A4B55',
          }}
        />
      </ReactFlow>
      
      {/* Floor indicator (placeholder) */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          padding: '8px 16px',
          background: 'rgba(28, 29, 39, 0.9)',
          border: '1px solid #4A4B55',
          borderRadius: '4px',
          color: '#E5E7EB',
          fontSize: '14px',
          fontWeight: 500,
          pointerEvents: 'none',
        }}
      >
        Floor: {floor}
      </div>
    </div>
  );
}

// ─── Export Types ───────────────────────────────────────────────────────────

export type { Node as FlowNode, Edge as FlowEdge, Connection as FlowConnection };

/**
 * ZoneDesignerFlow — ReactFlow wrapper for zone designer visualization.
 *
 * Phase 3: Full ReactFlow integration with custom nodes/edges.
 */

import { useCallback, useEffect, useRef } from 'react';
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
  type Connection,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ZoneRoomNode } from './ZoneRoomNode.js';
import { ZoneExitEdge } from './ZoneExitEdge.js';

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
  /** Callback when a node is right-clicked */
  onNodeContextMenu?: (event: React.MouseEvent, nodeId: string) => void;
  /** Callback when an edge is right-clicked */
  onEdgeContextMenu?: (event: React.MouseEvent, edgeId: string) => void;
  /** Callback when the canvas is clicked (clear selection) */
  onPaneClick?: () => void;
  /** Callback when two nodes are connected (exit creation) */
  onConnect?: (connection: Connection) => void;
  /** ID of the currently selected node (for highlighting) */
  selectedNodeId?: string | null;
  /** ID of the currently selected edge (for highlighting) */
  selectedEdgeId?: string | null;
  /** Current floor/z-level being displayed */
  floor?: number;
}

// ─── Node & Edge Types ──────────────────────────────────────────────────────

const nodeTypes: NodeTypes = {
  room: ZoneRoomNode,
};

const edgeTypes: EdgeTypes = {
  exit: ZoneExitEdge,
};

// ─── Main Component ─────────────────────────────────────────────────────────

/**
 * ZoneDesignerFlow — ReactFlow-based zone visualization.
 *
 * Phase 3 features:
 * - Custom room nodes with type-based rendering
 * - Custom exit edges with direction-based styling
 * - Context menu support
 * - Pan/zoom/minimap
 * - Floor filtering
 * - Keyboard shortcuts
 */
export function ZoneDesignerFlow({
  nodes,
  edges,
  onNodeClick,
  onEdgeClick,
  onNodeContextMenu,
  onEdgeContextMenu,
  onPaneClick,
  onConnect,
  selectedNodeId,
  selectedEdgeId,
  floor = 0,
}: ZoneDesignerFlowProps) {
  const hasInitialFit = useRef(false);

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

  // Handle node context menu
  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      onNodeContextMenu?.(event, node.id);
    },
    [onNodeContextMenu]
  );

  // Handle edge context menu
  const handleEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      onEdgeContextMenu?.(event, edge.id);
    },
    [onEdgeContextMenu]
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
        onNodeContextMenu={handleNodeContextMenu}
        onEdgeContextMenu={handleEdgeContextMenu}
        onPaneClick={onPaneClick}
        onConnect={handleConnect}
        fitView
        attributionPosition="bottom-right"
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        zoomOnDoubleClick={false}
      >
        {/* SVG defs for gradients and markers */}
        <svg style={{ position: 'absolute', width: 0, height: 0 }}>
          <defs>
            {/* Arrow markers */}
            <marker id="arrowhead-selected" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#C9A84C" />
            </marker>
            <marker id="arrowhead-portal" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#06b6d4" />
            </marker>
            <marker id="arrowhead-orphan" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#EF4444" />
            </marker>
            <marker id="arrowhead-oneway" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#F59E0B" />
            </marker>
            <marker id="arrowhead-oneway-selected" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#C9A84C" />
            </marker>

            {/* Direction-based exit gradients */}
            <linearGradient id="exit-ns-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#06B6D4" />
            </linearGradient>
            <linearGradient id="exit-ew-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#FB923C" />
            </linearGradient>
            <linearGradient id="exit-ud-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#A78BFA" />
              <stop offset="100%" stopColor="#6366F1" />
            </linearGradient>
          </defs>
        </svg>

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
        
        {/* Minimap overview — type-based coloring (4.4) */}
        <MiniMap
          nodeColor={(node) => {
            if (node.selected) return '#22D3EE';
            const nodeType = (node.data as Record<string, unknown>)?.type as string | undefined;
            if (nodeType === 'entry') return '#2D6B4F';
            if (nodeType === 'boss') return '#DC2626';
            if (nodeType?.startsWith('feature_')) return '#7B4FA0';
            if (nodeType === 'junction') return '#3A7D7B';
            return '#4A4B55';
          }}
          maskColor="rgba(0, 0, 0, 0.6)"
          position="bottom-left"
          style={{
            background: '#1C1D27',
            border: '1px solid #4A4B55',
          }}
        />
      </ReactFlow>
      
      {/* Floor indicator (4.4) */}
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
          fontFamily: 'var(--font-mono)',
        }}
      >
        {floor === 0 ? 'F0' : floor > 0 ? `F+${floor}` : `F${floor}`}
      </div>
    </div>
  );
}

/**
 * FlowWrapper — Internal wrapper component with useReactFlow hook.
 * Required because useReactFlow must be called within ReactFlow context.
 */
function FlowWrapper(props: ZoneDesignerFlowProps) {
  const reactFlowInstance = useReactFlow();
  const hasInitialFit = useRef(false);

  // Fit view on initial load
  useEffect(() => {
    if (!hasInitialFit.current && props.nodes.length > 0) {
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2, duration: 200 });
      }, 50);
      hasInitialFit.current = true;
    }
  }, [props.nodes.length, reactFlowInstance]);

  // Reset fit when floor changes
  useEffect(() => {
    if (props.nodes.length > 0) {
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2, duration: 200 });
      }, 50);
    }
  }, [props.floor, reactFlowInstance]);

  return null;
}

// ─── Export Types ───────────────────────────────────────────────────────────

export type { Node as FlowNode, Edge as FlowEdge, Connection as FlowConnection };

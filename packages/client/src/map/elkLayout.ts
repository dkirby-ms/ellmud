/**
 * ELK Layout Adapter — computes room positions using elkjs hierarchical layout.
 *
 * This module will eventually replace the BFS layout engine (computeLayout.ts ~2700 lines).
 * ELK uses constraint-based hierarchical layout with better handling of complex graphs.
 *
 * Coordinate system mapping:
 * - computeLayout uses a 100×100 grid with 50×50 room nodes
 * - ELK uses pixel coordinates (we'll normalize to the same grid system)
 * - Z-axis (floors) are handled via layerConstraint or separate ELK graphs
 */

import ELK, { type ElkNode, type ElkExtendedEdge, type LayoutOptions } from 'elkjs/lib/elk.bundled.js';

// ─── Types ──────────────────────────────────────────────────────────────────

/** Room position output (matches computeLayout interface). */
export interface RoomPosition {
  x: number;
  y: number;
  z: number; // floor level (0 = ground, +1 = upper, -1 = lower)
}

/** Minimal room shape for layout input. */
export interface LayoutRoom {
  exits: Map<string, string>; // direction → targetRoomId
}

/** Compass direction for exit ports. */
export type CompassDirection = 'north' | 'south' | 'east' | 'west' | 'up' | 'down';

/** Layout options for ELK algorithm. */
export interface ElkLayoutOptions {
  /** Spacing between nodes (default: 100) */
  nodeSpacing?: number;
  /** Layer (rank) spacing (default: 100) */
  layerSpacing?: number;
  /** Edge routing algorithm (default: 'ORTHOGONAL') */
  edgeRouting?: 'POLYLINE' | 'ORTHOGONAL' | 'SPLINES';
  /** Direction of layout (default: 'RIGHT') */
  direction?: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
  /** Enable crossing minimization (default: true) */
  crossingMinimization?: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** Mapping from compass directions to port IDs. */
const DIRECTION_TO_PORT: Record<CompassDirection, string> = {
  north: 'NORTH',
  south: 'SOUTH',
  east: 'EAST',
  west: 'WEST',
  up: 'UP',
  down: 'DOWN',
};

/** Default node size (matches current 50×50 room nodes). */
const NODE_WIDTH = 50;
const NODE_HEIGHT = 50;

/** Default ELK layout options. */
const DEFAULT_ELK_OPTIONS: LayoutOptions = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  'elk.spacing.nodeNode': '100',
  'elk.layered.spacing.nodeNodeBetweenLayers': '100',
  'elk.edgeRouting': 'ORTHOGONAL',
  'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
  'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
};

// ─── Main Layout Function ───────────────────────────────────────────────────

/**
 * Compute layout positions using ELK hierarchical layout.
 *
 * @param rooms - Map of room IDs to room data (with exits)
 * @param entryRoomSlug - Entry room ID (used as layout root)
 * @param options - Optional ELK layout configuration
 * @returns Map of room IDs to (x, y, z) positions
 *
 * NOTE: This is a SKELETON implementation for Phase 0.
 * Current behavior:
 * - Converts rooms → ELK nodes with compass-direction ports
 * - Converts exits → ELK edges connecting ports
 * - Calls elk.layout() to compute positions
 * - Maps ELK output back to grid coordinates
 * - Z-axis handling is stubbed (always returns z=0)
 *
 * Future phases will:
 * - Handle multi-floor layouts (z-axis via layerConstraint or separate graphs)
 * - Optimize port placement for better visual alignment
 * - Add collision detection and overlap resolution
 * - Support incremental layout updates (preserve positions on edit)
 */
export async function computeElkLayout(
  rooms: Map<string, LayoutRoom>,
  entryRoomSlug: string,
  options?: ElkLayoutOptions,
): Promise<Map<string, RoomPosition>> {
  const elk = new ELK();
  
  // Build ELK graph structure
  const elkGraph = buildElkGraph(rooms, options);
  
  // Run ELK layout (async WASM worker)
  const layoutedGraph = await elk.layout(elkGraph);
  
  // Convert ELK output → room positions
  const positions = extractPositions(layoutedGraph);
  
  return positions;
}

// ─── Graph Construction ────────────────────────────────────────────────────

/**
 * Convert room graph → ELK graph with nodes, edges, and ports.
 */
function buildElkGraph(
  rooms: Map<string, LayoutRoom>,
  options?: ElkLayoutOptions,
): ElkNode {
  const nodes: ElkNode[] = [];
  const edges: ElkExtendedEdge[] = [];
  
  // Create ELK nodes with compass-direction ports
  for (const [roomId, room] of rooms) {
    const elkNode: ElkNode = {
      id: roomId,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      ports: [
        { id: `${roomId}_NORTH`, layoutOptions: { 'port.side': 'NORTH' } },
        { id: `${roomId}_SOUTH`, layoutOptions: { 'port.side': 'SOUTH' } },
        { id: `${roomId}_EAST`, layoutOptions: { 'port.side': 'EAST' } },
        { id: `${roomId}_WEST`, layoutOptions: { 'port.side': 'WEST' } },
        { id: `${roomId}_UP`, layoutOptions: { 'port.side': 'NORTH' } }, // vertical exits use NORTH/SOUTH sides
        { id: `${roomId}_DOWN`, layoutOptions: { 'port.side': 'SOUTH' } },
      ],
    };
    nodes.push(elkNode);
    
    // Create edges for each exit (connecting room ports)
    for (const [direction, targetId] of room.exits) {
      const portId = DIRECTION_TO_PORT[direction as CompassDirection];
      if (!portId) continue; // skip invalid directions
      
      edges.push({
        id: `${roomId}_${direction}_${targetId}`,
        sources: [`${roomId}_${portId}`],
        targets: [`${targetId}_${getOppositePort(portId)}`],
      });
    }
  }
  
  // Build root graph with layout options
  const layoutOptions = mergeLayoutOptions(options);
  
  return {
    id: 'root',
    layoutOptions,
    children: nodes,
    edges,
  };
}

/**
 * Get the opposite port for bidirectional exit edges.
 */
function getOppositePort(portId: string): string {
  const opposites: Record<string, string> = {
    NORTH: 'SOUTH',
    SOUTH: 'NORTH',
    EAST: 'WEST',
    WEST: 'EAST',
    UP: 'DOWN',
    DOWN: 'UP',
  };
  return opposites[portId] ?? portId;
}

/**
 * Merge user options with defaults.
 */
function mergeLayoutOptions(options?: ElkLayoutOptions): LayoutOptions {
  const merged = { ...DEFAULT_ELK_OPTIONS };
  
  if (!options) return merged;
  
  if (options.nodeSpacing !== undefined) {
    merged['elk.spacing.nodeNode'] = options.nodeSpacing.toString();
  }
  if (options.layerSpacing !== undefined) {
    merged['elk.layered.spacing.nodeNodeBetweenLayers'] = options.layerSpacing.toString();
  }
  if (options.edgeRouting !== undefined) {
    merged['elk.edgeRouting'] = options.edgeRouting;
  }
  if (options.direction !== undefined) {
    merged['elk.direction'] = options.direction;
  }
  
  return merged;
}

// ─── Position Extraction ────────────────────────────────────────────────────

/**
 * Extract room positions from ELK layout output.
 *
 * Converts ELK pixel coordinates → grid coordinates (÷ CELL_SIZE).
 * Z-axis is stubbed at 0 for Phase 0 (multi-floor support in future phases).
 */
function extractPositions(graph: ElkNode): Map<string, RoomPosition> {
  const positions = new Map<string, RoomPosition>();
  
  if (!graph.children) return positions;
  
  // ELK uses pixel coordinates; convert to grid units
  // Current grid: 100×100 cells, so divide by 100 to get cell coords
  const CELL_SIZE = 100;
  
  for (const node of graph.children) {
    if (!node.id) continue;
    
    const x = Math.round((node.x ?? 0) / CELL_SIZE);
    const y = Math.round((node.y ?? 0) / CELL_SIZE);
    const z = 0; // TODO: Multi-floor support (phase 1+)
    
    positions.set(node.id, { x, y, z });
  }
  
  return positions;
}

// ─── Export Configuration ───────────────────────────────────────────────────

/**
 * Default ELK configuration for zone designer layouts.
 *
 * Algorithm: 'layered' (hierarchical layout with layer assignment + crossing minimization)
 * Direction: 'RIGHT' (flows left-to-right, matches typical dungeon progression)
 * Spacing: 100px between nodes (matches current grid)
 * Edge routing: 'ORTHOGONAL' (Manhattan routing for compass-aligned exits)
 * Crossing minimization: 'LAYER_SWEEP' (reduces edge crossings)
 */
export const DEFAULT_CONFIG: ElkLayoutOptions = {
  nodeSpacing: 100,
  layerSpacing: 100,
  edgeRouting: 'ORTHOGONAL',
  direction: 'RIGHT',
  crossingMinimization: true,
};

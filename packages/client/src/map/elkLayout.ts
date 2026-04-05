/**
 * ELK Layout Adapter — computes room positions using elkjs hierarchical layout.
 *
 * This is the primary layout engine for the admin zone designer (Phase 6+).
 * The legacy BFS engine (computeLayout.ts) is used to seed compass-correct
 * initial positions, then ELK refines the layout with its INTERACTIVE mode
 * which respects the seed positions while applying crossing minimization
 * and orthogonal edge routing.
 *
 * Coordinate system:
 * - BFS outputs grid coordinates → scaled to pixels for ELK seeds
 * - ELK outputs final pixel coordinates passed directly to ReactFlow
 * - Z-axis (floors) are handled via separate ELK graphs per floor
 */

import ELK, { type ElkNode, type ElkExtendedEdge, type LayoutOptions } from 'elkjs/lib/elk.bundled.js';
import { computeLayout } from './computeLayout.js';

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
  /** Direction of layout (default: 'DOWN') */
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

/** Pixel spacing between grid cells for BFS → ELK coordinate conversion. */
const GRID_SPACING = 150;

/**
 * Default ELK layout options.
 * Uses 'fixed' algorithm to preserve BFS-seeded compass positions exactly.
 * ReactFlow handles edge routing (getBezierPath) — ELK is not needed for that.
 * The 'fixed' algorithm keeps nodes at their specified coordinates and only
 * adjusts disconnected component placement.
 */
const DEFAULT_ELK_OPTIONS: LayoutOptions = {
  'elk.algorithm': 'fixed',
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
 * Phase 2 implementation:
 * - Separates floors (z-levels) based on up/down exit traversal
 * - Runs ELK layout per-floor for 2D positioning
 * - Filters out portal exits (inter-zone) before layout
 * - Maps ELK pixel coordinates to 100×100 grid cells
 * - Handles disconnected subgraphs per floor
 */
export async function computeElkLayout(
  rooms: Map<string, LayoutRoom>,
  entryRoomSlug: string,
  options?: ElkLayoutOptions,
): Promise<Map<string, RoomPosition>> {
  const elk = new ELK();
  
  // Step 1: Compute compass-aware BFS positions as seeds for ELK.
  // This gives us correct relative placement (north=up, east=right, etc.)
  // that ELK's INTERACTIVE mode will respect.
  const bfsPositions = computeLayout(rooms, entryRoomSlug);
  
  // Step 2: Group rooms by floor (using BFS z-levels)
  const floorGroups = new Map<number, Set<string>>();
  for (const [roomId, pos] of bfsPositions) {
    const floor = pos.z;
    if (!floorGroups.has(floor)) floorGroups.set(floor, new Set());
    floorGroups.get(floor)!.add(roomId);
  }
  
  // Also add any rooms BFS couldn't reach (disconnected subgraphs)
  for (const roomId of rooms.keys()) {
    if (!bfsPositions.has(roomId)) {
      if (!floorGroups.has(0)) floorGroups.set(0, new Set());
      floorGroups.get(0)!.add(roomId);
    }
  }
  
  // Step 3: Run ELK layout per floor with BFS-seeded positions
  const positions = new Map<string, RoomPosition>();
  
  for (const [floor, roomIds] of floorGroups) {
    // Build subgraph for this floor (cardinal exits only, no up/down)
    const floorRooms = new Map<string, LayoutRoom>();
    for (const roomId of roomIds) {
      const room = rooms.get(roomId);
      if (!room) continue;
      
      // Filter out up/down exits and portal exits (targets not in this floor)
      const cardinalExits = new Map<string, string>();
      for (const [dir, target] of room.exits) {
        if (dir === 'up' || dir === 'down') continue;
        if (!roomIds.has(target)) continue;
        cardinalExits.set(dir, target);
      }
      
      floorRooms.set(roomId, { exits: cardinalExits });
    }
    
    if (floorRooms.size === 0) continue;
    
    // Build BFS seed position map for this floor (scaled to pixels)
    const seedPositions = new Map<string, { x: number; y: number }>();
    for (const roomId of roomIds) {
      const bfsPos = bfsPositions.get(roomId);
      if (bfsPos) {
        seedPositions.set(roomId, {
          x: bfsPos.x * GRID_SPACING,
          y: bfsPos.y * GRID_SPACING,
        });
      }
    }
    
    // Build ELK graph with BFS-seeded positions
    const elkGraph = buildElkGraph(floorRooms, seedPositions, options);
    
    // Run ELK layout (INTERACTIVE mode respects seed positions)
    const layoutedGraph = await elk.layout(elkGraph);
    
    // Extract positions and assign z-level
    const floorPositions = extractPositions(layoutedGraph, floor);
    for (const [roomId, pos] of floorPositions) {
      positions.set(roomId, pos);
    }
  }
  
  return positions;
}

// ─── Graph Construction ────────────────────────────────────────────────────

/**
 * Convert room graph → ELK graph with nodes, edges, and ports.
 * Seed positions from BFS are set on nodes so INTERACTIVE mode respects them.
 */
function buildElkGraph(
  rooms: Map<string, LayoutRoom>,
  seedPositions: Map<string, { x: number; y: number }>,
  options?: ElkLayoutOptions,
): ElkNode {
  const nodes: ElkNode[] = [];
  const edges: ElkExtendedEdge[] = [];
  // Track seen room pairs to deduplicate bidirectional edges
  const seenPairs = new Set<string>();
  
  // Create ELK nodes with compass-direction ports, FIXED_SIDE constraints,
  // and BFS-seeded positions for INTERACTIVE mode
  for (const [roomId, room] of rooms) {
    const seed = seedPositions.get(roomId);
    const elkNode: ElkNode = {
      id: roomId,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      // Seed position from BFS — INTERACTIVE mode uses this as reference
      ...(seed ? { x: seed.x, y: seed.y } : {}),
      layoutOptions: { 'elk.portConstraints': 'FIXED_SIDE' },
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
    
    // Create edges for each exit, deduplicating bidirectional pairs
    for (const [direction, targetId] of room.exits) {
      const portId = DIRECTION_TO_PORT[direction as CompassDirection];
      if (!portId) continue; // skip invalid directions
      
      // Deduplicate: only keep one edge per room pair
      const pairKey = [roomId, targetId].sort().join('_');
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);
      
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
 * Currently uses 'fixed' algorithm — layered-specific options are stored
 * in the config but only take effect if the algorithm is changed back.
 */
function mergeLayoutOptions(options?: ElkLayoutOptions): LayoutOptions {
  const merged = { ...DEFAULT_ELK_OPTIONS };
  
  if (!options) return merged;
  
  return merged;
}

// ─── Position Extraction ────────────────────────────────────────────────────

/**
 * Extract room positions from ELK layout output.
 *
 * Passes ELK pixel coordinates directly to the consumer (ReactFlow).
 * Assigns the provided floor number (z) to all positions.
 */
function extractPositions(graph: ElkNode, floor: number): Map<string, RoomPosition> {
  const positions = new Map<string, RoomPosition>();
  
  if (!graph.children) return positions;
  
  for (const node of graph.children) {
    if (!node.id) continue;
    
    const x = node.x ?? 0;
    const y = node.y ?? 0;
    const z = floor;
    
    positions.set(node.id, { x, y, z });
  }
  
  return positions;
}

// ─── Export Configuration ───────────────────────────────────────────────────

/**
 * Default ELK configuration for zone designer layouts.
 *
 * Algorithm: 'fixed' — preserves BFS compass-correct positions exactly.
 * BFS seeds handle compass semantics (north=up, east=right, etc.).
 * ELK handles disconnected component placement and graph validation.
 * ReactFlow handles edge routing (Bézier paths via ZoneExitEdge).
 *
 * These layered-specific options are retained in the config type for
 * future use if/when ELK's layered algorithm adds compass constraints.
 */
export const DEFAULT_CONFIG: ElkLayoutOptions = {
  nodeSpacing: 100,
  layerSpacing: 100,
  edgeRouting: 'ORTHOGONAL',
  direction: 'RIGHT',
  crossingMinimization: true,
};

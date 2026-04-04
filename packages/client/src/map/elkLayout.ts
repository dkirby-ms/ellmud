/**
 * ELK Layout Adapter — computes room positions using elkjs hierarchical layout.
 *
 * This is the primary layout engine for the admin zone designer (Phase 6+).
 * The legacy BFS engine (computeLayout.ts) is deprecated for new work but
 * retained for the player minimap which requires synchronous layout.
 *
 * Coordinate system mapping:
 * - ELK uses pixel coordinates; we normalize to a 100×100 grid
 * - Z-axis (floors) are handled via separate ELK graphs per floor
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
  
  // Step 1: Assign floors via BFS traversal of up/down exits
  const floorAssignments = assignFloors(rooms, entryRoomSlug);
  
  // Step 2: Group rooms by floor
  const floorGroups = new Map<number, Set<string>>();
  for (const [roomId, floor] of floorAssignments) {
    if (!floorGroups.has(floor)) floorGroups.set(floor, new Set());
    floorGroups.get(floor)!.add(roomId);
  }
  
  // Step 3: Run ELK layout per floor
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
        // Skip up/down (z-axis)
        if (dir === 'up' || dir === 'down') continue;
        // Skip portal exits (targets not in roomIds set)
        if (!roomIds.has(target)) continue;
        cardinalExits.set(dir, target);
      }
      
      floorRooms.set(roomId, { exits: cardinalExits });
    }
    
    // Skip empty floors
    if (floorRooms.size === 0) continue;
    
    // Build ELK graph for this floor
    const elkGraph = buildElkGraph(floorRooms, options);
    
    // Run ELK layout
    const layoutedGraph = await elk.layout(elkGraph);
    
    // Extract positions and assign z-level
    const floorPositions = extractPositions(layoutedGraph, floor);
    for (const [roomId, pos] of floorPositions) {
      positions.set(roomId, pos);
    }
  }
  
  return positions;
}

// ─── Floor Assignment (Z-axis) ──────────────────────────────────────────────

/**
 * Assign floor numbers (z-levels) via BFS traversal of up/down exits.
 * Entry room starts at z=0. Each 'up' exit increments z, each 'down' decrements z.
 */
function assignFloors(
  rooms: Map<string, LayoutRoom>,
  entryRoomSlug: string,
): Map<string, number> {
  const floors = new Map<string, number>();
  const queue: Array<{ roomId: string; floor: number }> = [];
  
  // Start at entry room, floor 0
  if (!rooms.has(entryRoomSlug)) {
    // Fallback: if entry room doesn't exist, use first room
    const firstRoom = rooms.keys().next().value;
    if (firstRoom) {
      queue.push({ roomId: firstRoom, floor: 0 });
      floors.set(firstRoom, 0);
    }
  } else {
    queue.push({ roomId: entryRoomSlug, floor: 0 });
    floors.set(entryRoomSlug, 0);
  }
  
  // BFS traversal
  while (queue.length > 0) {
    const { roomId, floor } = queue.shift()!;
    const room = rooms.get(roomId);
    if (!room) continue;
    
    for (const [direction, targetId] of room.exits) {
      // Skip if already visited
      if (floors.has(targetId)) continue;
      
      // Calculate target floor based on direction
      let targetFloor = floor;
      if (direction === 'up') targetFloor = floor + 1;
      else if (direction === 'down') targetFloor = floor - 1;
      
      floors.set(targetId, targetFloor);
      queue.push({ roomId: targetId, floor: targetFloor });
    }
  }
  
  return floors;
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
 * Assigns the provided floor number (z) to all positions.
 */
function extractPositions(graph: ElkNode, floor: number): Map<string, RoomPosition> {
  const positions = new Map<string, RoomPosition>();
  
  if (!graph.children) return positions;
  
  // ELK uses pixel coordinates; convert to grid units
  // Current grid: 100×100 cells, so divide by 100 to get cell coords
  const CELL_SIZE = 100;
  
  for (const node of graph.children) {
    if (!node.id) continue;
    
    const x = Math.round((node.x ?? 0) / CELL_SIZE);
    const y = Math.round((node.y ?? 0) / CELL_SIZE);
    const z = floor;
    
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

/**
 * BFS Layout Engine — computes (x, y, z) positions for a room graph.
 *
 * Pure function. No React, no side effects. Used by both the player
 * minimap and the admin zone designer.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RoomPosition {
  x: number;
  y: number;
  z: number; // 0 = same level, +1 = up, -1 = down (badge, not spatial offset)
}

/** Minimal room shape the layout engine needs. */
export interface LayoutRoom {
  exits: Map<string, string>; // direction → targetRoomId
}

// ─── Direction → Offset Mapping ──────────────────────────────────────────────

interface Offset {
  dx: number;
  dy: number;
  dz: number;
}

const DIRECTION_OFFSETS: Record<string, Offset> = {
  north: { dx: 0, dy: -1, dz: 0 },
  south: { dx: 0, dy: 1, dz: 0 },
  east: { dx: 1, dy: 0, dz: 0 },
  west: { dx: -1, dy: 0, dz: 0 },
  up: { dx: 0, dy: 0, dz: 1 },
  down: { dx: 0, dy: 0, dz: -1 },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Encode a 2D cell coordinate as a set key. */
function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

/**
 * Spiral outward from (cx, cy) to find the nearest unoccupied cell.
 * Searches in concentric rings of increasing Manhattan distance.
 */
function findNearestUnoccupied(
  cx: number,
  cy: number,
  occupied: Set<string>,
): { x: number; y: number } {
  if (!occupied.has(cellKey(cx, cy))) return { x: cx, y: cy };

  for (let radius = 1; ; radius++) {
    // Walk the ring at this Manhattan distance.
    // Top edge: y = cy - radius, x from cx - radius to cx + radius
    for (let dx = -radius; dx <= radius; dx++) {
      const dy = -(radius - Math.abs(dx));
      const key = cellKey(cx + dx, cy + dy);
      if (!occupied.has(key)) return { x: cx + dx, y: cy + dy };
    }
    // Bottom edge (skip corners already visited above)
    for (let dx = -radius; dx <= radius; dx++) {
      const dy = radius - Math.abs(dx);
      if (dy === -(radius - Math.abs(dx))) continue; // already checked (only when dy==0 and dx==±radius)
      const key = cellKey(cx + dx, cy + dy);
      if (!occupied.has(key)) return { x: cx + dx, y: cy + dy };
    }
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Compute spatial (x, y, z) coordinates for each room in a room graph
 * using direction-aware BFS.
 *
 * @param rooms      Map of roomId → { exits: Map<direction, targetRoomId> }
 * @param entryRoomId  The room to start BFS from (placed at 0,0,0)
 * @returns Map of roomId → RoomPosition
 */
export function computeLayout(
  rooms: Map<string, LayoutRoom>,
  entryRoomId: string,
): Map<string, RoomPosition> {
  const result = new Map<string, RoomPosition>();
  const occupied = new Set<string>(); // tracks used (x,y) cells

  /**
   * BFS from a given room, placing it at (startX, startY, startZ).
   */
  function bfs(startId: string, startX: number, startY: number, startZ: number): void {
    if (result.has(startId)) return;

    result.set(startId, { x: startX, y: startY, z: startZ });
    occupied.add(cellKey(startX, startY));

    const queue: string[] = [startId];

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (currentId === undefined) continue;
      const current = rooms.get(currentId);
      if (!current) continue;

      const currentPos = result.get(currentId);
      if (!currentPos) continue;

      for (const [direction, targetId] of current.exits) {
        // Skip if target is already placed or doesn't exist in the graph
        if (result.has(targetId)) continue;
        if (!rooms.has(targetId)) continue;

        const offset = DIRECTION_OFFSETS[direction];
        if (!offset) continue;

        let targetX: number;
        let targetY: number;
        const targetZ = currentPos.z + offset.dz;

        if (offset.dz !== 0) {
          // up/down: same (x,y), different z-layer
          targetX = currentPos.x;
          targetY = currentPos.y;
        } else {
          // Cardinal direction: compute ideal position, resolve collisions
          const idealX = currentPos.x + offset.dx;
          const idealY = currentPos.y + offset.dy;
          const nearest = findNearestUnoccupied(idealX, idealY, occupied);
          targetX = nearest.x;
          targetY = nearest.y;
        }

        result.set(targetId, { x: targetX, y: targetY, z: targetZ });
        occupied.add(cellKey(targetX, targetY));
        queue.push(targetId);
      }
    }
  }

  // Phase 1: BFS from entry room
  if (rooms.has(entryRoomId)) {
    bfs(entryRoomId, 0, 0, 0);
  }

  // Phase 2: Handle disconnected subgraphs
  // Find the bounding box of placed rooms to offset disconnected components
  for (const roomId of rooms.keys()) {
    if (result.has(roomId)) continue;

    // Compute bounding box of all placed rooms to find a clear offset
    let maxX = 0;
    for (const pos of result.values()) {
      if (pos.x > maxX) maxX = pos.x;
    }

    // Place disconnected component to the right of everything so far
    const offsetX = maxX + 3; // gap of 2 cells between components
    bfs(roomId, offsetX, 0, 0);
  }

  return result;
}

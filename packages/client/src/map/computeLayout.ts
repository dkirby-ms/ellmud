/**
 * BFS Layout Engine — computes (x, y, z) positions for a room graph.
 *
 * Pure function. No React, no side effects. Used by both the player
 * minimap and the admin zone designer.
 *
 * Grid-aware: detects rectangular grid structures (rooms where
 * perpendicular paths converge on the same diagonal room) and places
 * them as coherent blocks, preventing BFS-order displacement.
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

interface GridClusterInfo {
  clusterId: number;
  dx: number; // relative x within the grid cluster
  dy: number; // relative y within the grid cluster
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

const PERPENDICULAR_PAIRS: [string, string][] = [
  ["north", "east"],
  ["north", "west"],
  ["south", "east"],
  ["south", "west"],
];

const MIN_GRID_CLUSTER_SIZE = 9; // 3×3 minimum

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Encode a 2D cell coordinate as a set key. */
function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

/**
 * Spiral outward from (cx, cy) to find the nearest unoccupied cell.
 * Searches in concentric rings of increasing Manhattan distance.
 * Used for disconnected subgraph placement.
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

/**
 * Find the nearest unoccupied cell with directional bias.
 * Searches outward in rings (Manhattan distance) but within each ring,
 * picks the candidate most aligned with the exit direction using dot product.
 * Prevents rooms from being placed perpendicular or opposite to their exit direction.
 */
function findNearestDirectional(
  idealX: number,
  idealY: number,
  dirDx: number,
  dirDy: number,
  occupied: Set<string>,
): { x: number; y: number } {
  if (!occupied.has(cellKey(idealX, idealY))) return { x: idealX, y: idealY };

  for (let radius = 1; radius < 200; radius++) {
    let best: { x: number; y: number } | null = null;
    let bestScore = -Infinity;

    for (let ddx = -radius; ddx <= radius; ddx++) {
      const absRemainder = radius - Math.abs(ddx);
      const dyOptions = absRemainder === 0 ? [0] : [-absRemainder, absRemainder];

      for (const ddy of dyOptions) {
        const cx = idealX + ddx;
        const cy = idealY + ddy;
        if (occupied.has(cellKey(cx, cy))) continue;

        // Dot product with direction vector — prefer cells aligned with exit direction
        const score = ddx * dirDx + ddy * dirDy;
        if (score > bestScore) {
          bestScore = score;
          best = { x: cx, y: cy };
        }
      }
    }

    if (best) return best;
  }

  return { x: idealX, y: idealY };
}

// ─── Grid Detection ──────────────────────────────────────────────────────────

/**
 * A room has the "grid property" if walking two perpendicular cardinal
 * directions reaches the same diagonal room regardless of order:
 *
 *     A ──east──▶ B          A.east.south === A.south.east
 *     │              │
 *   south          south
 *     ▼              ▼
 *     C ──east──▶ D          (both paths reach D)
 *
 * This identifies rooms that belong to rectangular grid structures
 * while excluding linear corridors and tree-shaped approach areas.
 */
function hasGridProperty(
  roomId: string,
  rooms: Map<string, LayoutRoom>,
): boolean {
  const room = rooms.get(roomId);
  if (!room) return false;

  for (const [dir1, dir2] of PERPENDICULAR_PAIRS) {
    const neighbor1 = room.exits.get(dir1);
    const neighbor2 = room.exits.get(dir2);
    if (!neighbor1 || !neighbor2) continue;

    const r1 = rooms.get(neighbor1);
    const r2 = rooms.get(neighbor2);
    if (!r1 || !r2) continue;

    const diagonal1 = r1.exits.get(dir2);
    const diagonal2 = r2.exits.get(dir1);
    if (diagonal1 && diagonal1 === diagonal2) return true;
  }

  return false;
}

/**
 * Detect rectangular grid clusters in the room graph.
 *
 * 1. Find all rooms with the grid property (perpendicular path convergence).
 * 2. Flood-fill connected grid rooms using cardinal exits, assigning
 *    relative (dx, dy) positions within each cluster.
 * 3. Filter out clusters smaller than MIN_GRID_CLUSTER_SIZE.
 */
function detectGridClusters(
  rooms: Map<string, LayoutRoom>,
): Map<string, GridClusterInfo> {
  const gridRoomIds = new Set<string>();
  for (const [id] of rooms) {
    if (hasGridProperty(id, rooms)) gridRoomIds.add(id);
  }

  const result = new Map<string, GridClusterInfo>();
  let nextCluster = 0;

  for (const seedId of gridRoomIds) {
    if (result.has(seedId)) continue;

    const members = new Map<string, { dx: number; dy: number }>();
    const posToRoom = new Map<string, string>();
    const queue: Array<{ id: string; dx: number; dy: number }> = [];

    members.set(seedId, { dx: 0, dy: 0 });
    posToRoom.set("0,0", seedId);
    queue.push({ id: seedId, dx: 0, dy: 0 });

    while (queue.length > 0) {
      const { id, dx, dy } = queue.shift()!;
      const room = rooms.get(id)!;

      for (const [dir, targetId] of room.exits) {
        if (!gridRoomIds.has(targetId)) continue; // only expand to grid rooms
        if (members.has(targetId)) continue;

        const offset = DIRECTION_OFFSETS[dir];
        if (!offset || offset.dz !== 0) continue; // cardinal only

        const tdx = dx + offset.dx;
        const tdy = dy + offset.dy;
        const posKey = `${tdx},${tdy}`;

        if (posToRoom.has(posKey)) continue; // position collision

        members.set(targetId, { dx: tdx, dy: tdy });
        posToRoom.set(posKey, targetId);
        queue.push({ id: targetId, dx: tdx, dy: tdy });
      }
    }

    if (members.size < MIN_GRID_CLUSTER_SIZE) continue;

    const clusterId = nextCluster++;
    for (const [roomId, pos] of members) {
      result.set(roomId, { clusterId, dx: pos.dx, dy: pos.dy });
    }
  }

  return result;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Compute spatial (x, y, z) coordinates for each room in a room graph
 * using direction-aware BFS with grid-block awareness.
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

  // Pre-detect grid clusters before BFS
  const gridClusters = detectGridClusters(rooms);
  const placedClusters = new Set<number>();

  // Index cluster members for fast lookup
  const clusterMembers = new Map<
    number,
    Array<{ id: string; dx: number; dy: number }>
  >();
  for (const [roomId, info] of gridClusters) {
    let arr = clusterMembers.get(info.clusterId);
    if (!arr) {
      arr = [];
      clusterMembers.set(info.clusterId, arr);
    }
    arr.push({ id: roomId, dx: info.dx, dy: info.dy });
  }

  /**
   * Place an entire grid cluster as a block, anchored so that `anchorRoomId`
   * lands at (anchorX, anchorY). If any grid cell collides with an already-
   * occupied position, the whole block is shifted outward (spiral search)
   * until a collision-free placement is found.
   */
  function placeGridCluster(
    clusterId: number,
    anchorRoomId: string,
    anchorX: number,
    anchorY: number,
    anchorZ: number,
    queue: string[],
  ): void {
    const members = clusterMembers.get(clusterId);
    if (!members) return;

    const anchorInfo = gridClusters.get(anchorRoomId)!;

    // Compute ideal positions for all members relative to anchor
    const positions = members.map((m) => ({
      id: m.id,
      relX: m.dx - anchorInfo.dx,
      relY: m.dy - anchorInfo.dy,
    }));

    // Find the smallest shift (spiral) that avoids all collisions
    let shiftX = 0;
    let shiftY = 0;
    outer: for (let radius = 0; radius < 200; radius++) {
      if (radius === 0) {
        // Try no shift first
        let collision = false;
        for (const p of positions) {
          if (occupied.has(cellKey(anchorX + p.relX, anchorY + p.relY))) {
            collision = true;
            break;
          }
        }
        if (!collision) break;
      } else {
        // Try all offsets at this Manhattan distance
        for (let dx = -radius; dx <= radius; dx++) {
          for (const sign of [-1, 1]) {
            const dy = sign * (radius - Math.abs(dx));
            let collision = false;
            for (const p of positions) {
              if (
                occupied.has(
                  cellKey(anchorX + p.relX + dx, anchorY + p.relY + dy),
                )
              ) {
                collision = true;
                break;
              }
            }
            if (!collision) {
              shiftX = dx;
              shiftY = dy;
              break outer;
            }
            if (dy === 0) break; // avoid checking (dx, 0) twice
          }
        }
      }
    }

    // Place all members
    for (const p of positions) {
      const x = anchorX + p.relX + shiftX;
      const y = anchorY + p.relY + shiftY;
      result.set(p.id, { x, y, z: anchorZ });
      occupied.add(cellKey(x, y));
      queue.push(p.id);
    }

    placedClusters.add(clusterId);
  }

  /**
   * BFS from a given room, placing it at (startX, startY, startZ).
   * When encountering a grid-cluster room for the first time, the
   * entire cluster is placed as a block.
   */
  function bfs(
    startId: string,
    startX: number,
    startY: number,
    startZ: number,
  ): void {
    if (result.has(startId)) return;

    const queue: string[] = [];

    // Check if start room is part of an unplaced grid cluster
    const startGrid = gridClusters.get(startId);
    if (startGrid && !placedClusters.has(startGrid.clusterId)) {
      placeGridCluster(
        startGrid.clusterId,
        startId,
        startX,
        startY,
        startZ,
        queue,
      );
    } else {
      result.set(startId, { x: startX, y: startY, z: startZ });
      occupied.add(cellKey(startX, startY));
      queue.push(startId);
    }

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

        // Check if target is part of an unplaced grid cluster
        const targetGrid = gridClusters.get(targetId);
        if (targetGrid && !placedClusters.has(targetGrid.clusterId)) {
          const idealX = currentPos.x + offset.dx;
          const idealY = currentPos.y + offset.dy;
          placeGridCluster(
            targetGrid.clusterId,
            targetId,
            idealX,
            idealY,
            currentPos.z + offset.dz,
            queue,
          );
          continue;
        }

        let targetX: number;
        let targetY: number;
        const targetZ = currentPos.z + offset.dz;

        if (offset.dz !== 0) {
          // up/down: same (x,y), different z-layer
          targetX = currentPos.x;
          targetY = currentPos.y;
        } else {
          // Cardinal direction: compute ideal position, resolve collisions with directional bias
          const idealX = currentPos.x + offset.dx;
          const idealY = currentPos.y + offset.dy;
          const nearest = findNearestDirectional(idealX, idealY, offset.dx, offset.dy, occupied);
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

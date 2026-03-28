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
 * Z-levels are laid out independently: up/down exits are deferred during
 * BFS and each target z-level is anchored at its entry point, then
 * expanded using only cardinal exits. This prevents surface room
 * positions from distorting sub-level topology.
 *
 * Each z-level has its own occupied-cell set, so rooms on different
 * floors can share (x, y) without conflict (the designer shows one
 * floor at a time).
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

  // Per z-level occupied sets — rooms on different z-levels can share (x,y)
  const occupiedByZ = new Map<number, Set<string>>();

  function getOccupied(z: number): Set<string> {
    let set = occupiedByZ.get(z);
    if (!set) {
      set = new Set<string>();
      occupiedByZ.set(z, set);
    }
    return set;
  }

  // Deferred z-transitions: collected during BFS, processed after.
  interface ZTransition {
    sourceId: string;
    targetId: string;
    targetZ: number;
  }
  const pendingZTransitions: ZTransition[] = [];

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

    const occupied = getOccupied(anchorZ);
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
   * Only processes cardinal directions; up/down exits are deferred to
   * pendingZTransitions for independent z-level layout.
   */
  function bfs(
    startId: string,
    startX: number,
    startY: number,
    startZ: number,
  ): void {
    if (result.has(startId)) return;

    const occupied = getOccupied(startZ);
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
      // Resolve collision at anchor position (can happen when multiple
      // z-transitions target the same z-level at overlapping coordinates)
      const start = findNearestUnoccupied(startX, startY, occupied);
      result.set(startId, { x: start.x, y: start.y, z: startZ });
      occupied.add(cellKey(start.x, start.y));
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
        if (result.has(targetId)) continue;
        if (!rooms.has(targetId)) continue;

        const offset = DIRECTION_OFFSETS[direction];
        if (!offset) continue;

        // Defer up/down exits for independent z-level layout
        if (offset.dz !== 0) {
          pendingZTransitions.push({
            sourceId: currentId,
            targetId,
            targetZ: currentPos.z + offset.dz,
          });
          continue;
        }

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
            startZ,
            queue,
          );
          continue;
        }

        // Cardinal direction: compute ideal position, resolve collisions
        const idealX = currentPos.x + offset.dx;
        const idealY = currentPos.y + offset.dy;
        const nearest = findNearestDirectional(
          idealX,
          idealY,
          offset.dx,
          offset.dy,
          occupied,
        );

        result.set(targetId, { x: nearest.x, y: nearest.y, z: startZ });
        occupied.add(cellKey(nearest.x, nearest.y));
        queue.push(targetId);
      }
    }
  }

  // ── Phase 1: BFS the primary z-level (z=0) ────────────────────────────────
  if (rooms.has(entryRoomId)) {
    bfs(entryRoomId, 0, 0, 0);
  }

  // ── Phase 2: Lay out each deferred z-level independently ───────────────────
  // Process in rounds — a sub-level BFS may discover further up/down exits
  // to even deeper levels (z=-2, etc.), which are deferred and handled in
  // the next iteration of this loop.
  const processedTransitions = new Set<string>();

  while (pendingZTransitions.length > 0) {
    const batch = [...pendingZTransitions];
    pendingZTransitions.length = 0;

    for (const t of batch) {
      const key = `${t.sourceId}->${t.targetId}`;
      if (processedTransitions.has(key)) continue;
      processedTransitions.add(key);

      // Target may already be placed by BFS from an earlier anchor
      if (result.has(t.targetId)) continue;

      const sourcePos = result.get(t.sourceId);
      if (!sourcePos) continue;

      // Anchor the sub-level room at the source's (x,y) on the new z
      bfs(t.targetId, sourcePos.x, sourcePos.y, t.targetZ);
    }
  }

  // ── Phase 3: Handle disconnected subgraphs ─────────────────────────────────
  for (const roomId of rooms.keys()) {
    if (result.has(roomId)) continue;

    let maxX = 0;
    for (const p of result.values()) {
      if (p.x > maxX) maxX = p.x;
    }

    const offsetX = maxX + 3;
    bfs(roomId, offsetX, 0, 0);
  }

  // ── Phase 4: Diagonal optimization ─────────────────────────────────────────
  // BFS order can cause a room to be placed by an earlier neighbor, creating
  // a diagonal line for a later neighbor's cardinal exit. This pass detects
  // diagonal cardinal exits and relocates rooms to eliminate them.
  optimizeDiagonals();

  return result;

  // ── Diagonal optimization helpers ──────────────────────────────────────────

  /**
   * Count how many of a room's cardinal exits are visually diagonal
   * (the line between the two rooms changes both x and y) when
   * the room is at the given position.
   */
  function countVisualDiagonals(
    roomId: string,
    atPos: { x: number; y: number; z: number },
  ): number {
    const room = rooms.get(roomId);
    if (!room) return 0;

    let count = 0;
    for (const [direction, neighborId] of room.exits) {
      const offset = DIRECTION_OFFSETS[direction];
      if (!offset || offset.dz !== 0) continue;

      const neighborPos = result.get(neighborId);
      if (!neighborPos || neighborPos.z !== atPos.z) continue;

      // Diagonal: both x and y differ between the two rooms
      if (atPos.x !== neighborPos.x && atPos.y !== neighborPos.y) {
        count++;
      }
    }
    return count;
  }

  /**
   * Iteratively relocate rooms to eliminate diagonal cardinal exits.
   * For each diagonal, tries moving the target to the source's ideal
   * position. Accepts moves that don't increase the target's own
   * diagonal count (the source always gains one fix, so net improves).
   */
  function optimizeDiagonals(): void {
    for (const [z, occupied] of occupiedByZ) {
      let improved = true;
      let iterations = 0;

      while (improved && iterations < 100) {
        improved = false;
        iterations++;

        for (const [roomId, pos] of result) {
          if (pos.z !== z) continue;
          const room = rooms.get(roomId);
          if (!room) continue;

          for (const [direction, targetId] of room.exits) {
            const offset = DIRECTION_OFFSETS[direction];
            if (!offset || offset.dz !== 0) continue;

            const targetPos = result.get(targetId);
            if (!targetPos || targetPos.z !== z) continue;

            // Skip if not visually diagonal
            if (pos.x === targetPos.x || pos.y === targetPos.y) continue;

            // Try to move the target to the ideal position
            const idealX = pos.x + offset.dx;
            const idealY = pos.y + offset.dy;
            const idealKey = cellKey(idealX, idealY);

            if (occupied.has(idealKey)) continue;

            // Accept if target's diagonal count doesn't increase
            const diagsBefore = countVisualDiagonals(targetId, targetPos);
            const newPos = { x: idealX, y: idealY, z };
            const diagsAfter = countVisualDiagonals(targetId, newPos);

            if (diagsAfter <= diagsBefore) {
              occupied.delete(cellKey(targetPos.x, targetPos.y));
              occupied.add(idealKey);
              result.set(targetId, newPos);
              improved = true;
            }
          }
        }
      }
    }
  }
}

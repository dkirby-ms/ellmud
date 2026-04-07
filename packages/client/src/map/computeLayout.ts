/**
 * BFS Layout Engine — computes (x, y, z) positions for a room graph.
 *
 * Used by the ELK adapter (elkLayout.ts) as the compass-aware seed
 * position engine — ELK's INTERACTIVE mode respects these seeds for
 * correct north/south/east/west room placement. Also used by the
 * player minimap (`useExplorationMap`) for synchronous client-side layout.
 *
 * Pure function. No React, no side effects.
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

// ─── Layout Constants ────────────────────────────────────────────────────────

/** Maximum spiral search radius before giving up. */
const MAX_SEARCH_RADIUS = 500;

/** Penalty for diagonal exits (connected rooms not axis-aligned). */
const DIAGONAL_PENALTY = 20;

/** Penalty for direction-violated exits (e.g. east exit with dx ≤ 0). */
const DIRECTION_MISMATCH_PENALTY = 50;

/** Light occlusion penalty for rooms on exit line segments (early phases). */
const OCCLUSION_PENALTY_LIGHT = 3;

/** Heavy occlusion penalty for dedicated occlusion fix phase. */
const OCCLUSION_PENALTY_HEAVY = 15;

/** Max force-relaxation iterations per z-level. */
const FORCE_RELAXATION_ITERATIONS = 200;

/** Diamond search radius around the ideal position during relaxation. */
const RELAX_CANDIDATE_RADIUS = 4;

/** Diamond search radius around each neighbor's "want" position. */
const NEIGHBOR_CANDIDATE_RADIUS = 2;

/** Max pairwise swap iterations. */
const SWAP_ITERATIONS = 50;

/** Max single-room move iterations after each swap round. */
const POST_SWAP_MOVE_ITERATIONS = 50;

/** Max diagonal cascade fix passes. */
const DIAGONAL_CASCADE_PASSES = 60;

/** Search radius when displacing an occupant during diagonal fix. */
const DIAGONAL_DISPLACE_RADIUS = 5;

/** Max rooms in a push/cascade group before aborting. */
const MAX_PUSH_GROUP_SIZE = 40;

/** Post-diagonal single-room relaxation iterations. */
const POST_DIAGONAL_RELAX_ITERATIONS = 100;

/** Diamond search radius in post-diagonal relaxation. */
const POST_DIAGONAL_CANDIDATE_RADIUS = 3;

/** Max direction violation repair passes. */
const DIRECTION_VIOLATION_PASSES = 100;

/** Diamond search radius for direction violation candidate moves. */
const VIOLATION_CANDIDATE_RADIUS = 10;

/** Diamond search radius for direction violation swaps. */
const VIOLATION_SWAP_RADIUS = 4;

/** Max occlusion fix iterations. */
const OCCLUSION_FIX_ITERATIONS = 200;

/** Wide diamond search radius for occluder displacement. */
const OCCLUDER_SEARCH_RADIUS = 8;

/** Diamond search radius for two-move occluder relocation. */
const TWO_MOVE_OCCLUDER_RADIUS = 6;

/** Diamond search radius for evictee relocation in two-move strategy. */
const TWO_MOVE_EVICTEE_RADIUS = 4;

/** Diamond search radius for segment compaction. */
const COMPACTION_CANDIDATE_RADIUS = 2;

/** Max grid expansion passes. */
const EXPANSION_PASSES = 40;

/** Max rooms in a direction violation shift group. */
const MAX_VIOLATION_GROUP_SIZE = 60;

/** Max rooms in an expansion shift group. */
const MAX_EXPANSION_GROUP_SIZE = 90;

/** Gap between disconnected subgraphs. */
const DISCONNECTED_SUBGRAPH_GAP = 3;

/** Number of expansion + occlusion cleanup rounds. */
const EXPANSION_OCCLUSION_ROUNDS = 3;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Yield cell coordinates in expanding diamond (Manhattan distance) order.
 * Each ring at distance r contains all cells exactly r steps from center.
 */
function* diamondCandidates(
  cx: number,
  cy: number,
  minRadius: number,
  maxRadius: number,
): Generator<{ x: number; y: number }> {
  for (let r = minRadius; r <= maxRadius; r++) {
    for (let ddx = -r; ddx <= r; ddx++) {
      const absRem = r - Math.abs(ddx);
      const dyOpts = absRem === 0 ? [0] : [-absRem, absRem];
      for (const ddy of dyOpts) {
        yield { x: cx + ddx, y: cy + ddy };
      }
    }
  }
}

/** Encode a 2D cell coordinate as a set key. */
function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

/**
 * Spiral outward from (cx, cy) to find the nearest unoccupied cell.
 * Searches in concentric rings of increasing Manhattan distance.
 * Returns the start position if no free cell is found within MAX_SEARCH_RADIUS.
 */
function findNearestUnoccupied(
  cx: number,
  cy: number,
  occupied: Set<string>,
): { x: number; y: number } {
  if (!occupied.has(cellKey(cx, cy))) return { x: cx, y: cy };

  for (const c of diamondCandidates(cx, cy, 1, MAX_SEARCH_RADIUS)) {
    if (!occupied.has(cellKey(c.x, c.y))) return c;
  }

  return { x: cx, y: cy };
}

/**
 * Find the nearest unoccupied cell with directional bias.
 * Searches outward in rings (Manhattan distance) but within each ring,
 * picks the candidate most aligned with the exit direction using dot product.
 * Prevents rooms from being placed perpendicular or opposite to their exit direction.
 *
 * When `exitLineCells` is provided, cells on exit line segments between
 * already-placed rooms are treated as soft-blocked: candidates NOT on
 * exit lines are preferred, but if no alternative exists within a ring,
 * exit-line candidates are still accepted (with a score penalty).
 */
function findNearestDirectional(
  idealX: number,
  idealY: number,
  dirDx: number,
  dirDy: number,
  occupied: Set<string>,
  exitLineCells?: Set<string>,
): { x: number; y: number } {
  // Hard directional constraint: the placed room must be strictly in the
  // correct direction from the parent (parent = ideal - offset).
  const parentX = idealX - dirDx;
  const parentY = idealY - dirDy;

  function satisfiesDirection(cx: number, cy: number): boolean {
    if (dirDx > 0 && cx <= parentX) return false; // east: must be right of parent
    if (dirDx < 0 && cx >= parentX) return false; // west: must be left of parent
    if (dirDy > 0 && cy <= parentY) return false; // south: must be below parent
    if (dirDy < 0 && cy >= parentY) return false; // north: must be above parent
    return true;
  }

  if (!occupied.has(cellKey(idealX, idealY))) {
    if (!exitLineCells || !exitLineCells.has(cellKey(idealX, idealY))) {
      return { x: idealX, y: idealY };
    }
  }

  for (let radius = 1; radius <= MAX_SEARCH_RADIUS; radius++) {
    let best: { x: number; y: number } | null = null;
    let bestScore = -Infinity;
    let bestOnLine: { x: number; y: number } | null = null;
    let bestOnLineScore = -Infinity;

    for (const c of diamondCandidates(idealX, idealY, radius, radius)) {
      if (occupied.has(cellKey(c.x, c.y))) continue;
      if (!satisfiesDirection(c.x, c.y)) continue;

      const score = (c.x - idealX) * dirDx + (c.y - idealY) * dirDy;
      const onLine = exitLineCells?.has(cellKey(c.x, c.y));

      if (onLine) {
        if (score > bestOnLineScore) {
          bestOnLineScore = score;
          bestOnLine = c;
        }
      } else {
        if (score > bestScore) {
          bestScore = score;
          best = c;
        }
      }
    }

    if (best) return best;
    if (bestOnLine) return bestOnLine;
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

    // Try no shift first
    let needsShift = false;
    for (const p of positions) {
      if (occupied.has(cellKey(anchorX + p.relX, anchorY + p.relY))) {
        needsShift = true;
        break;
      }
    }

    if (needsShift) {
      for (const c of diamondCandidates(0, 0, 1, MAX_SEARCH_RADIUS)) {
        let collision = false;
        for (const p of positions) {
          if (occupied.has(cellKey(anchorX + p.relX + c.x, anchorY + p.relY + c.y))) {
            collision = true;
            break;
          }
        }
        if (!collision) {
          shiftX = c.x;
          shiftY = c.y;
          break;
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

    // Track cells that lie on exit line segments between already-placed rooms.
    // Updated incrementally as rooms are placed during BFS.
    const exitLineCells = new Set<string>();

    /** Add exit line cells for a newly placed room's connections to already-placed neighbors. */
    function updateExitLines(roomId: string): void {
      const room = rooms.get(roomId);
      if (!room) return;
      const rp = result.get(roomId);
      if (!rp) return;

      for (const [dir, neighborId] of room.exits) {
        const off = DIRECTION_OFFSETS[dir];
        if (!off || off.dz !== 0) continue;
        const np = result.get(neighborId);
        if (!np || np.z !== startZ) continue;

        // Only mark intermediate cells on straight-line (axis-aligned) segments
        if (rp.x === np.x) {
          const minY = Math.min(rp.y, np.y);
          const maxY = Math.max(rp.y, np.y);
          for (let y = minY + 1; y < maxY; y++) {
            const k = cellKey(rp.x, y);
            if (!occupied.has(k)) exitLineCells.add(k);
          }
        } else if (rp.y === np.y) {
          const minX = Math.min(rp.x, np.x);
          const maxX = Math.max(rp.x, np.x);
          for (let x = minX + 1; x < maxX; x++) {
            const k = cellKey(x, rp.y);
            if (!occupied.has(k)) exitLineCells.add(k);
          }
        }
      }
    }

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
      // Update exit lines for all placed cluster members
      for (const qid of queue) updateExitLines(qid);
    } else {
      // Resolve collision at anchor position (can happen when multiple
      // z-transitions target the same z-level at overlapping coordinates)
      const start = findNearestUnoccupied(startX, startY, occupied);
      result.set(startId, { x: start.x, y: start.y, z: startZ });
      occupied.add(cellKey(start.x, start.y));
      queue.push(startId);
      updateExitLines(startId);
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
          // Update exit lines for newly placed cluster members
          const members = clusterMembers.get(targetGrid.clusterId);
          if (members) {
            for (const m of members) updateExitLines(m.id);
          }
          continue;
        }

        // Cardinal direction: compute ideal position, resolve collisions,
        // avoid placing on exit line segments of already-placed rooms
        const idealX = currentPos.x + offset.dx;
        const idealY = currentPos.y + offset.dy;
        const nearest = findNearestDirectional(
          idealX,
          idealY,
          offset.dx,
          offset.dy,
          occupied,
          exitLineCells,
        );

        result.set(targetId, { x: nearest.x, y: nearest.y, z: startZ });
        occupied.add(cellKey(nearest.x, nearest.y));
        // Remove from exit line cells since it's now occupied
        exitLineCells.delete(cellKey(nearest.x, nearest.y));
        queue.push(targetId);
        updateExitLines(targetId);
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

    const offsetX = maxX + DISCONNECTED_SUBGRAPH_GAP;
    bfs(roomId, offsetX, 0, 0);
  }

  // ── Direction reversal guard ────────────────────────────────────────────────
  // Pre-build reverse adjacency: for each room, which rooms exit toward it?
  const reverseExits = new Map<string, Array<{ fromId: string; dir: string }>>();
  for (const [rid, room] of rooms) {
    for (const [dir, tid] of room.exits) {
      const off = DIRECTION_OFFSETS[dir];
      if (!off || off.dz !== 0) continue;
      let arr = reverseExits.get(tid);
      if (!arr) { arr = []; reverseExits.set(tid, arr); }
      arr.push({ fromId: rid, dir });
    }
  }

  /**
   * Count ALL direction mismatches involving room `rid` if it were at (px, py).
   * posOverrides lets callers simulate position changes without mutating result.
   */
  function countMismatchesInvolving(
    rid: string,
    px: number,
    py: number,
    z: number,
    posOverrides?: Map<string, { x: number; y: number }>,
  ): number {
    let count = 0;
    const room = rooms.get(rid);
    if (room) {
      for (const [dir, nid] of room.exits) {
        const off = DIRECTION_OFFSETS[dir];
        if (!off || off.dz !== 0) continue;
        const override = posOverrides?.get(nid);
        const np = override ? { x: override.x, y: override.y, z } : result.get(nid);
        if (!np || np.z !== z) continue;
        const dx = np.x - px;
        const dy = np.y - py;
        if (
          (off.dx > 0 && dx <= 0) ||
          (off.dx < 0 && dx >= 0) ||
          (off.dy > 0 && dy <= 0) ||
          (off.dy < 0 && dy >= 0)
        ) {
          count++;
        }
      }
    }
    const revArr = reverseExits.get(rid);
    if (revArr) {
      for (const { fromId, dir } of revArr) {
        const off = DIRECTION_OFFSETS[dir];
        if (!off || off.dz !== 0) continue;
        const override = posOverrides?.get(fromId);
        const fp = override ? { x: override.x, y: override.y, z } : result.get(fromId);
        if (!fp || fp.z !== z) continue;
        const dx = px - fp.x;
        const dy = py - fp.y;
        if (
          (off.dx > 0 && dx <= 0) ||
          (off.dx < 0 && dx >= 0) ||
          (off.dy > 0 && dy <= 0) ||
          (off.dy < 0 && dy >= 0)
        ) {
          count++;
        }
      }
    }
    return count;
  }

  /** Reject single-room moves that would increase direction mismatches. */
  function moveWouldIncreaseMismatches(
    rid: string,
    nx: number,
    ny: number,
    z: number,
  ): boolean {
    const cur = result.get(rid);
    if (!cur || cur.z !== z) return false;
    const before = countMismatchesInvolving(rid, cur.x, cur.y, z);
    const after = countMismatchesInvolving(rid, nx, ny, z);
    return after > before;
  }

  /**
   * Reject moves that break axis alignment with already-adjacent neighbors.
   * If a room is currently at Manhattan distance 1 from a neighbor and both
   * share an axis (same x or same y), don't move it to a position that
   * creates a diagonal with that neighbor.
   */
  function moveWouldBreakAlignment(
    rid: string,
    nx: number,
    ny: number,
    z: number,
  ): boolean {
    const cur = result.get(rid);
    if (!cur || cur.z !== z) return false;
    const room = rooms.get(rid);
    if (!room) return false;

    for (const [dir, nid] of room.exits) {
      const offset = DIRECTION_OFFSETS[dir];
      if (!offset || offset.dz !== 0) continue;
      const np = result.get(nid);
      if (!np || np.z !== z) continue;
      const curDist = Math.abs(cur.x - np.x) + Math.abs(cur.y - np.y);
      if (curDist !== 1) continue; // only protect adjacent pairs
      // For E/W exits: protect Y alignment
      if (offset.dx !== 0 && offset.dy === 0) {
        if (cur.y === np.y && ny !== np.y) return true;
      }
      // For N/S exits: protect X alignment
      if (offset.dy !== 0 && offset.dx === 0) {
        if (cur.x === np.x && nx !== np.x) return true;
      }
    }
    // Also check reverse exits (rooms that point at us)
    const revArr = reverseExits.get(rid);
    if (revArr) {
      for (const { fromId, dir } of revArr) {
        const offset = DIRECTION_OFFSETS[dir];
        if (!offset || offset.dz !== 0) continue;
        const fp = result.get(fromId);
        if (!fp || fp.z !== z) continue;
        const curDist = Math.abs(cur.x - fp.x) + Math.abs(cur.y - fp.y);
        if (curDist !== 1) continue;
        if (offset.dx !== 0 && offset.dy === 0) {
          if (cur.y === fp.y && ny !== fp.y) return true;
        }
        if (offset.dy !== 0 && offset.dx === 0) {
          if (cur.x === fp.x && nx !== fp.x) return true;
        }
      }
    }
    return false;
  }

  /** Reject room swaps that would increase direction mismatches. Pure — no side effects. */
  function swapWouldIncreaseMismatches(
    a: string,
    posA: { x: number; y: number },
    b: string,
    posB: { x: number; y: number },
    z: number,
  ): boolean {
    const beforeA = countMismatchesInvolving(a, posA.x, posA.y, z);
    const beforeB = countMismatchesInvolving(b, posB.x, posB.y, z);
    const overrides = new Map<string, { x: number; y: number }>([
      [a, { x: posB.x, y: posB.y }],
      [b, { x: posA.x, y: posA.y }],
    ]);
    const afterA = countMismatchesInvolving(a, posB.x, posB.y, z, overrides);
    const afterB = countMismatchesInvolving(b, posA.x, posA.y, z, overrides);
    return (afterA + afterB) > (beforeA + beforeB);
  }

  // ── Phase 4: Force-directed relaxation ───────────────────────────────────
  // BFS placement is greedy — collisions push rooms to non-ideal positions,
  // creating gaps that later rooms fill. This phase pulls connected rooms
  // toward each other iteratively, like springs, until all directly-connected
  // rooms are adjacent (distance 1) or as close as possible.
  forceDirectedRelax();

  // ── Phase 5: Diagonal cascade fix ──────────────────────────────────────
  // The force-directed pass moves single rooms toward an averaged ideal,
  // but cross-quarter connections create diagonals that single-room moves
  // can't resolve (moving one room fixes one exit but breaks another).
  // This phase specifically targets remaining diagonal exits with multi-room
  // cascade moves: shift a room to fix a diagonal, then cascade-fix any
  // new diagonals created by that move.
  fixDiagonalCascade();

  // ── Phase 5b: Direction violation repair ────────────────────────────────
  // After BFS + relaxation + diagonal fix, some exits may still violate
  // strict direction constraints (e.g., east-connected rooms at the same x).
  // This happens when two BFS paths place rooms in conflicting positions.
  // This phase specifically repairs direction violations by:
  //   1. Moving single endpoints to correct positions
  //   2. Swapping with occupants of ideal cells
  //   3. Shifting groups of rooms to create space ("add space to accommodate")
  fixDirectionViolations();

  // ── Phase 6: Occlusion fix ────────────────────────────────────────────
  // After all placement/relaxation phases, rooms may still sit on the
  // straight-line segment between two other connected rooms, visually
  // overlapping exit lines. This phase detects such occlusions and moves
  // the offending room to an adjacent free cell that doesn't create new
  // overlaps or diagonals.
  fixOcclusions();

  // ── Phase 7–8: Iterative grid expansion + occlusion cleanup ───────────
  // Alternate between grid expansion (inserting columns/rows by group
  // shifts) and individual-room occlusion fixes. Each round exploits free
  // cells created by the previous round's expansion.
  for (let round = 0; round < EXPANSION_OCCLUSION_ROUNDS; round++) {
    resolveOcclusionsByExpansion();
    fixOcclusions();
  }

  return result;

  // ── Force-directed relaxation ──────────────────────────────────────────────

  /**
   * Score the layout quality for a z-level: sum of (distance - 1) for each
   * cardinal exit where distance > 1, plus a penalty for each diagonal,
   * plus a penalty for rooms sitting on exit line segments (occlusions).
   */
  function layoutScore(z: number, occlusionWeight: number = OCCLUSION_PENALTY_LIGHT): number {
    let score = 0;

    const zPositions: { id: string; x: number; y: number }[] = [];
    for (const [id, pos] of result) {
      if (pos.z === z) zPositions.push({ id, x: pos.x, y: pos.y });
    }

    for (const [roomId, pos] of result) {
      if (pos.z !== z) continue;
      const room = rooms.get(roomId);
      if (!room) continue;
      for (const [dir, targetId] of room.exits) {
        const offset = DIRECTION_OFFSETS[dir];
        if (!offset || offset.dz !== 0) continue;
        const tp = result.get(targetId);
        if (!tp || tp.z !== z) continue;
        const dist = Math.abs(tp.x - pos.x) + Math.abs(tp.y - pos.y);
        if (dist > 1) score += dist - 1;
        if (pos.x !== tp.x && pos.y !== tp.y) {
          score += DIAGONAL_PENALTY;
        }
        const dx = tp.x - pos.x;
        const dy = tp.y - pos.y;
        if (
          (offset.dx > 0 && dx <= 0) ||
          (offset.dx < 0 && dx >= 0) ||
          (offset.dy > 0 && dy <= 0) ||
          (offset.dy < 0 && dy >= 0)
        ) {
          score += DIRECTION_MISMATCH_PENALTY;
        }
        if (dist >= 2 && (pos.x === tp.x || pos.y === tp.y)) {
          for (const other of zPositions) {
            if (other.id === roomId || other.id === targetId) continue;
            if (pos.x === tp.x && other.x === pos.x) {
              const minY = Math.min(pos.y, tp.y);
              const maxY = Math.max(pos.y, tp.y);
              if (other.y > minY && other.y < maxY) score += occlusionWeight;
            } else if (pos.y === tp.y && other.y === pos.y) {
              const minX = Math.min(pos.x, tp.x);
              const maxX = Math.max(pos.x, tp.x);
              if (other.x > minX && other.x < maxX) score += occlusionWeight;
            }
          }
        }
      }
    }
    return score;
  }

  /**
   * Relaxation-specific score: identical to layoutScore but uses a
   * proportional diagonal penalty that scales with perpendicular displacement.
   * This prevents the force-directed pass from dragging axis-aligned rooms
   * off-axis toward distant neighbours (e.g. wall-road pulling
   * inside-the-west-gate 4 cells off the main-street row in Midgaard).
   * Later phases (diagonal cascade, direction-violation repair) use the
   * standard flat penalty so they remain free to shuffle rooms as needed.
   */
  function relaxationScore(z: number): number {
    let score = 0;

    const zPositions: { id: string; x: number; y: number }[] = [];
    for (const [id, pos] of result) {
      if (pos.z === z) zPositions.push({ id, x: pos.x, y: pos.y });
    }

    for (const [roomId, pos] of result) {
      if (pos.z !== z) continue;
      const room = rooms.get(roomId);
      if (!room) continue;
      for (const [dir, targetId] of room.exits) {
        const offset = DIRECTION_OFFSETS[dir];
        if (!offset || offset.dz !== 0) continue;
        const tp = result.get(targetId);
        if (!tp || tp.z !== z) continue;
        const dist = Math.abs(tp.x - pos.x) + Math.abs(tp.y - pos.y);
        if (dist > 1) score += dist - 1;
        if (pos.x !== tp.x && pos.y !== tp.y) {
          const offAxis = offset.dx !== 0
            ? Math.abs(tp.y - pos.y)
            : Math.abs(tp.x - pos.x);
          score += DIAGONAL_PENALTY * Math.max(offAxis, 1);
        }
        const dx = tp.x - pos.x;
        const dy = tp.y - pos.y;
        if (
          (offset.dx > 0 && dx <= 0) ||
          (offset.dx < 0 && dx >= 0) ||
          (offset.dy > 0 && dy <= 0) ||
          (offset.dy < 0 && dy >= 0)
        ) {
          score += DIRECTION_MISMATCH_PENALTY;
        }
        if (dist >= 2 && (pos.x === tp.x || pos.y === tp.y)) {
          for (const other of zPositions) {
            if (other.id === roomId || other.id === targetId) continue;
            if (pos.x === tp.x && other.x === pos.x) {
              const minY = Math.min(pos.y, tp.y);
              const maxY = Math.max(pos.y, tp.y);
              if (other.y > minY && other.y < maxY) score += OCCLUSION_PENALTY_LIGHT;
            } else if (pos.y === tp.y && other.y === pos.y) {
              const minX = Math.min(pos.x, tp.x);
              const maxX = Math.max(pos.x, tp.x);
              if (other.x > minX && other.x < maxX) score += OCCLUSION_PENALTY_LIGHT;
            }
          }
        }
      }
    }
    return score;
  }

  /**
   * Compute the score contribution of a single room's exits.
   * Used for incremental delta scoring during pairwise swaps.
   */
  function roomScoreContribution(
    roomId: string,
    z: number,
    zPositions: { id: string; x: number; y: number }[],
    occlusionWeight: number = OCCLUSION_PENALTY_LIGHT,
  ): number {
    let score = 0;
    const pos = result.get(roomId);
    if (!pos || pos.z !== z) return 0;
    const room = rooms.get(roomId);
    if (!room) return 0;

    for (const [dir, targetId] of room.exits) {
      const offset = DIRECTION_OFFSETS[dir];
      if (!offset || offset.dz !== 0) continue;
      const tp = result.get(targetId);
      if (!tp || tp.z !== z) continue;
      const dist = Math.abs(tp.x - pos.x) + Math.abs(tp.y - pos.y);
      if (dist > 1) score += dist - 1;
      if (pos.x !== tp.x && pos.y !== tp.y) {
        score += DIAGONAL_PENALTY;
      }
      const dx = tp.x - pos.x;
      const dy = tp.y - pos.y;
      if (
        (offset.dx > 0 && dx <= 0) ||
        (offset.dx < 0 && dx >= 0) ||
        (offset.dy > 0 && dy <= 0) ||
        (offset.dy < 0 && dy >= 0)
      ) {
        score += DIRECTION_MISMATCH_PENALTY;
      }
      if (dist >= 2 && (pos.x === tp.x || pos.y === tp.y)) {
        for (const other of zPositions) {
          if (other.id === roomId || other.id === targetId) continue;
          if (pos.x === tp.x && other.x === pos.x) {
            const minY = Math.min(pos.y, tp.y);
            const maxY = Math.max(pos.y, tp.y);
            if (other.y > minY && other.y < maxY) score += occlusionWeight;
          } else if (pos.y === tp.y && other.y === pos.y) {
            const minX = Math.min(pos.x, tp.x);
            const maxX = Math.max(pos.x, tp.x);
            if (other.x > minX && other.x < maxX) score += occlusionWeight;
          }
        }
      }
    }
    return score;
  }

  /**
   * Collect room IDs whose score contribution may change when rooms in
   * `changedIds` move. This includes the changed rooms themselves plus
   * any room that shares an exit edge with them (their neighbors).
   */
  function affectedRooms(changedIds: string[], z: number): Set<string> {
    const affected = new Set<string>(changedIds);
    for (const rid of changedIds) {
      const room = rooms.get(rid);
      if (!room) continue;
      for (const [dir, nid] of room.exits) {
        const off = DIRECTION_OFFSETS[dir];
        if (!off || off.dz !== 0) continue;
        const np = result.get(nid);
        if (np && np.z === z) affected.add(nid);
      }
      const revArr = reverseExits.get(rid);
      if (revArr) {
        for (const { fromId, dir } of revArr) {
          const off = DIRECTION_OFFSETS[dir];
          if (!off || off.dz !== 0) continue;
          const fp = result.get(fromId);
          if (fp && fp.z === z) affected.add(fromId);
        }
      }
    }
    return affected;
  }

  /**
   * Sum the score contributions of a set of rooms. Each exit edge is
   * counted once from the source room's perspective.
   */
  function sumContributions(
    roomIds: Set<string>,
    z: number,
    zPositions: { id: string; x: number; y: number }[],
    occlusionWeight: number = OCCLUSION_PENALTY_LIGHT,
  ): number {
    let total = 0;
    for (const rid of roomIds) {
      total += roomScoreContribution(rid, z, zPositions, occlusionWeight);
    }
    return total;
  }

  /**
   * For a given room, compute the ideal position as the average of where
   * each neighbor "wants" it to be (neighbor.pos + exit offset toward room).
   */
  function idealPosition(
    roomId: string,
    z: number,
  ): { x: number; y: number } | null {
    const room = rooms.get(roomId);
    if (!room) return null;

    let sumX = 0;
    let sumY = 0;
    let count = 0;

    for (const [dir, neighborId] of room.exits) {
      const offset = DIRECTION_OFFSETS[dir];
      if (!offset || offset.dz !== 0) continue;
      const neighborPos = result.get(neighborId);
      if (!neighborPos || neighborPos.z !== z) continue;

      // Where does this neighbor want us? Opposite of our exit direction
      sumX += neighborPos.x - offset.dx;
      sumY += neighborPos.y - offset.dy;
      count++;
    }

    if (count === 0) return null;
    return { x: Math.round(sumX / count), y: Math.round(sumY / count) };
  }

  /**
   * One pass of single-room relaxation: try moving each room to reduce the
   * layout score. Builds candidates near the ideal position and near each
   * neighbor's preferred position, then commits the best-scoring move.
   */
  function relaxRooms(
    zRoomIds: string[],
    z: number,
    occupied: Set<string>,
    startScore: number,
    scoreFn: (z: number) => number,
  ): { score: number; improved: boolean } {
    let score = startScore;
    let improved = false;

    for (const roomId of zRoomIds) {
      const pos = result.get(roomId)!;
      const ideal = idealPosition(roomId, z);
      if (!ideal) continue;
      if (ideal.x === pos.x && ideal.y === pos.y) continue;

      const candidateSet = new Set<string>();
      const candidates: { x: number; y: number }[] = [];
      const addCandidate = (x: number, y: number) => {
        const k = cellKey(x, y);
        if (!candidateSet.has(k)) {
          candidateSet.add(k);
          candidates.push({ x, y });
        }
      };

      for (const c of diamondCandidates(ideal.x, ideal.y, 0, RELAX_CANDIDATE_RADIUS)) {
        addCandidate(c.x, c.y);
      }

      const room = rooms.get(roomId);
      if (room) {
        for (const [dir, neighborId] of room.exits) {
          const offset = DIRECTION_OFFSETS[dir];
          if (!offset || offset.dz !== 0) continue;
          const neighborPos = result.get(neighborId);
          if (!neighborPos || neighborPos.z !== z) continue;
          const wantX = neighborPos.x - offset.dx;
          const wantY = neighborPos.y - offset.dy;
          for (const c of diamondCandidates(wantX, wantY, 0, NEIGHBOR_CANDIDATE_RADIUS)) {
            addCandidate(c.x, c.y);
          }
        }
      }

      let bestPos: { x: number; y: number } | null = null;
      let bestScore = score;

      for (const cand of candidates) {
        if (cand.x === pos.x && cand.y === pos.y) continue;
        const key = cellKey(cand.x, cand.y);
        if (occupied.has(key)) continue;
        if (moveWouldIncreaseMismatches(roomId, cand.x, cand.y, z)) continue;
        if (moveWouldBreakAlignment(roomId, cand.x, cand.y, z)) continue;

        const oldKey = cellKey(pos.x, pos.y);
        occupied.delete(oldKey);
        occupied.add(key);
        result.set(roomId, { x: cand.x, y: cand.y, z });

        const newScore = scoreFn(z);
        if (newScore < bestScore) {
          bestScore = newScore;
          bestPos = cand;
        }

        occupied.delete(key);
        occupied.add(oldKey);
        result.set(roomId, pos);
      }

      if (bestPos) {
        occupied.delete(cellKey(pos.x, pos.y));
        occupied.add(cellKey(bestPos.x, bestPos.y));
        result.set(roomId, { x: bestPos.x, y: bestPos.y, z });
        score = bestScore;
        improved = true;
      }
    }

    return { score, improved };
  }

  /**
   * Iterative force-directed relaxation. Each iteration:
   * 1. For each room, compute where its neighbors "want" it
   * 2. Try moving the room to that ideal position (or nearby)
   * 3. Accept if the global score improves (no increase in total stretch)
   */
  function forceDirectedRelax(): void {
    for (const [z, occupied] of occupiedByZ) {
      const zRoomIds: string[] = [];
      for (const [id, pos] of result) {
        if (pos.z === z) zRoomIds.push(id);
      }

      let currentScore = relaxationScore(z);
      if (currentScore === 0) continue; // Already perfect

      for (let iter = 0; iter < FORCE_RELAXATION_ITERATIONS && currentScore > 0; iter++) {
        const r = relaxRooms(zRoomIds, z, occupied, currentScore, relaxationScore);
        currentScore = r.score;
        if (!r.improved) break;
      }

      // Phase 2: Try room swaps — explores multi-room rearrangements that
      // single-room moves can't find (e.g., two rooms blocking each other)
      if (currentScore > 0) {
        // Pre-build z-level positions for delta scoring
        let zPositions: { id: string; x: number; y: number }[] = [];
        const refreshZPositions = () => {
          zPositions = [];
          for (const [id, pos] of result) {
            if (pos.z === z) zPositions.push({ id, x: pos.x, y: pos.y });
          }
        };
        refreshZPositions();

        for (let swapIter = 0; swapIter < SWAP_ITERATIONS && currentScore > 0; swapIter++) {
          let swapped = false;

          for (let i = 0; i < zRoomIds.length && currentScore > 0; i++) {
            for (let j = i + 1; j < zRoomIds.length; j++) {
              const a = zRoomIds[i], b = zRoomIds[j];
              const posA = result.get(a)!;
              const posB = result.get(b)!;

              if (swapWouldIncreaseMismatches(a, posA, b, posB, z)) continue;

              // Delta scoring: compute contribution of affected rooms before/after
              const affected = affectedRooms([a, b], z);
              const beforeDelta = sumContributions(affected, z, zPositions);

              // Tentatively swap
              result.set(a, { x: posB.x, y: posB.y, z });
              result.set(b, { x: posA.x, y: posA.y, z });

              // Update zPositions for the two swapped rooms
              for (const zp of zPositions) {
                if (zp.id === a) { zp.x = posB.x; zp.y = posB.y; }
                else if (zp.id === b) { zp.x = posA.x; zp.y = posA.y; }
              }

              const afterDelta = sumContributions(affected, z, zPositions);
              const newScore = currentScore - beforeDelta + afterDelta;

              if (newScore < currentScore) {
                currentScore = newScore;
                swapped = true;
              } else {
                // Undo swap and zPositions
                result.set(a, posA);
                result.set(b, posB);
                for (const zp of zPositions) {
                  if (zp.id === a) { zp.x = posA.x; zp.y = posA.y; }
                  else if (zp.id === b) { zp.x = posB.x; zp.y = posB.y; }
                }
              }
            }
          }

          if (!swapped) break;

          // After a swap round, re-run single-room moves
          for (let moveIter = 0; moveIter < POST_SWAP_MOVE_ITERATIONS && currentScore > 0; moveIter++) {
            const r = relaxRooms(zRoomIds, z, occupied, currentScore, layoutScore);
            currentScore = r.score;
            if (!r.improved) break;
          }
          // Refresh zPositions after relaxation moves
          refreshZPositions();
        }
      }
    }
  }

  // ── Diagonal cascade fix ────────────────────────────────────────────────

  /**
   * Targeted multi-room fix for remaining diagonal exits.
   *
   * Strategy 1: Single-room moves — try moving one endpoint to align.
   * Strategy 2: Pair moves — move BOTH endpoints simultaneously to a
   *   common axis, splitting the difference.
   * Strategy 3: Chain shifts — when a room is part of a linear chain,
   *   shift the entire chain along the perpendicular axis.
   */
  function fixDiagonalCascade(): void {
    for (const [z, occupied] of occupiedByZ) {
      // Persistent reverse lookup: position → roomId (updated incrementally)
      const posToRoomMap = new Map<string, string>();
      for (const [id, p] of result) {
        if (p.z === z) posToRoomMap.set(cellKey(p.x, p.y), id);
      }

      for (let pass = 0; pass < DIAGONAL_CASCADE_PASSES; pass++) {
        // Refresh reverse lookup at the start of each pass
        posToRoomMap.clear();
        for (const [id, p] of result) {
          if (p.z === z) posToRoomMap.set(cellKey(p.x, p.y), id);
        }

        const diags: Array<{
          roomId: string;
          targetId: string;
          dir: string;
        }> = [];

        for (const [roomId, pos] of result) {
          if (pos.z !== z) continue;
          const room = rooms.get(roomId);
          if (!room) continue;
          for (const [dir, targetId] of room.exits) {
            const offset = DIRECTION_OFFSETS[dir];
            if (!offset || offset.dz !== 0) continue;
            const tp = result.get(targetId);
            if (!tp || tp.z !== z) continue;
            if (pos.x !== tp.x && pos.y !== tp.y) {
              diags.push({ roomId, targetId, dir });
            }
          }
        }

        if (diags.length === 0) break;

        const currentScore = layoutScore(z);
        let improved = false;

        for (const { roomId, targetId, dir } of diags) {
          if (improved) break;
          const posA = result.get(roomId)!;
          const posB = result.get(targetId)!;
          const offset = DIRECTION_OFFSETS[dir]!;
          const isVertical = offset.dy !== 0;

          // ── Strategy 1: Single endpoint moves + cascade ──
          const singleMoves: Array<{
            mover: string;
            newX: number;
            newY: number;
          }> = [];

          if (isVertical) {
            singleMoves.push({ mover: roomId, newX: posB.x, newY: posA.y });
            singleMoves.push({ mover: targetId, newX: posA.x, newY: posB.y });
          } else {
            singleMoves.push({ mover: roomId, newX: posA.x, newY: posB.y });
            singleMoves.push({ mover: targetId, newX: posB.x, newY: posA.y });
          }

          for (const sm of singleMoves) {
            if (improved) break;
            const moverPos = result.get(sm.mover)!;
            if (moverPos.x === sm.newX && moverPos.y === sm.newY) continue;
            if (moveWouldIncreaseMismatches(sm.mover, sm.newX, sm.newY, z)) continue;
            if (moveWouldBreakAlignment(sm.mover, sm.newX, sm.newY, z)) continue;

            const targetKey = cellKey(sm.newX, sm.newY);

            if (!occupied.has(targetKey)) {
              const oldKey = cellKey(moverPos.x, moverPos.y);
              occupied.delete(oldKey);
              occupied.add(targetKey);
              result.set(sm.mover, { x: sm.newX, y: sm.newY, z });

              if (layoutScore(z) < currentScore) {
                improved = true;
                break;
              }

              occupied.delete(targetKey);
              occupied.add(oldKey);
              result.set(sm.mover, moverPos);
            } else {
              // Try swap with occupant
              const occupantId = posToRoomMap.get(targetKey);
              if (!occupantId || occupantId === roomId || occupantId === targetId)
                continue;
              const occupantPos = result.get(occupantId)!;
              const moverOldKey = cellKey(moverPos.x, moverPos.y);

              // Swap
              result.set(sm.mover, { x: sm.newX, y: sm.newY, z });
              result.set(occupantId, { x: moverPos.x, y: moverPos.y, z });
              if (layoutScore(z) < currentScore) {
                improved = true;
                break;
              }
              result.set(sm.mover, moverPos);
              result.set(occupantId, occupantPos);

              // Displace occupant to nearby cell
              const occupantKey = cellKey(occupantPos.x, occupantPos.y);
              for (const c of diamondCandidates(occupantPos.x, occupantPos.y, 1, DIAGONAL_DISPLACE_RADIUS)) {
                if (improved) break;
                const nk = cellKey(c.x, c.y);
                if (occupied.has(nk)) continue;

                occupied.delete(moverOldKey);
                occupied.delete(occupantKey);
                occupied.add(targetKey);
                occupied.add(nk);
                result.set(sm.mover, { x: sm.newX, y: sm.newY, z });
                result.set(occupantId, { x: c.x, y: c.y, z });

                if (layoutScore(z) < currentScore) {
                  improved = true;
                  break;
                }

                occupied.delete(targetKey);
                occupied.delete(nk);
                occupied.add(moverOldKey);
                occupied.add(occupantKey);
                result.set(sm.mover, moverPos);
                result.set(occupantId, occupantPos);
              }
            }
          }
          if (improved) continue;

          // ── Strategy 2: Move both endpoints to a shared axis ──
          // For vertical (N/S): pick a target x and move both A and B there
          // For horizontal (E/W): pick a target y and move both A and B there
          const axisTargets: number[] = [];
          if (isVertical) {
            axisTargets.push(posA.x, posB.x, Math.round((posA.x + posB.x) / 2));
          } else {
            axisTargets.push(posA.y, posB.y, Math.round((posA.y + posB.y) / 2));
          }

          for (const axisVal of axisTargets) {
            if (improved) break;

            let newAx: number, newAy: number, newBx: number, newBy: number;
            if (isVertical) {
              newAx = axisVal; newAy = posA.y;
              newBx = axisVal; newBy = posB.y;
            } else {
              newAx = posA.x; newAy = axisVal;
              newBx = posB.x; newBy = axisVal;
            }

            // Skip if no change
            if (newAx === posA.x && newAy === posA.y &&
                newBx === posB.x && newBy === posB.y) continue;

            const keyA = cellKey(newAx, newAy);
            const keyB = cellKey(newBx, newBy);
            const oldKeyA = cellKey(posA.x, posA.y);
            const oldKeyB = cellKey(posB.x, posB.y);

            // Check if target cells are free (or are the rooms themselves)
            const aFree = keyA === oldKeyA || keyA === oldKeyB || !occupied.has(keyA);
            const bFree = keyB === oldKeyA || keyB === oldKeyB || !occupied.has(keyB);

            if (aFree && bFree && keyA !== keyB) {
              if (moveWouldIncreaseMismatches(roomId, newAx, newAy, z) ||
                  moveWouldIncreaseMismatches(targetId, newBx, newBy, z)) continue;
              if (moveWouldBreakAlignment(roomId, newAx, newAy, z) ||
                  moveWouldBreakAlignment(targetId, newBx, newBy, z)) continue;
              occupied.delete(oldKeyA);
              occupied.delete(oldKeyB);
              occupied.add(keyA);
              occupied.add(keyB);
              result.set(roomId, { x: newAx, y: newAy, z });
              result.set(targetId, { x: newBx, y: newBy, z });

              if (layoutScore(z) < currentScore) {
                improved = true;
                break;
              }

              occupied.delete(keyA);
              occupied.delete(keyB);
              occupied.add(oldKeyA);
              occupied.add(oldKeyB);
              result.set(roomId, posA);
              result.set(targetId, posB);
            }
          }
          if (improved) continue;

          // ── Strategy 3: Push cascade ──
          // For each diagonal endpoint, try "pushing" it (and any rooms in
          // the way) along the misaligned axis. Try the exact shift needed
          // to align the diagonal, plus smaller intermediate shifts.
          for (const startId of [roomId, targetId]) {
            if (improved) break;

            // Compute the exact shift needed to fix this diagonal
            const sPos = result.get(startId)!;
            const otherId = startId === roomId ? targetId : roomId;
            const oPos = result.get(otherId)!;
            const neededShift = isVertical
              ? oPos.x - sPos.x
              : oPos.y - sPos.y;

            // Try exact fix shift + standard small shifts, deduped
            const shifts = new Set<number>();
            if (neededShift !== 0) shifts.add(neededShift);
            for (const s of [-1, 1, -2, 2]) shifts.add(s);

            for (const shift of shifts) {
              if (improved) break;

              // Collect the push chain: starting from startId, push in
              // the shift direction. For each room, check if any of its
              // adjacent neighbors (distance ≤ 1) would become diagonal
              // after the push; if so, include them in the push too.
              const pushSet = new Set<string>();
              const pushQueue = [startId];
              pushSet.add(startId);
              let tooLarge = false;

              while (pushQueue.length > 0) {
                const pid = pushQueue.shift()!;
                const pPos = result.get(pid)!;
                const pNewX = isVertical ? pPos.x + shift : pPos.x;
                const pNewY = isVertical ? pPos.y : pPos.y + shift;
                const pNewKey = cellKey(pNewX, pNewY);

                // If new position is occupied by a non-push room, add it
                if (occupied.has(pNewKey)) {
                  const occ = posToRoomMap.get(pNewKey);
                  if (occ && !pushSet.has(occ)) {
                    pushSet.add(occ);
                    pushQueue.push(occ);
                  }
                }

                // Include adjacent rooms that would be negatively impacted
                // by the shift: rooms that become diagonal, direction-reversed,
                // or significantly displaced from a currently adjacent neighbor.
                const pRoom = rooms.get(pid);
                if (pRoom) {
                  for (const [pDir, pTarget] of pRoom.exits) {
                    if (pushSet.has(pTarget)) continue;
                    const pOff = DIRECTION_OFFSETS[pDir];
                    if (!pOff || pOff.dz !== 0) continue;
                    const ptPos = result.get(pTarget);
                    if (!ptPos || ptPos.z !== z) continue;
                    const wasAdj =
                      Math.abs(pPos.x - ptPos.x) +
                        Math.abs(pPos.y - ptPos.y) ===
                      1;
                    if (!wasAdj) continue;

                    // After the push, would this neighbor be in the wrong direction
                    // or become diagonal?
                    const newDx = ptPos.x - pNewX;
                    const newDy = ptPos.y - pNewY;
                    const wouldDiag = pNewX !== ptPos.x && pNewY !== ptPos.y;
                    const wouldReverse =
                      (pOff.dx > 0 && newDx <= 0) ||
                      (pOff.dx < 0 && newDx >= 0) ||
                      (pOff.dy > 0 && newDy <= 0) ||
                      (pOff.dy < 0 && newDy >= 0);
                    const wouldBeDistant =
                      Math.abs(newDx) + Math.abs(newDy) > 2;

                    if (wouldDiag || wouldReverse || wouldBeDistant) {
                      pushSet.add(pTarget);
                      pushQueue.push(pTarget);
                    }
                  }
                }

                if (pushSet.size > MAX_PUSH_GROUP_SIZE) {
                  tooLarge = true;
                  break;
                }
              }

              if (tooLarge) continue;
              if (pushSet.size < 2) continue; // trivial

              // Compute new positions
              const moves = new Map<
                string,
                { oldX: number; oldY: number; newX: number; newY: number }
              >();
              let canMove = true;
              for (const pid of pushSet) {
                const pp = result.get(pid)!;
                const nx = isVertical ? pp.x + shift : pp.x;
                const ny = isVertical ? pp.y : pp.y + shift;
                const nk = cellKey(nx, ny);
                if (occupied.has(nk)) {
                  const atCell = posToRoomMap.get(nk);
                  if (!atCell || !pushSet.has(atCell)) {
                    canMove = false;
                    break;
                  }
                }
                moves.set(pid, { oldX: pp.x, oldY: pp.y, newX: nx, newY: ny });
              }

              if (!canMove) continue;

              // Guard: reject if any room in the push set would increase mismatches
              // or break axis alignment with an adjacent cardinal neighbour
              let wouldIncrease = false;
              for (const [pid, m] of moves) {
                if (moveWouldIncreaseMismatches(pid, m.newX, m.newY, z) ||
                    moveWouldBreakAlignment(pid, m.newX, m.newY, z)) {
                  wouldIncrease = true;
                  break;
                }
              }
              if (wouldIncrease) continue;

              // Apply
              for (const [, m] of moves) {
                occupied.delete(cellKey(m.oldX, m.oldY));
              }
              for (const [cid, m] of moves) {
                occupied.add(cellKey(m.newX, m.newY));
                result.set(cid, { x: m.newX, y: m.newY, z });
              }

              if (layoutScore(z) < currentScore) {
                improved = true;
                break;
              }

              // Undo
              for (const [, m] of moves) {
                occupied.delete(cellKey(m.newX, m.newY));
              }
              for (const [cid, m] of moves) {
                occupied.add(cellKey(m.oldX, m.oldY));
                result.set(cid, { x: m.oldX, y: m.oldY, z });
              }
            }
          }
        }

        if (!improved) break;
      }

      // After cascade fixes, run one more pass of single-room relaxation
      // to clean up any remaining non-optimal placements
      let score = relaxationScore(z);
      const zRooms: string[] = [];
      for (const [id, p] of result) {
        if (p.z === z) zRooms.push(id);
      }
      for (let iter = 0; iter < POST_DIAGONAL_RELAX_ITERATIONS && score > 0; iter++) {
        let moved = false;
        for (const rid of zRooms) {
          const rp = result.get(rid)!;
          const ideal = idealPosition(rid, z);
          if (!ideal) continue;
          if (ideal.x === rp.x && ideal.y === rp.y) continue;

          let bestPos: { x: number; y: number } | null = null;
          let bestScore = score;

          const room = rooms.get(rid);
          const targets = new Set<string>();
          const addTarget = (x: number, y: number) => {
            const k = cellKey(x, y);
            if (!targets.has(k)) targets.add(k);
          };
          for (const c of diamondCandidates(ideal.x, ideal.y, 0, POST_DIAGONAL_CANDIDATE_RADIUS)) {
            addTarget(c.x, c.y);
          }
          if (room) {
            for (const [d, nid] of room.exits) {
              const off = DIRECTION_OFFSETS[d];
              if (!off || off.dz !== 0) continue;
              const np = result.get(nid);
              if (!np || np.z !== z) continue;
              addTarget(np.x - off.dx, np.y - off.dy);
            }
          }

          for (const tk of targets) {
            const [txs, tys] = tk.split(",");
            const tx = parseInt(txs), ty = parseInt(tys);
            if (tx === rp.x && ty === rp.y) continue;
            if (occupied.has(tk)) continue;
            if (moveWouldIncreaseMismatches(rid, tx, ty, z)) continue;
            if (moveWouldBreakAlignment(rid, tx, ty, z)) continue;

            const oldKey = cellKey(rp.x, rp.y);
            occupied.delete(oldKey);
            occupied.add(tk);
            result.set(rid, { x: tx, y: ty, z });

            const ns = relaxationScore(z);
            if (ns < bestScore) {
              bestScore = ns;
              bestPos = { x: tx, y: ty };
            }

            occupied.delete(tk);
            occupied.add(oldKey);
            result.set(rid, rp);
          }

          if (bestPos) {
            occupied.delete(cellKey(rp.x, rp.y));
            occupied.add(cellKey(bestPos.x, bestPos.y));
            result.set(rid, { x: bestPos.x, y: bestPos.y, z });
            score = bestScore;
            moved = true;
          }
        }
        if (!moved) break;
      }
    }
  }

  // ── Direction violation repair ────────────────────────────────────────────

  /**
   * Repair remaining direction violations after relaxation and diagonal fixes.
   *
   * A direction violation occurs when an exit's target room is not strictly
   * in the correct direction (e.g., an east exit where target.x <= source.x).
   *
   * Strategy 1: Move one endpoint to a free cell in the correct half-plane.
   * Strategy 2: Swap the target with the occupant of an ideal cell.
   * Strategy 3: Shift a group of connected rooms to create space.
   */
  function fixDirectionViolations(): void {
    for (const [z, occupied] of occupiedByZ) {
      for (let pass = 0; pass < DIRECTION_VIOLATION_PASSES; pass++) {
        // Find all direction violations on this z-level
        const violations: Array<{
          roomId: string;
          targetId: string;
          dir: string;
          offset: Offset;
        }> = [];

        for (const [roomId, pos] of result) {
          if (pos.z !== z) continue;
          const room = rooms.get(roomId);
          if (!room) continue;
          for (const [dir, targetId] of room.exits) {
            const offset = DIRECTION_OFFSETS[dir];
            if (!offset || offset.dz !== 0) continue;
            const tp = result.get(targetId);
            if (!tp || tp.z !== z) continue;
            const dx = tp.x - pos.x;
            const dy = tp.y - pos.y;
            if (
              (offset.dx > 0 && dx <= 0) ||
              (offset.dx < 0 && dx >= 0) ||
              (offset.dy > 0 && dy <= 0) ||
              (offset.dy < 0 && dy >= 0)
            ) {
              violations.push({ roomId, targetId, dir, offset });
            }
          }
        }

        if (violations.length === 0) break;

        let currentScore = layoutScore(z);
        let fixed = false;

        for (const { roomId, targetId, offset } of violations) {
          if (fixed) break;
          const posA = result.get(roomId)!;
          const posB = result.get(targetId)!;

          // ── Strategy 1: Move target room to correct position ──
          const idealBx = posA.x + offset.dx;
          const idealBy = posA.y + offset.dy;

          const candidates: Array<{ x: number; y: number }> = [];
          for (const c of diamondCandidates(idealBx, idealBy, 0, VIOLATION_CANDIDATE_RADIUS)) {
            if (offset.dx > 0 && c.x <= posA.x) continue;
            if (offset.dx < 0 && c.x >= posA.x) continue;
            if (offset.dy > 0 && c.y <= posA.y) continue;
            if (offset.dy < 0 && c.y >= posA.y) continue;
            candidates.push(c);
          }

          // Try moving target (B)
          for (const mover of [targetId, roomId]) {
            if (fixed) break;
            const moverPos = result.get(mover)!;
            const anchor = mover === targetId ? roomId : targetId;
            const anchorPos = result.get(anchor)!;
            const isTarget = mover === targetId;

            // Build candidate list in the correct half-plane
            const mCands: Array<{ x: number; y: number }> = [];
            const baseX = isTarget ? anchorPos.x + offset.dx : anchorPos.x - offset.dx;
            const baseY = isTarget ? anchorPos.y + offset.dy : anchorPos.y - offset.dy;
            for (const c of diamondCandidates(baseX, baseY, 0, VIOLATION_CANDIDATE_RADIUS)) {
              if (isTarget) {
                if (offset.dx > 0 && c.x <= anchorPos.x) continue;
                if (offset.dx < 0 && c.x >= anchorPos.x) continue;
                if (offset.dy > 0 && c.y <= anchorPos.y) continue;
                if (offset.dy < 0 && c.y >= anchorPos.y) continue;
              } else {
                if (offset.dx > 0 && c.x >= anchorPos.x) continue;
                if (offset.dx < 0 && c.x <= anchorPos.x) continue;
                if (offset.dy > 0 && c.y >= anchorPos.y) continue;
                if (offset.dy < 0 && c.y <= anchorPos.y) continue;
              }
              mCands.push(c);
            }

            for (const cand of mCands) {
              if (cand.x === moverPos.x && cand.y === moverPos.y) continue;
              const ck = cellKey(cand.x, cand.y);
              if (occupied.has(ck)) continue;
              if (moveWouldBreakAlignment(mover, cand.x, cand.y, z)) continue;

              const beforeM = countMismatchesInvolving(mover, moverPos.x, moverPos.y, z);
              const oldKey = cellKey(moverPos.x, moverPos.y);
              occupied.delete(oldKey);
              occupied.add(ck);
              result.set(mover, { x: cand.x, y: cand.y, z });

              const afterM = countMismatchesInvolving(mover, cand.x, cand.y, z);

              if (afterM < beforeM) {
                const newScore = layoutScore(z);
                if (newScore < currentScore) {
                  currentScore = newScore;
                  fixed = true;
                  break;
                }
              }

              // Undo
              occupied.delete(ck);
              occupied.add(oldKey);
              result.set(mover, moverPos);
            }
          }

          if (fixed) continue;

          // ── Strategy 2: Swap target with occupant of ideal cell ──
          for (const mover of [targetId, roomId]) {
            if (fixed) break;
            const moverPos = result.get(mover)!;
            const anchor = mover === targetId ? roomId : targetId;
            const anchorPos = result.get(anchor)!;
            const isTarget = mover === targetId;
            const swapBaseX = isTarget ? anchorPos.x + offset.dx : anchorPos.x - offset.dx;
            const swapBaseY = isTarget ? anchorPos.y + offset.dy : anchorPos.y - offset.dy;

            // Try swapping with rooms at or near the ideal position
            for (const c of diamondCandidates(swapBaseX, swapBaseY, 0, VIOLATION_SWAP_RADIUS)) {
              if (fixed) break;
              const sk = cellKey(c.x, c.y);
              if (!occupied.has(sk)) continue;
              if (c.x === moverPos.x && c.y === moverPos.y) continue;

              // Find who's at this position
              let swapTarget: string | null = null;
              for (const [rid, rp] of result) {
                if (rp.z === z && rp.x === c.x && rp.y === c.y) {
                  swapTarget = rid;
                  break;
                }
              }
              if (!swapTarget || swapTarget === roomId || swapTarget === targetId) continue;

              const stPos = result.get(swapTarget)!;

              if (swapWouldIncreaseMismatches(mover, moverPos, swapTarget, stPos, z)) continue;
              if (moveWouldBreakAlignment(mover, stPos.x, stPos.y, z) ||
                  moveWouldBreakAlignment(swapTarget, moverPos.x, moverPos.y, z)) continue;

              // Tentatively swap
              result.set(mover, { x: stPos.x, y: stPos.y, z });
              result.set(swapTarget, { x: moverPos.x, y: moverPos.y, z });

              const newScore = layoutScore(z);
              if (newScore < currentScore) {
                currentScore = newScore;
                fixed = true;
                break;
              }

              // Undo
              result.set(mover, moverPos);
              result.set(swapTarget, stPos);
            }
          }

          if (fixed) continue;

          // ── Strategy 3: Group shift to create space ──
          // Try shifting target room + connected rooms in the correct direction
          const shiftOnX = offset.dx !== 0;
          const shiftDir = offset.dx !== 0
            ? (posB.x <= posA.x ? 1 : -1) * Math.sign(offset.dx)
            : (posB.y <= posA.y ? 1 : -1) * Math.sign(offset.dy);
          const shiftAmount = shiftOnX
            ? (posA.x + offset.dx) - posB.x
            : (posA.y + offset.dy) - posB.y;

          for (const shift of [shiftAmount, shiftAmount > 0 ? shiftAmount + 1 : shiftAmount - 1, shiftDir, shiftDir * 2]) {
            if (fixed || shift === 0) continue;

            // Build shift group starting from the target room
            const group = new Set<string>();
            const gQueue: string[] = [targetId];
            group.add(targetId);
            let tooLarge = false;

            const posRoom = new Map<string, string>();
            const zRooms: string[] = [];
            for (const [rid, p] of result) {
              if (p.z === z) {
                posRoom.set(cellKey(p.x, p.y), rid);
                zRooms.push(rid);
              }
            }

            while (gQueue.length > 0) {
              const rid = gQueue.shift()!;
              const rp = result.get(rid)!;
              const nx = shiftOnX ? rp.x + shift : rp.x;
              const ny = shiftOnX ? rp.y : rp.y + shift;

              // Collision cascade
              const nk = cellKey(nx, ny);
              const collider = posRoom.get(nk);
              if (collider && !group.has(collider) && collider !== roomId) {
                group.add(collider);
                gQueue.push(collider);
              }

              // Include neighbors that would break
              const room = rooms.get(rid);
              if (room) {
                for (const [d, nid] of room.exits) {
                  if (group.has(nid) || nid === roomId) continue;
                  const o = DIRECTION_OFFSETS[d];
                  if (!o || o.dz !== 0) continue;
                  const np = result.get(nid);
                  if (!np || np.z !== z) continue;
                  const wouldDiag = nx !== np.x && ny !== np.y;
                  const ddx = np.x - nx, ddy = np.y - ny;
                  const wouldViolate =
                    (o.dx > 0 && ddx <= 0) || (o.dx < 0 && ddx >= 0) ||
                    (o.dy > 0 && ddy <= 0) || (o.dy < 0 && ddy >= 0);
                  if (wouldDiag || wouldViolate) {
                    group.add(nid);
                    gQueue.push(nid);
                  }
                }
              }

              if (group.size > MAX_VIOLATION_GROUP_SIZE) { tooLarge = true; break; }
            }

            if (tooLarge || group.has(roomId)) continue;

            // Compute new positions
            const moves = new Map<string, { ox: number; oy: number; nx: number; ny: number }>();
            const oldKeys = new Set<string>();
            for (const rid of group) {
              const rp = result.get(rid)!;
              moves.set(rid, {
                ox: rp.x, oy: rp.y,
                nx: shiftOnX ? rp.x + shift : rp.x,
                ny: shiftOnX ? rp.y : rp.y + shift,
              });
              oldKeys.add(cellKey(rp.x, rp.y));
            }

            // Validate no collisions with non-group rooms
            let valid = true;
            const newKeys = new Set<string>();
            for (const [, m] of moves) {
              const nk = cellKey(m.nx, m.ny);
              if (newKeys.has(nk)) { valid = false; break; }
              newKeys.add(nk);
              if (occupied.has(nk) && !oldKeys.has(nk)) { valid = false; break; }
            }
            if (!valid) continue;

            // Reject if any room in the group would break axis alignment
            // with a neighbour outside the group
            let wouldBreak = false;
            for (const [rid, m] of moves) {
              if (moveWouldBreakAlignment(rid, m.nx, m.ny, z)) {
                wouldBreak = true;
                break;
              }
            }
            if (wouldBreak) continue;

            // Apply tentatively
            for (const [, m] of moves) occupied.delete(cellKey(m.ox, m.oy));
            for (const [rid, m] of moves) {
              occupied.add(cellKey(m.nx, m.ny));
              result.set(rid, { x: m.nx, y: m.ny, z });
            }

            const newScore = layoutScore(z);
            if (newScore < currentScore) {
              currentScore = newScore;
              fixed = true;
              break;
            }

            // Undo
            for (const [, m] of moves) occupied.delete(cellKey(m.nx, m.ny));
            for (const [rid, m] of moves) {
              occupied.add(cellKey(m.ox, m.oy));
              result.set(rid, { x: m.ox, y: m.oy, z });
            }
          }
        }

        if (!fixed) break;
      }
    }
  }

  // ── Occlusion fix ──────────────────────────────────────────────────────────

  /**
   * Detect rooms sitting on straight-line exit segments between two other
   * connected rooms (same row or column, between endpoints). For each
   * offending room, try moving it to a nearby cell that:
   *   - Is unoccupied
   *   - Doesn't create new occlusions
   *   - Doesn't create diagonal exits for the moved room's connections
   *   - Preserves direction constraints as much as possible
   */
  function fixOcclusions(): void {
    /** Check if moving room `rid` to (nx, ny) creates a diagonal. */
    function wouldCreateDiag(
      rid: string,
      nx: number,
      ny: number,
      z: number,
    ): boolean {
      const room = rooms.get(rid);
      if (!room) return false;
      for (const [dir, nid] of room.exits) {
        const off = DIRECTION_OFFSETS[dir];
        if (!off || off.dz !== 0) continue;
        const np = result.get(nid);
        if (!np || np.z !== z) continue;
        if (nx !== np.x && ny !== np.y) return true;
      }
      return false;
    }

    /** Count occlusions for a z-level. */
    function countOcclusions(z: number): number {
      let count = 0;
      const zPos = new Map<string, { x: number; y: number }>();
      for (const [id, p] of result) {
        if (p.z === z) zPos.set(id, { x: p.x, y: p.y });
      }
      for (const [roomId, pos] of zPos) {
        const room = rooms.get(roomId);
        if (!room) continue;
        for (const [dir, targetId] of room.exits) {
          const off = DIRECTION_OFFSETS[dir];
          if (!off || off.dz !== 0) continue;
          const tp = zPos.get(targetId);
          if (!tp) continue;
          const dist = Math.abs(tp.x - pos.x) + Math.abs(tp.y - pos.y);
          if (dist < 2) continue;
          if (pos.x === tp.x) {
            const minY = Math.min(pos.y, tp.y), maxY = Math.max(pos.y, tp.y);
            for (const [oid, op] of zPos) {
              if (oid === roomId || oid === targetId) continue;
              if (op.x === pos.x && op.y > minY && op.y < maxY) count++;
            }
          } else if (pos.y === tp.y) {
            const minX = Math.min(pos.x, tp.x), maxX = Math.max(pos.x, tp.x);
            for (const [oid, op] of zPos) {
              if (oid === roomId || oid === targetId) continue;
              if (op.y === pos.y && op.x > minX && op.x < maxX) count++;
            }
          }
        }
      }
      return count;
    }

    for (const [z, occupied] of occupiedByZ) {
      const zRoomIds: string[] = [];
      for (const [id, p] of result) {
        if (p.z === z) zRoomIds.push(id);
      }

      let currentScore = layoutScore(z, OCCLUSION_PENALTY_HEAVY);
      if (currentScore === 0) continue;

      // ── Strategy A: Single-room moves with occlusion-aware scoring ──
      for (let iter = 0; iter < OCCLUSION_FIX_ITERATIONS && currentScore > 0; iter++) {
        let improved = false;

        for (const roomId of zRoomIds) {
          const pos = result.get(roomId)!;
          const ideal = idealPosition(roomId, z);
          if (!ideal) continue;

          const candidateSet = new Set<string>();
          const candidates: { x: number; y: number }[] = [];
          const addCandidate = (x: number, y: number) => {
            const k = cellKey(x, y);
            if (!candidateSet.has(k)) {
              candidateSet.add(k);
              candidates.push({ x, y });
            }
          };

          for (const c of diamondCandidates(ideal.x, ideal.y, 0, RELAX_CANDIDATE_RADIUS)) {
            addCandidate(c.x, c.y);
          }
          const roomDef = rooms.get(roomId);
          if (roomDef) {
            for (const [dir, nid] of roomDef.exits) {
              const off = DIRECTION_OFFSETS[dir];
              if (!off || off.dz !== 0) continue;
              const np = result.get(nid);
              if (!np || np.z !== z) continue;
              const wantX = np.x - off.dx, wantY = np.y - off.dy;
              for (const c of diamondCandidates(wantX, wantY, 0, NEIGHBOR_CANDIDATE_RADIUS)) {
                addCandidate(c.x, c.y);
              }
            }
          }

          let bestPos: { x: number; y: number } | null = null;
          let bestScore = currentScore;

          for (const cand of candidates) {
            if (cand.x === pos.x && cand.y === pos.y) continue;
            const key = cellKey(cand.x, cand.y);
            if (occupied.has(key)) continue;
            // Hard constraint: no new diagonals
            if (wouldCreateDiag(roomId, cand.x, cand.y, z)) continue;
            if (moveWouldIncreaseMismatches(roomId, cand.x, cand.y, z)) continue;

            const oldKey = cellKey(pos.x, pos.y);
            occupied.delete(oldKey);
            occupied.add(key);
            result.set(roomId, { x: cand.x, y: cand.y, z });

            const newScore = layoutScore(z, OCCLUSION_PENALTY_HEAVY);
            if (newScore < bestScore) {
              bestScore = newScore;
              bestPos = cand;
            }

            occupied.delete(key);
            occupied.add(oldKey);
            result.set(roomId, pos);
          }

          if (bestPos) {
            occupied.delete(cellKey(pos.x, pos.y));
            occupied.add(cellKey(bestPos.x, bestPos.y));
            result.set(roomId, { x: bestPos.x, y: bestPos.y, z });
            currentScore = bestScore;
            improved = true;
          }
        }

        if (!improved) break;
      }

      // ── Strategy B: Pairwise swaps ──
      if (currentScore > 0) {
        let occZPositions: { id: string; x: number; y: number }[] = [];
        const refreshOccZPos = () => {
          occZPositions = [];
          for (const [id, pos] of result) {
            if (pos.z === z) occZPositions.push({ id, x: pos.x, y: pos.y });
          }
        };
        refreshOccZPos();

        for (let swapIter = 0; swapIter < SWAP_ITERATIONS && currentScore > 0; swapIter++) {
          let swapped = false;
          for (let i = 0; i < zRoomIds.length && currentScore > 0; i++) {
            for (let j = i + 1; j < zRoomIds.length; j++) {
              const a = zRoomIds[i], b = zRoomIds[j];
              const posA = result.get(a)!;
              const posB = result.get(b)!;

              if (wouldCreateDiag(a, posB.x, posB.y, z)) continue;
              if (wouldCreateDiag(b, posA.x, posA.y, z)) continue;
              if (swapWouldIncreaseMismatches(a, posA, b, posB, z)) continue;

              const affected = affectedRooms([a, b], z);
              const beforeDelta = sumContributions(affected, z, occZPositions, OCCLUSION_PENALTY_HEAVY);

              result.set(a, { x: posB.x, y: posB.y, z });
              result.set(b, { x: posA.x, y: posA.y, z });

              for (const zp of occZPositions) {
                if (zp.id === a) { zp.x = posB.x; zp.y = posB.y; }
                else if (zp.id === b) { zp.x = posA.x; zp.y = posA.y; }
              }

              const afterDelta = sumContributions(affected, z, occZPositions, OCCLUSION_PENALTY_HEAVY);
              const ns = currentScore - beforeDelta + afterDelta;

              if (ns < currentScore) {
                currentScore = ns;
                swapped = true;
              } else {
                result.set(a, posA);
                result.set(b, posB);
                for (const zp of occZPositions) {
                  if (zp.id === a) { zp.x = posA.x; zp.y = posA.y; }
                  else if (zp.id === b) { zp.x = posB.x; zp.y = posB.y; }
                }
              }
            }
          }
          if (!swapped) break;
          refreshOccZPos();
        }
      }

      // ── Strategy C: Targeted occluder displacement ──
      // Identify rooms that sit on exit line segments and aggressively
      // search for alternative positions, including perpendicular offsets.
      if (countOcclusions(z) > 0) {
        // Build a set of exit segments for this z-level
        const segments: Array<{
          fromId: string; toId: string;
          x1: number; y1: number; x2: number; y2: number;
          axis: 'x' | 'y';
        }> = [];
        const segSeen = new Set<string>();
        for (const rid of zRoomIds) {
          const room = rooms.get(rid);
          if (!room) continue;
          const rp = result.get(rid)!;
          for (const [dir, tid] of room.exits) {
            const off = DIRECTION_OFFSETS[dir];
            if (!off || off.dz !== 0) continue;
            const tp = result.get(tid);
            if (!tp || tp.z !== z) continue;
            const dist = Math.abs(tp.x - rp.x) + Math.abs(tp.y - rp.y);
            if (dist < 2) continue;
            if (rp.x !== tp.x && rp.y !== tp.y) continue;
            const sk = [rid, tid].sort().join('|');
            if (segSeen.has(sk)) continue;
            segSeen.add(sk);
            segments.push({
              fromId: rid, toId: tid,
              x1: rp.x, y1: rp.y, x2: tp.x, y2: tp.y,
              axis: rp.x === tp.x ? 'y' : 'x',
            });
          }
        }

        // Find rooms that occlude at least one segment
        const occluders = new Set<string>();
        for (const seg of segments) {
          for (const oid of zRoomIds) {
            if (oid === seg.fromId || oid === seg.toId) continue;
            const op = result.get(oid)!;
            if (seg.axis === 'y') {
              const minY = Math.min(seg.y1, seg.y2), maxY = Math.max(seg.y1, seg.y2);
              if (op.x === seg.x1 && op.y > minY && op.y < maxY) occluders.add(oid);
            } else {
              const minX = Math.min(seg.x1, seg.x2), maxX = Math.max(seg.x1, seg.x2);
              if (op.y === seg.y1 && op.x > minX && op.x < maxX) occluders.add(oid);
            }
          }
        }

        // For each occluder, try to move it off all segments with wide search
        for (const oid of occluders) {
          const oPos = result.get(oid)!;
          const oCandidateSet = new Set<string>();
          const oCandidates: Array<{ x: number; y: number }> = [];
          const oAdd = (x: number, y: number) => {
            const k = cellKey(x, y);
            if (!oCandidateSet.has(k)) { oCandidateSet.add(k); oCandidates.push({ x, y }); }
          };

          for (const c of diamondCandidates(oPos.x, oPos.y, 1, OCCLUDER_SEARCH_RADIUS)) {
            oAdd(c.x, c.y);
          }
          // Also search near each neighbor's ideal placement
          const oRoom = rooms.get(oid);
          if (oRoom) {
            for (const [dir, nid] of oRoom.exits) {
              const off = DIRECTION_OFFSETS[dir];
              if (!off || off.dz !== 0) continue;
              const np = result.get(nid);
              if (!np || np.z !== z) continue;
              // Where the neighbor wants this room
              const wx = np.x - off.dx, wy = np.y - off.dy;
              for (const c of diamondCandidates(wx, wy, 0, RELAX_CANDIDATE_RADIUS)) {
                oAdd(c.x, c.y);
              }
            }
          }

          let bestPos: { x: number; y: number } | null = null;
          let bestScore = layoutScore(z, OCCLUSION_PENALTY_HEAVY);

          for (const cand of oCandidates) {
            if (cand.x === oPos.x && cand.y === oPos.y) continue;
            const ck = cellKey(cand.x, cand.y);
            if (occupied.has(ck)) continue;
            if (wouldCreateDiag(oid, cand.x, cand.y, z)) continue;
            if (moveWouldIncreaseMismatches(oid, cand.x, cand.y, z)) continue;

            const oldKey = cellKey(oPos.x, oPos.y);
            occupied.delete(oldKey);
            occupied.add(ck);
            result.set(oid, { x: cand.x, y: cand.y, z });

            const ns = layoutScore(z, OCCLUSION_PENALTY_HEAVY);
            if (ns < bestScore) {
              bestScore = ns;
              bestPos = cand;
            }

            occupied.delete(ck);
            occupied.add(oldKey);
            result.set(oid, oPos);
          }

          if (bestPos) {
            occupied.delete(cellKey(oPos.x, oPos.y));
            occupied.add(cellKey(bestPos.x, bestPos.y));
            result.set(oid, { x: bestPos.x, y: bestPos.y, z });
          }
        }

        // Two-move displacement: for remaining occluders, try evicting the
        // occupant of a blocked cell to make room for the occluder.
        const stillOccluding = new Set<string>();
        // Refresh segments after earlier moves
        const segs2: typeof segments = [];
        const segSeen2 = new Set<string>();
        for (const rid of zRoomIds) {
          const room = rooms.get(rid);
          if (!room) continue;
          const rp = result.get(rid)!;
          for (const [dir, tid] of room.exits) {
            const off = DIRECTION_OFFSETS[dir];
            if (!off || off.dz !== 0) continue;
            const tp = result.get(tid);
            if (!tp || tp.z !== z) continue;
            const dist = Math.abs(tp.x - rp.x) + Math.abs(tp.y - rp.y);
            if (dist < 2 || (rp.x !== tp.x && rp.y !== tp.y)) continue;
            const sk = [rid, tid].sort().join('|');
            if (segSeen2.has(sk)) continue;
            segSeen2.add(sk);
            segs2.push({ fromId: rid, toId: tid, x1: rp.x, y1: rp.y, x2: tp.x, y2: tp.y, axis: rp.x === tp.x ? 'y' : 'x' });
          }
        }
        for (const seg of segs2) {
          for (const oid2 of zRoomIds) {
            if (oid2 === seg.fromId || oid2 === seg.toId) continue;
            const op = result.get(oid2)!;
            if (seg.axis === 'y') {
              const minY = Math.min(seg.y1, seg.y2), maxY = Math.max(seg.y1, seg.y2);
              if (op.x === seg.x1 && op.y > minY && op.y < maxY) stillOccluding.add(oid2);
            } else {
              const minX = Math.min(seg.x1, seg.x2), maxX = Math.max(seg.x1, seg.x2);
              if (op.y === seg.y1 && op.x > minX && op.x < maxX) stillOccluding.add(oid2);
            }
          }
        }

        for (const oid2 of stillOccluding) {
          const oPos = result.get(oid2)!;
          const oRoom = rooms.get(oid2);
          if (!oRoom) continue;

          // Candidate cells for the occluder (radius 6 around current pos)
          const tgtCells: Array<{ x: number; y: number }> = [];
          for (const c of diamondCandidates(oPos.x, oPos.y, 1, TWO_MOVE_OCCLUDER_RADIUS)) {
            tgtCells.push(c);
          }

          let bestTwoMove: { occluderTo: { x: number; y: number }; evictee: string; evicteeTo: { x: number; y: number } } | null = null;
          let bestTwoScore = layoutScore(z, OCCLUSION_PENALTY_HEAVY);

          for (const tgt of tgtCells) {
            if (tgt.x === oPos.x && tgt.y === oPos.y) continue;
            if (wouldCreateDiag(oid2, tgt.x, tgt.y, z)) continue;
            if (moveWouldIncreaseMismatches(oid2, tgt.x, tgt.y, z)) continue;
            const tgtKey = cellKey(tgt.x, tgt.y);
            if (!occupied.has(tgtKey)) continue; // single-move already tried unoccupied

            // Find who's at this cell
            let evictee: string | null = null;
            for (const [rid, rp] of result) {
              if (rp.z === z && rp.x === tgt.x && rp.y === tgt.y) { evictee = rid; break; }
            }
            if (!evictee) continue;

            const evPos = result.get(evictee)!;
            // Try relocating evictee to a nearby free cell
            const evCands: Array<{ x: number; y: number }> = [];
            for (const c of diamondCandidates(evPos.x, evPos.y, 1, TWO_MOVE_EVICTEE_RADIUS)) {
              evCands.push(c);
            }

            // Save state
            const oKey = cellKey(oPos.x, oPos.y);

            for (const evTgt of evCands) {
              const evKey = cellKey(evTgt.x, evTgt.y);
              if (occupied.has(evKey) && !(evTgt.x === oPos.x && evTgt.y === oPos.y)) continue;
              if (wouldCreateDiag(evictee, evTgt.x, evTgt.y, z)) continue;
              if (moveWouldIncreaseMismatches(evictee, evTgt.x, evTgt.y, z)) continue;
              occupied.delete(oKey);
              occupied.delete(tgtKey);
              occupied.add(evKey);
              occupied.add(tgtKey); // occluder takes evictee's old spot
              result.set(evictee, { x: evTgt.x, y: evTgt.y, z });
              result.set(oid2, { x: tgt.x, y: tgt.y, z });

              // Check no diags created for evictee
              if (!wouldCreateDiag(evictee, evTgt.x, evTgt.y, z) && !wouldCreateDiag(oid2, tgt.x, tgt.y, z)) {
                const ns = layoutScore(z, OCCLUSION_PENALTY_HEAVY);
                if (ns < bestTwoScore) {
                  bestTwoScore = ns;
                  bestTwoMove = { occluderTo: tgt, evictee, evicteeTo: evTgt };
                }
              }

              // Restore
              occupied.delete(evKey);
              occupied.add(oKey);
              occupied.add(tgtKey);
              result.set(evictee, evPos);
              result.set(oid2, oPos);
            }
          }

          if (bestTwoMove) {
            const { occluderTo, evictee, evicteeTo } = bestTwoMove;
            const evPos2 = result.get(evictee)!;
            occupied.delete(cellKey(oPos.x, oPos.y));
            occupied.delete(cellKey(evPos2.x, evPos2.y));
            occupied.add(cellKey(evicteeTo.x, evicteeTo.y));
            occupied.add(cellKey(occluderTo.x, occluderTo.y));
            result.set(evictee, { x: evicteeTo.x, y: evicteeTo.y, z });
            result.set(oid2, { x: occluderTo.x, y: occluderTo.y, z });
          }
        }
      }

      // ── Strategy D: Segment compaction ──
      // For each exit pair that spans 2+ cells on an axis, try to move one
      // endpoint adjacent to the other (reducing the segment to length 1).
      if (countOcclusions(z) > 0) {
        const seen = new Set<string>();
        for (const roomId of zRoomIds) {
          const room = rooms.get(roomId);
          if (!room) continue;
          const p = result.get(roomId)!;
          for (const [dir, targetId] of room.exits) {
            const off = DIRECTION_OFFSETS[dir];
            if (!off || off.dz !== 0) continue;
            const tp = result.get(targetId);
            if (!tp || tp.z !== z) continue;
            const dist = Math.abs(tp.x - p.x) + Math.abs(tp.y - p.y);
            if (dist < 2) continue;
            if (p.x !== tp.x && p.y !== tp.y) continue; // not axis-aligned

            const pairKey = [roomId, targetId].sort().join("|");
            if (seen.has(pairKey)) continue;
            seen.add(pairKey);

            // Check if any room sits on this segment
            let hasOcclusion = false;
            if (p.x === tp.x) {
              const minY = Math.min(p.y, tp.y), maxY = Math.max(p.y, tp.y);
              for (const oid of zRoomIds) {
                if (oid === roomId || oid === targetId) continue;
                const op = result.get(oid)!;
                if (op.x === p.x && op.y > minY && op.y < maxY) {
                  hasOcclusion = true;
                  break;
                }
              }
            } else {
              const minX = Math.min(p.x, tp.x), maxX = Math.max(p.x, tp.x);
              for (const oid of zRoomIds) {
                if (oid === roomId || oid === targetId) continue;
                const op = result.get(oid)!;
                if (op.y === p.y && op.x > minX && op.x < maxX) {
                  hasOcclusion = true;
                  break;
                }
              }
            }
            if (!hasOcclusion) continue;

            // Try moving each endpoint adjacent to the other
            for (const mover of [roomId, targetId]) {
              const anchor = mover === roomId ? targetId : roomId;
              const mPos = result.get(mover)!;
              const aPos = result.get(anchor)!;

              // Ideal: one cell away from anchor in the exit direction
              const adjX = aPos.x + (mPos.x > aPos.x ? 1 : mPos.x < aPos.x ? -1 : 0);
              const adjY = aPos.y + (mPos.y > aPos.y ? 1 : mPos.y < aPos.y ? -1 : 0);

              // Try the adjacent cell and nearby alternatives
              const compactCands: { x: number; y: number }[] = [{ x: adjX, y: adjY }];
              for (const c of diamondCandidates(adjX, adjY, 1, COMPACTION_CANDIDATE_RADIUS)) {
                compactCands.push(c);
              }

              const beforeScore = layoutScore(z, OCCLUSION_PENALTY_HEAVY);
              let bestPos: { x: number; y: number } | null = null;
              let bestScore = beforeScore;

              for (const cand of compactCands) {
                if (cand.x === mPos.x && cand.y === mPos.y) continue;
                const ck = cellKey(cand.x, cand.y);
                if (occupied.has(ck)) continue;
                if (wouldCreateDiag(mover, cand.x, cand.y, z)) continue;
                if (moveWouldIncreaseMismatches(mover, cand.x, cand.y, z)) continue;

                const oldKey = cellKey(mPos.x, mPos.y);
                occupied.delete(oldKey);
                occupied.add(ck);
                result.set(mover, { x: cand.x, y: cand.y, z });

                const ns = layoutScore(z, OCCLUSION_PENALTY_HEAVY);
                if (ns < bestScore) {
                  bestScore = ns;
                  bestPos = cand;
                }

                occupied.delete(ck);
                occupied.add(oldKey);
                result.set(mover, mPos);
              }

              if (bestPos) {
                occupied.delete(cellKey(mPos.x, mPos.y));
                occupied.add(cellKey(bestPos.x, bestPos.y));
                result.set(mover, { x: bestPos.x, y: bestPos.y, z });
              }
            }
          }
        }
      }
    }
  }

  // ── Grid expansion for occlusion resolution ─────────────────────────────

  /**
   * Resolve remaining occlusions by shifting groups of connected rooms
   * perpendicular to occluded exit segments. Unlike individual-room moves,
   * group shifts preserve internal directional structure — all rooms in the
   * group maintain their relative positions.
   *
   * Algorithm:
   * 1. Find rooms sitting on axis-aligned exit segments
   * 2. For each occluder, build a "shift group" via BFS: start with the
   *    occluder, add neighbors that would develop diagonal/reversed exits
   *    if not shifted together, cascade through collisions
   * 3. Shift the entire group by ±1 cell perpendicular to the segment
   * 4. Accept if the overall score improves (fewer occlusions/diagonals)
   */
  function resolveOcclusionsByExpansion(): void {
    for (const [z, occupied] of occupiedByZ) {
      let currentScore = layoutScore(z, OCCLUSION_PENALTY_HEAVY);
      if (currentScore === 0) continue;

      for (let pass = 0; pass < EXPANSION_PASSES; pass++) {
        const zRooms: string[] = [];
        for (const [id, p] of result) {
          if (p.z === z) zRooms.push(id);
        }

        // Find occluding rooms — each occluder-axis pair is tried
        // independently so rooms at segment intersections get shifts
        // on both axes across separate passes.
        const pairSeen = new Set<string>();
        const occluders: Array<{
          id: string;
          segAxis: 'x' | 'y';
          segFrom: string;
          segTo: string;
        }> = [];

        for (const rid of zRooms) {
          const room = rooms.get(rid);
          if (!room) continue;
          const rp = result.get(rid)!;
          for (const [dir, tid] of room.exits) {
            const off = DIRECTION_OFFSETS[dir];
            if (!off || off.dz !== 0) continue;
            const tp = result.get(tid);
            if (!tp || tp.z !== z) continue;
            const dist = Math.abs(tp.x - rp.x) + Math.abs(tp.y - rp.y);
            if (dist < 2) continue;
            const isVert = rp.x === tp.x;
            const isHoriz = rp.y === tp.y;
            if (!isVert && !isHoriz) continue;

            for (const oid of zRooms) {
              if (oid === rid || oid === tid) continue;
              const op = result.get(oid)!;
              let onSeg = false;
              if (isVert) {
                const minY = Math.min(rp.y, tp.y), maxY = Math.max(rp.y, tp.y);
                if (op.x === rp.x && op.y > minY && op.y < maxY) onSeg = true;
              } else {
                const minX = Math.min(rp.x, tp.x), maxX = Math.max(rp.x, tp.x);
                if (op.y === rp.y && op.x > minX && op.x < maxX) onSeg = true;
              }
              if (onSeg) {
                const axis = isVert ? 'y' : 'x';
                const pairKey = `${oid}:${axis}`;
                if (pairSeen.has(pairKey)) continue;
                pairSeen.add(pairKey);
                occluders.push({
                  id: oid,
                  segAxis: axis as 'x' | 'y',
                  segFrom: rid,
                  segTo: tid,
                });
              }
            }
          }
        }

        if (occluders.length === 0) break;

        let improved = false;

        for (const occ of occluders) {
          // Shift perpendicular to the segment axis
          const shiftOnX = occ.segAxis === 'y';

          for (const shiftDir of [1, -1, 2, -2]) {
            const group = new Set<string>();
            const gQueue: string[] = [occ.id];
            group.add(occ.id);
            let tooLarge = false;

            // Position → room lookup (current state snapshot)
            const posRoom = new Map<string, string>();
            for (const rid2 of zRooms) {
              const p2 = result.get(rid2)!;
              posRoom.set(cellKey(p2.x, p2.y), rid2);
            }

            while (gQueue.length > 0) {
              const rid = gQueue.shift()!;
              const rp = result.get(rid)!;
              const room = rooms.get(rid);
              if (!room) continue;

              const nx = shiftOnX ? rp.x + shiftDir : rp.x;
              const ny = shiftOnX ? rp.y : rp.y + shiftDir;

              // Forward exits: add neighbors that would break
              for (const [d, nid] of room.exits) {
                if (group.has(nid)) continue;
                const o = DIRECTION_OFFSETS[d];
                if (!o || o.dz !== 0) continue;
                const np = result.get(nid);
                if (!np || np.z !== z) continue;

                const wouldDiag = nx !== np.x && ny !== np.y;
                const dx = np.x - nx, dy = np.y - ny;
                const wouldReverse =
                  (o.dx > 0 && dx <= 0) || (o.dx < 0 && dx >= 0) ||
                  (o.dy > 0 && dy <= 0) || (o.dy < 0 && dy >= 0);

                if (wouldDiag || wouldReverse) {
                  group.add(nid);
                  gQueue.push(nid);
                }
              }

              // Reverse exits: neighbors that exit toward this room
              const revs = reverseExits.get(rid);
              if (revs) {
                for (const { fromId, dir: d } of revs) {
                  if (group.has(fromId)) continue;
                  const o = DIRECTION_OFFSETS[d];
                  if (!o || o.dz !== 0) continue;
                  const fp = result.get(fromId);
                  if (!fp || fp.z !== z) continue;

                  const wouldDiag = fp.x !== nx && fp.y !== ny;
                  const dx = nx - fp.x, dy = ny - fp.y;
                  const wouldReverse =
                    (o.dx > 0 && dx <= 0) || (o.dx < 0 && dx >= 0) ||
                    (o.dy > 0 && dy <= 0) || (o.dy < 0 && dy >= 0);

                  if (wouldDiag || wouldReverse) {
                    group.add(fromId);
                    gQueue.push(fromId);
                  }
                }
              }

              // Collision cascade
              const nk = cellKey(nx, ny);
              const collider = posRoom.get(nk);
              if (collider && !group.has(collider)) {
                group.add(collider);
                gQueue.push(collider);
              }

              if (group.size > MAX_EXPANSION_GROUP_SIZE) { tooLarge = true; break; }
            }

            if (tooLarge) continue;
            if (group.has(occ.segFrom) && group.has(occ.segTo)) continue;

            // Compute new positions
            const moves = new Map<
              string,
              { ox: number; oy: number; nx: number; ny: number }
            >();
            const oldKeys = new Set<string>();
            for (const rid of group) {
              const rp = result.get(rid)!;
              moves.set(rid, {
                ox: rp.x, oy: rp.y,
                nx: shiftOnX ? rp.x + shiftDir : rp.x,
                ny: shiftOnX ? rp.y : rp.y + shiftDir,
              });
              oldKeys.add(cellKey(rp.x, rp.y));
            }

            // Validate: no collisions with non-group rooms
            let valid = true;
            const newKeys = new Set<string>();
            for (const [, m] of moves) {
              const nk = cellKey(m.nx, m.ny);
              if (newKeys.has(nk)) { valid = false; break; }
              newKeys.add(nk);
              if (occupied.has(nk) && !oldKeys.has(nk)) {
                valid = false; break;
              }
            }
            if (!valid) continue;

            // Validate: no direction violations at group boundary
            for (const rid of group) {
              if (!valid) break;
              const room = rooms.get(rid);
              if (!room) continue;
              const m = moves.get(rid)!;

              for (const [d, nid] of room.exits) {
                if (group.has(nid)) continue;
                const o = DIRECTION_OFFSETS[d];
                if (!o || o.dz !== 0) continue;
                const np = result.get(nid);
                if (!np || np.z !== z) continue;
                const dx = np.x - m.nx, dy = np.y - m.ny;
                if (
                  (o.dx > 0 && dx <= 0) || (o.dx < 0 && dx >= 0) ||
                  (o.dy > 0 && dy <= 0) || (o.dy < 0 && dy >= 0)
                ) { valid = false; break; }
              }
              if (!valid) break;

              const revs2 = reverseExits.get(rid);
              if (revs2) {
                for (const { fromId, dir: d } of revs2) {
                  if (group.has(fromId)) continue;
                  const o = DIRECTION_OFFSETS[d];
                  if (!o || o.dz !== 0) continue;
                  const fp = result.get(fromId);
                  if (!fp || fp.z !== z) continue;
                  const dx = m.nx - fp.x, dy = m.ny - fp.y;
                  if (
                    (o.dx > 0 && dx <= 0) || (o.dx < 0 && dx >= 0) ||
                    (o.dy > 0 && dy <= 0) || (o.dy < 0 && dy >= 0)
                  ) { valid = false; break; }
                }
              }
            }
            if (!valid) continue;

            // Apply tentatively
            for (const [, m] of moves) {
              occupied.delete(cellKey(m.ox, m.oy));
            }
            for (const [rid, m] of moves) {
              occupied.add(cellKey(m.nx, m.ny));
              result.set(rid, { x: m.nx, y: m.ny, z });
            }

            const newScore = layoutScore(z, OCCLUSION_PENALTY_HEAVY);
            if (newScore < currentScore) {
              currentScore = newScore;
              improved = true;
              break;
            }

            // Undo
            for (const [, m] of moves) {
              occupied.delete(cellKey(m.nx, m.ny));
            }
            for (const [rid, m] of moves) {
              occupied.add(cellKey(m.ox, m.oy));
              result.set(rid, { x: m.ox, y: m.oy, z });
            }
          }

          if (improved) break;
        }

        if (!improved) break;
      }
    }
  }
}

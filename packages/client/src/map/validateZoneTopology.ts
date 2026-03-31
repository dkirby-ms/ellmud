/**
 * Zone Topology Validator — pure graph analysis that detects topological
 * conflicts BEFORE the layout engine runs.
 *
 * A topological conflict means the same room is reachable via two different
 * paths that imply different ideal (x, y) grid positions. No layout algorithm
 * can fix this — the zone data itself must be corrected.
 *
 * A position collision means two different rooms want the same grid cell.
 * The layout engine resolves these with spiral placement, but they indicate
 * density issues worth surfacing to zone designers.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TopologyConflict {
  roomId: string;
  paths: Array<{ via: string; idealPos: { x: number; y: number } }>;
  /** Manhattan distance between the most divergent ideal positions. */
  delta: number;
}

export interface PositionCollision {
  position: { x: number; y: number };
  rooms: string[];
}

export interface TopologyValidationResult {
  valid: boolean;
  conflicts: TopologyConflict[];
  collisions: PositionCollision[];
  /** Human-readable summary string. */
  summary: string;
}

// ─── Direction Offsets ───────────────────────────────────────────────────────

interface Offset3D {
  dx: number;
  dy: number;
  dz: number;
}

const OFFSETS: Record<string, Offset3D> = {
  north: { dx: 0, dy: -1, dz: 0 },
  south: { dx: 0, dy: 1, dz: 0 },
  east: { dx: 1, dy: 0, dz: 0 },
  west: { dx: -1, dy: 0, dz: 0 },
  up: { dx: 0, dy: 0, dz: 1 },
  down: { dx: 0, dy: 0, dz: -1 },
};

// ─── Validator ───────────────────────────────────────────────────────────────

/**
 * BFS from `startRoom`, assigning ideal grid positions using direction offsets.
 * Detects topological conflicts (same room, different ideal positions) and
 * position collisions (different rooms, same grid cell).
 */
export function validateZoneTopology(
  rooms: Map<string, Map<string, string>>,
  startRoom: string,
): TopologyValidationResult {
  interface Pos3D { x: number; y: number; z: number }
  const positions = new Map<string, Pos3D>();
  const firstVia = new Map<string, string>();
  const conflictMap = new Map<string, TopologyConflict>();
  const conflicts: TopologyConflict[] = [];

  // Track which rooms claim each 3D grid cell (collisions only on same z-level)
  const cellToRooms = new Map<string, string[]>();
  const cellKey3 = (x: number, y: number, z: number) => `${x},${y},${z}`;

  // Seed BFS
  positions.set(startRoom, { x: 0, y: 0, z: 0 });
  firstVia.set(startRoom, '(start)');
  cellToRooms.set(cellKey3(0, 0, 0), [startRoom]);
  const queue: string[] = [startRoom];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentPos = positions.get(current)!;
    const exits = rooms.get(current);
    if (!exits) continue;

    for (const [dir, target] of exits) {
      const offset = OFFSETS[dir];
      if (!offset) continue; // skip unknown directions

      const idealX = currentPos.x + offset.dx;
      const idealY = currentPos.y + offset.dy;
      const idealZ = currentPos.z + offset.dz;

      if (positions.has(target)) {
        // Room already placed — check whether this path agrees on (x, y)
        const existing = positions.get(target)!;
        if (existing.x !== idealX || existing.y !== idealY) {
          const delta =
            Math.abs(existing.x - idealX) + Math.abs(existing.y - idealY);

          if (conflictMap.has(target)) {
            const c = conflictMap.get(target)!;
            c.paths.push({ via: current, idealPos: { x: idealX, y: idealY } });
            c.delta = Math.max(c.delta, delta);
          } else {
            const c: TopologyConflict = {
              roomId: target,
              paths: [
                { via: firstVia.get(target)!, idealPos: { x: existing.x, y: existing.y } },
                { via: current, idealPos: { x: idealX, y: idealY } },
              ],
              delta,
            };
            conflicts.push(c);
            conflictMap.set(target, c);
          }
        }
      } else {
        // First visit — assign ideal position
        positions.set(target, { x: idealX, y: idealY, z: idealZ });
        firstVia.set(target, current);
        const key = cellKey3(idealX, idealY, idealZ);
        if (!cellToRooms.has(key)) cellToRooms.set(key, []);
        cellToRooms.get(key)!.push(target);
        queue.push(target);
      }
    }
  }

  // Collect position collisions (only rooms on the same z-level)
  const collisions: PositionCollision[] = [];
  for (const [key, roomIds] of cellToRooms) {
    if (roomIds.length > 1) {
      const [x, y] = key.split(',').map(Number);
      collisions.push({ position: { x, y }, rooms: [...roomIds] });
    }
  }

  // Sort conflicts by severity (highest delta first)
  conflicts.sort((a, b) => b.delta - a.delta);

  // Human-readable summary
  const valid = conflicts.length === 0 && collisions.length === 0;
  let summary: string;
  if (valid) {
    summary = `Zone topology is valid. ${positions.size} rooms placed with no conflicts or collisions.`;
  } else {
    const parts: string[] = [];
    if (conflicts.length > 0) {
      const maxDelta = Math.max(...conflicts.map((c) => c.delta));
      parts.push(
        `${conflicts.length} topological conflict${conflicts.length === 1 ? '' : 's'} (max delta: ${maxDelta})`,
      );
    }
    if (collisions.length > 0) {
      parts.push(
        `${collisions.length} position collision${collisions.length === 1 ? '' : 's'}`,
      );
    }
    summary = `Zone has ${parts.join(' and ')}. ${positions.size} rooms analyzed.`;
  }

  return { valid, conflicts, collisions, summary };
}

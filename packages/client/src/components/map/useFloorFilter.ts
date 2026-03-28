import { useMemo } from 'react';
import type { RoomPosition } from '../../map/computeLayout.js';

export interface FloorBounds {
  minFloor: number;
  maxFloor: number;
  roomCounts: Map<number, number>;
  isMultiFloor: boolean;
}

/** Compute min/max z-levels and per-floor room counts from a positions map. */
export function computeFloorBounds(positions: Map<string, RoomPosition>): FloorBounds {
  let minFloor = 0;
  let maxFloor = 0;
  const roomCounts = new Map<number, number>();

  for (const pos of positions.values()) {
    if (pos.z < minFloor) minFloor = pos.z;
    if (pos.z > maxFloor) maxFloor = pos.z;
    roomCounts.set(pos.z, (roomCounts.get(pos.z) ?? 0) + 1);
  }

  return { minFloor, maxFloor, roomCounts, isMultiFloor: minFloor !== maxFloor };
}

/**
 * Hook: returns floor bounds computed from positions.
 * Pure memo — no state. Consumers own `currentFloor` state.
 */
export function useFloorBounds(positions: Map<string, RoomPosition>): FloorBounds {
  return useMemo(() => computeFloorBounds(positions), [positions]);
}

export interface FloorFilteredEdge {
  fromId: string;
  toId: string;
  fromPos: RoomPosition;
  toPos: RoomPosition;
  direction: string;
  key: string;
  /** True when both endpoints are on `currentFloor`. */
  intraFloor: boolean;
}

/**
 * Given a set of edges (room→room), partition them into:
 * - edges fully on the current floor (intraFloor = true)
 * - edges crossing floors where at least one endpoint is on currentFloor (intraFloor = false)
 *
 * Returns the filtered edges plus a set of "ghost" room IDs that are
 * the off-floor endpoints of inter-floor edges.
 */
export function filterEdgesByFloor(
  edges: Array<{ fromId: string; toId: string; fromPos: RoomPosition; toPos: RoomPosition; direction: string; key: string }>,
  currentFloor: number,
): { filteredEdges: FloorFilteredEdge[]; ghostRoomIds: Set<string> } {
  const filteredEdges: FloorFilteredEdge[] = [];
  const ghostRoomIds = new Set<string>();

  for (const edge of edges) {
    const fromOnFloor = edge.fromPos.z === currentFloor;
    const toOnFloor = edge.toPos.z === currentFloor;

    if (!fromOnFloor && !toOnFloor) continue; // both off floor — skip

    const intraFloor = fromOnFloor && toOnFloor;
    filteredEdges.push({ ...edge, intraFloor });

    // Track off-floor endpoints as ghost rooms
    if (!fromOnFloor) ghostRoomIds.add(edge.fromId);
    if (!toOnFloor) ghostRoomIds.add(edge.toId);
  }

  return { filteredEdges, ghostRoomIds };
}

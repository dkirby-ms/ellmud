/**
 * useExplorationMap — Maintains client-side map state from exploration messages.
 *
 * Listens for EXPLORATION_DATA (bulk load on join) and EXPLORATION_UPDATE
 * (single room on entry), recomputes ghost rooms and BFS layout after each update.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Room } from '@colyseus/sdk';
import type { ExploredRoomData, ExplorationDataMessage, ExplorationUpdateMessage } from '@ellmud/shared';
import { MessageTypes } from '@ellmud/shared';
import { computeLayout, type RoomPosition, type LayoutRoom } from '../map/computeLayout.js';

export interface MapState {
  visitedRooms: Map<string, ExploredRoomData>;
  ghostRooms: Map<string, { roomId: string; direction: string }>;
  positions: Map<string, RoomPosition>;
  currentRoomId: string | null;
}

const EMPTY_STATE: MapState = {
  visitedRooms: new Map(),
  ghostRooms: new Map(),
  positions: new Map(),
  currentRoomId: null,
};

/** Direction offsets matching computeLayout conventions. */
const DIRECTION_OFFSETS: Record<string, { dx: number; dy: number }> = {
  north: { dx: 0, dy: -1 },
  south: { dx: 0, dy: 1 },
  east: { dx: 1, dy: 0 },
  west: { dx: -1, dy: 0 },
};

/**
 * Compute ghost rooms — rooms referenced in exits of visited rooms but not yet visited.
 * Returns a map of synthetic ghost room IDs → metadata.
 */
function computeGhostRooms(
  visited: Map<string, ExploredRoomData>,
): Map<string, { roomId: string; direction: string }> {
  const ghosts = new Map<string, { roomId: string; direction: string }>();
  for (const [, room] of visited) {
    for (const [direction, targetId] of Object.entries(room.exits)) {
      if (!visited.has(targetId)) {
        ghosts.set(targetId, { roomId: targetId, direction });
      }
    }
  }
  return ghosts;
}

/**
 * Compute layout positions for visited rooms, then estimate ghost room positions
 * based on visited room position + direction offset.
 */
function computeAllPositions(
  visited: Map<string, ExploredRoomData>,
  ghosts: Map<string, { roomId: string; direction: string }>,
  entryRoomId: string | null,
): Map<string, RoomPosition> {
  if (!entryRoomId || visited.size === 0) return new Map();

  // Build LayoutRoom map for the BFS engine
  const layoutRooms = new Map<string, LayoutRoom>();
  for (const [id, room] of visited) {
    layoutRooms.set(id, {
      exits: new Map(Object.entries(room.exits)),
    });
  }

  const positions = computeLayout(layoutRooms, entryRoomId);

  // Estimate ghost room positions from the visited parent + direction offset
  for (const [ghostId] of ghosts) {
    if (positions.has(ghostId)) continue;

    // Find a visited room that has an exit to this ghost
    for (const [, room] of visited) {
      for (const [dir, targetId] of Object.entries(room.exits)) {
        if (targetId === ghostId) {
          const parentPos = positions.get(room.roomId);
          if (parentPos) {
            const offset = DIRECTION_OFFSETS[dir];
            if (offset) {
              positions.set(ghostId, {
                x: parentPos.x + offset.dx,
                y: parentPos.y + offset.dy,
                z: parentPos.z,
              });
            }
          }
          break;
        }
      }
      if (positions.has(ghostId)) break;
    }
  }

  // Ghost rooms from up/down exits: place at same x,y, different z
  for (const [ghostId] of ghosts) {
    if (positions.has(ghostId)) continue;

    for (const [, room] of visited) {
      for (const [dir, targetId] of Object.entries(room.exits)) {
        if (targetId === ghostId && (dir === 'up' || dir === 'down')) {
          const parentPos = positions.get(room.roomId);
          if (parentPos) {
            positions.set(ghostId, {
              x: parentPos.x,
              y: parentPos.y,
              z: parentPos.z + (dir === 'up' ? 1 : -1),
            });
          }
          break;
        }
      }
      if (positions.has(ghostId)) break;
    }
  }

  return positions;
}

/**
 * Find the entry room among visited rooms — the first room with type 'entry',
 * or fall back to currentRoomId, or the first room in the collection.
 */
function findEntryRoomId(
  visited: Map<string, ExploredRoomData>,
  currentRoomId: string | null,
): string | null {
  for (const [id, room] of visited) {
    if (room.roomType === 'entry') return id;
  }
  if (currentRoomId && visited.has(currentRoomId)) return currentRoomId;
  const firstKey = visited.keys().next();
  return firstKey.done ? null : firstKey.value;
}

export function useExplorationMap(room: Room | null): MapState {
  const [mapState, setMapState] = useState<MapState>(EMPTY_STATE);
  const visitedRef = useRef<Map<string, ExploredRoomData>>(new Map());
  const currentRoomRef = useRef<string | null>(null);

  const rebuildState = useCallback(() => {
    const visited = visitedRef.current;
    const currentRoomId = currentRoomRef.current;
    const ghosts = computeGhostRooms(visited);
    const entryId = findEntryRoomId(visited, currentRoomId);
    const positions = computeAllPositions(visited, ghosts, entryId);

    setMapState({
      visitedRooms: new Map(visited),
      ghostRooms: ghosts,
      positions,
      currentRoomId,
    });
  }, []);

  useEffect(() => {
    if (!room) return;

    const handleExplorationData = (msg: ExplorationDataMessage) => {
      const newVisited = new Map<string, ExploredRoomData>();
      for (const r of msg.rooms) {
        newVisited.set(r.roomId, r);
      }
      visitedRef.current = newVisited;
      currentRoomRef.current = msg.currentRoomId;
      rebuildState();
    };

    const handleExplorationUpdate = (msg: ExplorationUpdateMessage) => {
      visitedRef.current.set(msg.room.roomId, msg.room);
      currentRoomRef.current = msg.room.roomId;
      rebuildState();
    };

    room.onMessage(MessageTypes.EXPLORATION_DATA, handleExplorationData);
    room.onMessage(MessageTypes.EXPLORATION_UPDATE, handleExplorationUpdate);

    return () => {
      // Colyseus SDK doesn't expose removeMessageHandler — cleanup happens on room.leave()
    };
  }, [room, rebuildState]);

  return mapState;
}

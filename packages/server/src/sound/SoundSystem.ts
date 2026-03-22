/**
 * SoundSystem — room-by-room noise propagation (GDD §12).
 *
 * Pure game logic. No Colyseus dependency.
 * ShardRoom calls propagateSound() and delivers results to clients.
 *
 * Algorithm: BFS from source room, attenuating noise by 2 per room.
 * Room properties modify propagation:
 *   - heavy_door: halves noise entering the room
 *   - cavern: reduces attenuation by 1 (open space carries sound)
 *   - water: reduces attenuation by 1 (water carries sound)
 */

import type { Direction, RoomProperty } from '@ellmud/shared';
import { SOUND_ATTENUATION_PER_ROOM } from '@ellmud/shared';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Minimal room view needed for sound propagation. */
export interface SoundRoom {
  id: string;
  exits: Map<Direction, string>;
  properties?: RoomProperty[];
}

/** Resolver to look up a room by ID. */
export type RoomResolver = (roomId: string) => SoundRoom | undefined;

/** Result of sound propagation for a single receiving room. */
export interface PropagationResult {
  roomId: string;
  effectiveNoise: number;
  /** Direction the sound came from, relative to the listener's room. */
  direction: Direction;
  /** Number of rooms between source and listener. */
  distance: number;
}

// ─── Sound System ────────────────────────────────────────────────────────────

export class SoundSystem {
  private resolveRoom: RoomResolver;

  constructor(resolveRoom: RoomResolver) {
    this.resolveRoom = resolveRoom;
  }

  /**
   * Propagate a sound from sourceRoomId outward via BFS.
   *
   * Returns rooms where the sound is audible (effectiveNoise > 0),
   * excluding the source room itself.
   */
  propagateSound(sourceRoomId: string, noiseLevel: number): PropagationResult[] {
    if (noiseLevel <= 0) return [];

    const sourceRoom = this.resolveRoom(sourceRoomId);
    if (!sourceRoom) return [];

    const results: PropagationResult[] = [];

    // BFS: track best noise arriving at each room
    const visited = new Map<string, number>();
    visited.set(sourceRoomId, noiseLevel);

    // Queue: [roomId, noiseAtRoom, distance]
    const queue: Array<[string, number, number]> = [[sourceRoomId, noiseLevel, 0]];

    // Track the BFS parent for direction calculation: roomId → parentRoomId
    const parent = new Map<string, string>();

    while (queue.length > 0) {
      const [currentRoomId, currentNoise, distance] = queue.shift()!;
      const currentRoom = this.resolveRoom(currentRoomId);
      if (!currentRoom) continue;

      for (const [_exitDir, adjacentRoomId] of currentRoom.exits) {
        const adjacentRoom = this.resolveRoom(adjacentRoomId);
        if (!adjacentRoom) continue;

        // Calculate attenuation for traversing to this room
        let attenuation = SOUND_ATTENUATION_PER_ROOM;

        // Room properties on the TARGET room modify incoming sound
        if (adjacentRoom.properties) {
          if (adjacentRoom.properties.includes('cavern')) {
            attenuation = Math.max(0, attenuation - 1);
          }
          if (adjacentRoom.properties.includes('water')) {
            attenuation = Math.max(0, attenuation - 1);
          }
        }

        let arrivedNoise = currentNoise - attenuation;

        // Heavy door halves noise passing through
        if (adjacentRoom.properties?.includes('heavy_door')) {
          arrivedNoise = arrivedNoise * 0.5;
        }

        // Sound must be audible (> 0) to continue propagating
        if (arrivedNoise <= 0) continue;

        const previousBest = visited.get(adjacentRoomId);
        if (previousBest !== undefined && previousBest >= arrivedNoise) continue;

        visited.set(adjacentRoomId, arrivedNoise);
        const newDistance = distance + 1;

        // Track parent for direction calculation (update on better path)
        if (!parent.has(adjacentRoomId) || previousBest === undefined || previousBest < arrivedNoise) {
          parent.set(adjacentRoomId, currentRoomId);
        }

        queue.push([adjacentRoomId, arrivedNoise, newDistance]);
      }
    }

    // Build results for all rooms except the source
    for (const [roomId, noise] of visited) {
      if (roomId === sourceRoomId) continue;

      const room = this.resolveRoom(roomId);
      if (!room) continue;

      // Direction: find which exit of the listener's room leads to the parent
      const parentRoomId = parent.get(roomId);
      const direction = this.findDirectionToRoom(room, parentRoomId);

      if (direction) {
        const distance = this.computeDistance(sourceRoomId, roomId);
        results.push({
          roomId,
          effectiveNoise: Math.round(noise * 10) / 10,
          direction,
          distance,
        });
      }
    }

    return results;
  }

  /**
   * Find which direction from `room` leads to `targetRoomId`.
   */
  private findDirectionToRoom(room: SoundRoom, targetRoomId: string | undefined): Direction | undefined {
    if (!targetRoomId) return undefined;
    for (const [dir, adjId] of room.exits) {
      if (adjId === targetRoomId) return dir;
    }
    return undefined;
  }

  /**
   * BFS distance between two rooms (unweighted hop count).
   */
  private computeDistance(fromRoomId: string, toRoomId: string): number {
    if (fromRoomId === toRoomId) return 0;

    const visited = new Set<string>([fromRoomId]);
    const queue: Array<[string, number]> = [[fromRoomId, 0]];

    while (queue.length > 0) {
      const [currentId, dist] = queue.shift()!;
      const room = this.resolveRoom(currentId);
      if (!room) continue;

      for (const adjId of room.exits.values()) {
        if (adjId === toRoomId) return dist + 1;
        if (!visited.has(adjId)) {
          visited.add(adjId);
          queue.push([adjId, dist + 1]);
        }
      }
    }

    return Infinity;
  }
}

import { useState, useMemo } from 'react';
import type { ExploredRoomData } from '@ellmud/shared';
import type { RoomPosition } from '../../map/computeLayout.js';
import { CELL_SIZE, GHOST_FLOOR_OPACITY } from './constants.js';
import { RoomNode } from './RoomNode.js';
import { ExitEdge } from './ExitEdge.js';
import { GhostRoom } from './GhostRoom.js';
import { FloorSelector } from './FloorSelector.js';
import { useFloorBounds, filterEdgesByFloor } from './useFloorFilter.js';

export interface MapRendererProps {
  visitedRooms: Map<string, ExploredRoomData>;
  ghostRooms: Map<string, { roomId: string; direction: string }>;
  positions: Map<string, RoomPosition>;
  currentRoomId: string | null;
  compact?: boolean;
  onRoomClick?: (roomId: string) => void;
  /** Override the initial floor (e.g., set to current room's z). */
  initialFloor?: number;
  /** When true, hides the floor selector even on multi-floor maps. */
  hideFloorSelector?: boolean;
}

/** Compute a viewBox that fits all positioned rooms with padding. */
function computeViewBox(positions: Map<string, RoomPosition>, padding: number) {
  if (positions.size === 0) return { x: -100, y: -100, width: 200, height: 200 };

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const pos of positions.values()) {
    const px = pos.x * CELL_SIZE;
    const py = pos.y * CELL_SIZE;
    if (px < minX) minX = px;
    if (py < minY) minY = py;
    if (px > maxX) maxX = px;
    if (py > maxY) maxY = py;
  }

  return {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  };
}

/** Collect edges from visited rooms (only where both endpoints have positions). */
function collectEdges(
  visitedRooms: Map<string, ExploredRoomData>,
  positions: Map<string, RoomPosition>,
) {
  const edges: Array<{
    fromId: string;
    toId: string;
    fromPos: RoomPosition;
    toPos: RoomPosition;
    direction: string;
    key: string;
  }> = [];
  const seen = new Set<string>();

  for (const [roomId, room] of visitedRooms) {
    const fromPos = positions.get(roomId);
    if (!fromPos) continue;

    for (const [direction, targetId] of Object.entries(room.exits)) {
      const toPos = positions.get(targetId);
      if (!toPos) continue;

      // Deduplicate bidirectional edges
      const edgeKey = [roomId, targetId].sort().join('::');
      if (seen.has(edgeKey)) continue;
      seen.add(edgeKey);

      edges.push({ fromId: roomId, toId: targetId, fromPos: fromPos, toPos: toPos, direction, key: edgeKey });
    }
  }

  return edges;
}

export function MapRenderer({
  visitedRooms,
  ghostRooms,
  positions,
  currentRoomId,
  compact = false,
  onRoomClick,
  initialFloor,
  hideFloorSelector = false,
}: MapRendererProps) {
  const floorBounds = useFloorBounds(positions);

  // Default floor to current room's z, or 0
  const defaultFloor = useMemo(() => {
    if (initialFloor != null) return initialFloor;
    if (currentRoomId) {
      const pos = positions.get(currentRoomId);
      if (pos) return pos.z;
    }
    return 0;
  }, [initialFloor, currentRoomId, positions]);

  const [currentFloor, setCurrentFloor] = useState(defaultFloor);

  // All edges (unfiltered by floor)
  const allEdges = useMemo(() => collectEdges(visitedRooms, positions), [visitedRooms, positions]);

  // Floor-filtered data
  const { visiblePositions, filteredEdges, interFloorGhostIds } = useMemo(() => {
    if (!floorBounds.isMultiFloor) {
      // Single floor — no filtering needed
      return {
        visiblePositions: positions,
        filteredEdges: allEdges.map((e) => ({ ...e, intraFloor: true })),
        interFloorGhostIds: new Set<string>(),
      };
    }

    // Filter positions to current floor
    const visible = new Map<string, RoomPosition>();
    for (const [id, pos] of positions) {
      if (pos.z === currentFloor) visible.set(id, pos);
    }

    const { filteredEdges: fe, ghostRoomIds } = filterEdgesByFloor(allEdges, currentFloor);

    return {
      visiblePositions: visible,
      filteredEdges: fe,
      interFloorGhostIds: ghostRoomIds,
    };
  }, [positions, allEdges, currentFloor, floorBounds.isMultiFloor]);

  // ViewBox is calculated from visible positions + ghost rooms
  const allVisiblePositions = useMemo(() => {
    const combined = new Map(visiblePositions);
    for (const ghostId of interFloorGhostIds) {
      const pos = positions.get(ghostId);
      if (pos) combined.set(ghostId, pos);
    }
    return combined;
  }, [visiblePositions, interFloorGhostIds, positions]);

  const padding = compact ? 30 : 50;
  const vb = computeViewBox(allVisiblePositions, padding);

  if (positions.size === 0) {
    return (
      <svg
        className="map-renderer"
        viewBox="-100 -100 200 200"
        style={{ width: '100%', height: '100%' }}
      >
        <text
          x={0}
          y={0}
          textAnchor="middle"
          fill="#4A4B55"
          fontSize={12}
          fontFamily="var(--font-mono)"
        >
          No map data
        </text>
      </svg>
    );
  }

  const showSelector = floorBounds.isMultiFloor && !hideFloorSelector;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <svg
        className="map-renderer"
        viewBox={`${vb.x} ${vb.y} ${vb.width} ${vb.height}`}
        style={{ width: '100%', height: '100%' }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Layer 1: Edges (behind everything) */}
        <g className="map-edges">
          {filteredEdges.map((edge) => (
            <ExitEdge
              key={edge.key}
              fromPosition={edge.fromPos}
              toPosition={edge.toPos}
              direction={edge.direction}
              interFloor={!edge.intraFloor}
            />
          ))}
        </g>

        {/* Layer 2: Inter-floor ghost rooms (off-floor endpoints) */}
        <g className="map-floor-ghosts">
          {Array.from(interFloorGhostIds).map((ghostId) => {
            const pos = positions.get(ghostId);
            if (!pos) return null;
            const roomData = visitedRooms.get(ghostId);
            // Render as a dimmed version — either as a real room (dimmed) or a ghost circle
            if (roomData) {
              return (
                <g key={`fg-${ghostId}`} opacity={GHOST_FLOOR_OPACITY}>
                  <RoomNode
                    roomId={ghostId}
                    position={pos}
                    roomData={roomData}
                    isCurrent={false}
                    compact={compact}
                  />
                </g>
              );
            }
            return null;
          })}
        </g>

        {/* Layer 3: Standard ghost rooms (unexplored neighbors) */}
        <g className="map-ghosts">
          {Array.from(ghostRooms.entries()).map(([ghostId, ghost]) => {
            const pos = positions.get(ghostId);
            if (!pos) return null;
            // Only show ghosts on the current floor (or if single floor)
            if (floorBounds.isMultiFloor && pos.z !== currentFloor) return null;
            return (
              <GhostRoom
                key={ghostId}
                roomId={ghostId}
                position={pos}
                direction={ghost.direction}
                compact={compact}
              />
            );
          })}
        </g>

        {/* Layer 4: Visited rooms on current floor (on top) */}
        <g className="map-rooms">
          {Array.from(visitedRooms.entries()).map(([roomId, roomData]) => {
            const pos = positions.get(roomId);
            if (!pos) return null;
            // Only show rooms on the current floor (if multi-floor)
            if (floorBounds.isMultiFloor && pos.z !== currentFloor) return null;
            return (
              <RoomNode
                key={roomId}
                roomId={roomId}
                position={pos}
                roomData={roomData}
                isCurrent={roomId === currentRoomId}
                compact={compact}
                onClick={onRoomClick ? () => onRoomClick(roomId) : undefined}
              />
            );
          })}
        </g>
      </svg>

      {/* Floor selector overlay */}
      {showSelector && (
        <div
          style={{
            position: 'absolute',
            bottom: compact ? '4px' : '8px',
            right: compact ? '4px' : '8px',
            zIndex: 2,
          }}
        >
          <FloorSelector
            currentFloor={currentFloor}
            minFloor={floorBounds.minFloor}
            maxFloor={floorBounds.maxFloor}
            onFloorChange={setCurrentFloor}
            roomCounts={compact ? undefined : floorBounds.roomCounts}
            keyboardEnabled={!compact}
          />
        </div>
      )}
    </div>
  );
}

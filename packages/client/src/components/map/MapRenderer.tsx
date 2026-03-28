import type { ExploredRoomData } from '@ellmud/shared';
import type { RoomPosition } from '../../map/computeLayout.js';
import { CELL_SIZE } from './constants.js';
import { RoomNode } from './RoomNode.js';
import { ExitEdge } from './ExitEdge.js';
import { GhostRoom } from './GhostRoom.js';

export interface MapRendererProps {
  visitedRooms: Map<string, ExploredRoomData>;
  ghostRooms: Map<string, { roomId: string; direction: string }>;
  positions: Map<string, RoomPosition>;
  currentRoomId: string | null;
  compact?: boolean;
  onRoomClick?: (roomId: string) => void;
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
  const edges: Array<{ from: RoomPosition; to: RoomPosition; direction: string; key: string }> = [];
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

      edges.push({ from: fromPos, to: toPos, direction, key: edgeKey });
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
}: MapRendererProps) {
  const padding = compact ? 30 : 50;
  const vb = computeViewBox(positions, padding);

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

  const edges = collectEdges(visitedRooms, positions);

  return (
    <svg
      className="map-renderer"
      viewBox={`${vb.x} ${vb.y} ${vb.width} ${vb.height}`}
      style={{ width: '100%', height: '100%' }}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Layer 1: Edges (behind everything) */}
      <g className="map-edges">
        {edges.map((edge) => (
          <ExitEdge
            key={edge.key}
            fromPosition={edge.from}
            toPosition={edge.to}
            direction={edge.direction}
          />
        ))}
      </g>

      {/* Layer 2: Ghost rooms */}
      <g className="map-ghosts">
        {Array.from(ghostRooms.entries()).map(([ghostId, ghost]) => {
          const pos = positions.get(ghostId);
          if (!pos) return null;
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

      {/* Layer 3: Visited rooms (on top) */}
      <g className="map-rooms">
        {Array.from(visitedRooms.entries()).map(([roomId, roomData]) => {
          const pos = positions.get(roomId);
          if (!pos) return null;
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
  );
}

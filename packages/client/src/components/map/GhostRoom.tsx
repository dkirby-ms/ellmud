import type { RoomPosition } from '../../map/computeLayout.js';
import {
  CELL_SIZE,
  NODE_SIZE,
  NODE_SIZE_COMPACT,
  GHOST_OPACITY,
} from './constants.js';

export interface GhostRoomProps {
  roomId: string;
  position: RoomPosition;
  direction: string;
  compact: boolean;
}

export function GhostRoom({ roomId, position, direction, compact }: GhostRoomProps) {
  const cx = position.x * CELL_SIZE;
  const cy = position.y * CELL_SIZE;
  const r = compact ? NODE_SIZE_COMPACT / 2 : NODE_SIZE / 2;

  return (
    <g className="ghost-room" opacity={GHOST_OPACITY} data-room-id={roomId}>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="#8A8B95"
        strokeWidth={1}
        strokeDasharray="3 2"
      />

      {/* Label: "?" in compact, direction name in full */}
      {!compact && (
        <text
          x={cx}
          y={cy + r + 10}
          textAnchor="middle"
          fill="#4A4B55"
          fontSize={7}
          fontFamily="var(--font-mono)"
        >
          {direction}
        </text>
      )}

      <text
        x={cx}
        y={cy + (compact ? 3 : 3.5)}
        textAnchor="middle"
        fill="#4A4B55"
        fontSize={compact ? 7 : 9}
        fontFamily="var(--font-mono)"
      >
        ?
      </text>
    </g>
  );
}

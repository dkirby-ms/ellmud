import type { ExploredRoomData } from '@ellmud/shared';
import type { RoomPosition } from '../../map/computeLayout.js';
import {
  CELL_SIZE,
  NODE_SIZE,
  NODE_SIZE_COMPACT,
  ROOM_TYPE_COLORS,
  DEFAULT_ROOM_COLOR,
} from './constants.js';

export interface RoomNodeProps {
  roomId: string;
  position: RoomPosition;
  roomData: ExploredRoomData;
  isCurrent: boolean;
  compact: boolean;
  onClick?: () => void;
  /** When true, suppresses ↑/↓ badges (used for inter-floor ghost rooms). */
  hideVerticalBadges?: boolean;
}

export function RoomNode({ roomId, position, roomData, isCurrent, compact, onClick, hideVerticalBadges }: RoomNodeProps) {
  const cx = position.x * CELL_SIZE;
  const cy = position.y * CELL_SIZE;
  const r = compact ? NODE_SIZE_COMPACT / 2 : NODE_SIZE / 2;
  const fill = ROOM_TYPE_COLORS[roomData.roomType] ?? DEFAULT_ROOM_COLOR;

  return (
    <g
      className="room-node"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      data-room-id={roomId}
    >
      {/* Glow effect for current room */}
      {isCurrent && (
        <circle
          cx={cx}
          cy={cy}
          r={r + 4}
          fill="none"
          stroke="#C9A84C"
          strokeWidth={2}
          opacity={0.8}
        >
          <animate
            attributeName="opacity"
            values="0.8;0.4;0.8"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
      )}

      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={fill}
        stroke={isCurrent ? '#C9A84C' : '#1C1D27'}
        strokeWidth={isCurrent ? 2 : 1}
      />

      {/* Room name label (full view only) */}
      {!compact && (
        <text
          x={cx}
          y={cy + r + 12}
          textAnchor="middle"
          fill="#8A8B95"
          fontSize={8}
          fontFamily="var(--font-mono)"
        >
          {roomData.roomName.length > 14
            ? roomData.roomName.slice(0, 12) + '…'
            : roomData.roomName}
        </text>
      )}

      {/* Up/down exit badges — show when room has vertical exits */}
      {!hideVerticalBadges && roomData.exits.up && (
        <text
          x={cx + r + 2}
          y={cy - r + 2}
          textAnchor="start"
          fill="#a78bfa"
          fontSize={compact ? 7 : 9}
          fontFamily="var(--font-mono)"
          fontWeight="bold"
        >
          ↑
        </text>
      )}
      {!hideVerticalBadges && roomData.exits.down && (
        <text
          x={cx + r + 2}
          y={cy + (roomData.exits.up ? r + 2 : r - 2)}
          textAnchor="start"
          fill="#a78bfa"
          fontSize={compact ? 7 : 9}
          fontFamily="var(--font-mono)"
          fontWeight="bold"
        >
          ↓
        </text>
      )}
    </g>
  );
}

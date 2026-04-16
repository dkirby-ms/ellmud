import type { RoomPosition } from '../../map/computeLayout.js';
import {
  CELL_SIZE,
  EDGE_STROKE,
  EDGE_STROKE_WIDTH,
  INTER_FLOOR_STROKE,
  INTER_FLOOR_STROKE_WIDTH,
  INTER_FLOOR_DASH,
} from './constants.js';

export interface ExitEdgeProps {
  fromPosition: RoomPosition;
  toPosition: RoomPosition;
  direction: string;
  /** When true, renders as a dashed purple inter-floor edge with direction indicator. */
  interFloor?: boolean;
}

export function ExitEdge({ fromPosition, toPosition, interFloor }: ExitEdgeProps) {
  const x1 = fromPosition.x * CELL_SIZE;
  const y1 = fromPosition.y * CELL_SIZE;
  const x2 = toPosition.x * CELL_SIZE;
  const y2 = toPosition.y * CELL_SIZE;

  // Skip zero-length edges (inter-floor exits sharing the same x,y)
  if (x1 === x2 && y1 === y2) return null;

  const stroke = interFloor ? INTER_FLOOR_STROKE : EDGE_STROKE;
  const strokeWidth = interFloor ? INTER_FLOOR_STROKE_WIDTH : EDGE_STROKE_WIDTH;

  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={interFloor ? INTER_FLOOR_DASH : undefined}
      />
      {/* Inter-floor direction indicators removed — RoomNode badges are canonical */}
    </g>
  );
}

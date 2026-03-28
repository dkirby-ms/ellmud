import type { RoomPosition } from '../../map/computeLayout.js';
import { CELL_SIZE, EDGE_STROKE, EDGE_STROKE_WIDTH } from './constants.js';

export interface ExitEdgeProps {
  fromPosition: RoomPosition;
  toPosition: RoomPosition;
  direction: string;
}

export function ExitEdge({ fromPosition, toPosition }: ExitEdgeProps) {
  const x1 = fromPosition.x * CELL_SIZE;
  const y1 = fromPosition.y * CELL_SIZE;
  const x2 = toPosition.x * CELL_SIZE;
  const y2 = toPosition.y * CELL_SIZE;

  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={EDGE_STROKE}
      strokeWidth={EDGE_STROKE_WIDTH}
      strokeLinecap="round"
    />
  );
}

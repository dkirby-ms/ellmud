import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ExitEdge } from '../ExitEdge.js';
import { CELL_SIZE, INTER_FLOOR_STROKE, INTER_FLOOR_DASH, EDGE_STROKE } from '../constants.js';

const from = { x: 1, y: 1, z: 0 };
const toSameFloor = { x: 2, y: 1, z: 0 };
const toAbove = { x: 1, y: 1, z: 1 };
const toBelow = { x: 1, y: 1, z: -1 };
// Inter-floor edge where rooms don't share x,y (non-zero-length)
const toAboveOffset = { x: 2, y: 1, z: 1 };

function renderEdge(props: Parameters<typeof ExitEdge>[0]) {
  return render(
    <svg>
      <ExitEdge {...props} />
    </svg>,
  );
}

describe('ExitEdge', () => {
  it('renders a line between from and to positions', () => {
    const { container } = renderEdge({
      fromPosition: from,
      toPosition: toSameFloor,
      direction: 'east',
    });
    const line = container.querySelector('line');
    expect(line).toBeTruthy();
    expect(line?.getAttribute('x1')).toBe(String(from.x * CELL_SIZE));
    expect(line?.getAttribute('y1')).toBe(String(from.y * CELL_SIZE));
    expect(line?.getAttribute('x2')).toBe(String(toSameFloor.x * CELL_SIZE));
    expect(line?.getAttribute('y2')).toBe(String(toSameFloor.y * CELL_SIZE));
  });

  it('uses normal stroke for same-floor edges', () => {
    const { container } = renderEdge({
      fromPosition: from,
      toPosition: toSameFloor,
      direction: 'east',
    });
    const line = container.querySelector('line');
    expect(line?.getAttribute('stroke')).toBe(EDGE_STROKE);
    expect(line?.getAttribute('stroke-dasharray')).toBeNull();
  });

  it('uses inter-floor stroke and dash for inter-floor edges', () => {
    const { container } = renderEdge({
      fromPosition: from,
      toPosition: toAboveOffset,
      direction: 'up',
      interFloor: true,
    });
    const line = container.querySelector('line');
    expect(line?.getAttribute('stroke')).toBe(INTER_FLOOR_STROKE);
    expect(line?.getAttribute('stroke-dasharray')).toBe(INTER_FLOOR_DASH);
  });

  it('skips rendering zero-length inter-floor edges (same x,y)', () => {
    const { container } = renderEdge({
      fromPosition: from,
      toPosition: toAbove,
      direction: 'up',
      interFloor: true,
    });
    const line = container.querySelector('line');
    expect(line).toBeNull();
  });

  it('does NOT render a text direction indicator for inter-floor edges', () => {
    const { container } = renderEdge({
      fromPosition: from,
      toPosition: toAbove,
      direction: 'up',
      interFloor: true,
    });
    const texts = container.querySelectorAll('text');
    expect(texts.length).toBe(0);
  });

  it('does NOT render a text direction indicator for downward inter-floor edges', () => {
    const { container } = renderEdge({
      fromPosition: from,
      toPosition: toBelow,
      direction: 'down',
      interFloor: true,
    });
    const texts = container.querySelectorAll('text');
    expect(texts.length).toBe(0);
  });
});

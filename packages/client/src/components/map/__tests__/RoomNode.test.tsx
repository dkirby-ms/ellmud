import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { RoomNode } from '../RoomNode.js';
import { CELL_SIZE, NODE_SIZE } from '../constants.js';
import type { ExploredRoomData } from '@ellmud/shared';

const position = { x: 2, y: 3, z: 0 };
const r = NODE_SIZE / 2;
const cy = position.y * CELL_SIZE;

function makeRoom(exits: Record<string, string> = {}): ExploredRoomData {
  return {
    roomId: 'room-1',
    zoneSlug: 'test-zone',
    visitedAt: new Date().toISOString(),
    roomName: 'Test Room',
    roomType: 'corridor',
    exits: { north: 'room-2', south: 'room-3', ...exits },
  };
}

function renderNode(props: Partial<Parameters<typeof RoomNode>[0]> = {}) {
  return render(
    <svg>
      <RoomNode
        roomId="room-1"
        position={position}
        roomData={makeRoom()}
        isCurrent={false}
        compact={false}
        {...props}
      />
    </svg>,
  );
}

describe('RoomNode — vertical exit badges', () => {
  it('renders ↑ badge when room has an up exit', () => {
    const { container } = renderNode({ roomData: makeRoom({ up: 'room-above' }) });
    const texts = Array.from(container.querySelectorAll('text'));
    const upBadge = texts.find((t) => t.textContent === '↑');
    expect(upBadge).toBeTruthy();
  });

  it('renders ↓ badge when room has a down exit', () => {
    const { container } = renderNode({ roomData: makeRoom({ down: 'room-below' }) });
    const texts = Array.from(container.querySelectorAll('text'));
    const downBadge = texts.find((t) => t.textContent === '↓');
    expect(downBadge).toBeTruthy();
  });

  it('positions ↓ badge below the room center (positive y offset)', () => {
    const { container } = renderNode({ roomData: makeRoom({ down: 'room-below' }) });
    const texts = Array.from(container.querySelectorAll('text'));
    const downBadge = texts.find((t) => t.textContent === '↓');
    expect(downBadge).toBeTruthy();
    const badgeY = Number(downBadge?.getAttribute('y'));
    expect(badgeY).toBe(cy + r - 2);
  });

  it('positions ↓ badge further down when up exit is also present', () => {
    const { container } = renderNode({ roomData: makeRoom({ up: 'room-above', down: 'room-below' }) });
    const texts = Array.from(container.querySelectorAll('text'));
    const downBadge = texts.find((t) => t.textContent === '↓');
    expect(downBadge).toBeTruthy();
    const badgeY = Number(downBadge?.getAttribute('y'));
    expect(badgeY).toBe(cy + r + 2);
  });

  it('does not render ↑ or ↓ badges when no vertical exits', () => {
    const { container } = renderNode({ roomData: makeRoom({}) });
    const texts = Array.from(container.querySelectorAll('text'));
    const arrows = texts.filter((t) => t.textContent === '↑' || t.textContent === '↓');
    expect(arrows.length).toBe(0);
  });

  it('hides ↑ and ↓ badges when hideVerticalBadges is true', () => {
    const { container } = renderNode({
      roomData: makeRoom({ up: 'room-above', down: 'room-below' }),
      hideVerticalBadges: true,
    });
    const texts = Array.from(container.querySelectorAll('text'));
    const arrows = texts.filter((t) => t.textContent === '↑' || t.textContent === '↓');
    expect(arrows.length).toBe(0);
  });
});

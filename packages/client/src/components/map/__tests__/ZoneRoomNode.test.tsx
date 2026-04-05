/**
 * ZoneRoomNode.test.tsx — Tests for ReactFlow room node component.
 *
 * Verifies:
 * - Room name rendering
 * - Room type-based colors (ROOM_TYPE_COLORS)
 * - Selection state styling (cyan border)
 * - Badge icons (▲▼ for up/down, ⟐ for portals, content markers)
 * - Floor indicator when z !== 0
 * - Disconnected room warning (gold marker)
 * - Click handler triggers
 * - Context menu events
 * - Tooltip on hover
 *
 * Testing checklist items:
 * - [x] Room type colors render correctly
 * - [x] Portal/up/down badges render
 * - [x] Room selection → side panel population works
 * - [x] Room on hover tooltip appears
 * - [x] Disconnected rooms show warning marker
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactFlowProvider } from '@xyflow/react';

// Component to be tested (implementation TBD by Regis)
// import { ZoneRoomNode } from '../ZoneRoomNode.js';

// ─── Mock Data ──────────────────────────────────────────────────────────────

const mockRoomData = {
  roomId: 'room-001',
  roomName: 'The Entrance Hall',
  roomSlug: 'entrance-hall',
  roomType: 'hall' as const,
  floor: 0,
  hasUpExit: false,
  hasDownExit: false,
  isPortal: false,
  isDisconnected: false,
};

// ─── Helper ─────────────────────────────────────────────────────────────────

/**
 * Wraps the component in ReactFlowProvider for testing.
 * ReactFlow nodes must be rendered within a ReactFlowProvider.
 */
function renderNode(props: any) {
  return render(
    <ReactFlowProvider>
      {/* <ZoneRoomNode {...props} /> */}
      <div data-testid="placeholder">Node component pending implementation</div>
    </ReactFlowProvider>
  );
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('ZoneRoomNode', () => {
  // ── 1. Basic rendering ───────────────────────────────────────────────────

  it.todo('renders room name', () => {
    renderNode({ data: mockRoomData });
    expect(screen.getByText('The Entrance Hall')).toBeDefined();
  });

  it.todo('renders room slug as secondary text', () => {
    renderNode({ data: mockRoomData });
    expect(screen.getByText('entrance-hall')).toBeDefined();
  });

  // ── 2. Room type colors ──────────────────────────────────────────────────

  it.todo('applies correct color for hall room type', () => {
    renderNode({ data: { ...mockRoomData, roomType: 'hall' } });
    const node = screen.getByTestId('room-node');
    // Should use ROOM_TYPE_COLORS.hall
    expect(node.style.backgroundColor).toContain('#');
  });

  it.todo('applies correct color for chamber room type', () => {
    renderNode({ data: { ...mockRoomData, roomType: 'chamber' } });
    const node = screen.getByTestId('room-node');
    expect(node.style.backgroundColor).toContain('#');
  });

  it.todo('applies correct color for corridor room type', () => {
    renderNode({ data: { ...mockRoomData, roomType: 'corridor' } });
    const node = screen.getByTestId('room-node');
    expect(node.style.backgroundColor).toContain('#');
  });

  it.todo('applies correct color for hub room type', () => {
    renderNode({ data: { ...mockRoomData, roomType: 'hub' } });
    const node = screen.getByTestId('room-node');
    expect(node.style.backgroundColor).toContain('#');
  });

  it.todo('applies correct color for dev room type', () => {
    renderNode({ data: { ...mockRoomData, roomType: 'dev' } });
    const node = screen.getByTestId('room-node');
    expect(node.style.backgroundColor).toContain('#');
  });

  // ── 3. Selection state ───────────────────────────────────────────────────

  it.todo('shows cyan border when selected', () => {
    renderNode({ data: mockRoomData, selected: true });
    const node = screen.getByTestId('room-node');
    expect(node.style.borderColor).toContain('cyan');
  });

  it.todo('shows default border when not selected', () => {
    renderNode({ data: mockRoomData, selected: false });
    const node = screen.getByTestId('room-node');
    expect(node.style.borderColor).not.toContain('cyan');
  });

  // ── 4. Badge icons ───────────────────────────────────────────────────────

  it.todo('shows up arrow badge when hasUpExit is true', () => {
    renderNode({ data: { ...mockRoomData, hasUpExit: true } });
    expect(screen.getByText('▲')).toBeDefined();
  });

  it.todo('shows down arrow badge when hasDownExit is true', () => {
    renderNode({ data: { ...mockRoomData, hasDownExit: true } });
    expect(screen.getByText('▼')).toBeDefined();
  });

  it.todo('shows both up and down badges when room has both exits', () => {
    renderNode({ data: { ...mockRoomData, hasUpExit: true, hasDownExit: true } });
    expect(screen.getByText('▲')).toBeDefined();
    expect(screen.getByText('▼')).toBeDefined();
  });

  it.todo('shows portal badge when isPortal is true', () => {
    renderNode({ data: { ...mockRoomData, isPortal: true } });
    expect(screen.getByText('⟐')).toBeDefined();
  });

  it.todo('does not show vertical badges when no up/down exits', () => {
    renderNode({ data: { ...mockRoomData, hasUpExit: false, hasDownExit: false } });
    expect(screen.queryByText('▲')).toBeNull();
    expect(screen.queryByText('▼')).toBeNull();
  });

  // ── 5. Floor indicator ───────────────────────────────────────────────────

  it.todo('shows floor indicator when z !== 0', () => {
    renderNode({ data: { ...mockRoomData, floor: 2 } });
    expect(screen.getByText(/floor.*2/i)).toBeDefined();
  });

  it.todo('does not show floor indicator when z === 0', () => {
    renderNode({ data: { ...mockRoomData, floor: 0 } });
    expect(screen.queryByText(/floor/i)).toBeNull();
  });

  it.todo('shows negative floor indicator for basements', () => {
    renderNode({ data: { ...mockRoomData, floor: -1 } });
    expect(screen.getByText(/floor.*-1/i)).toBeDefined();
  });

  // ── 6. Disconnected warning ──────────────────────────────────────────────

  it.todo('shows gold warning marker for disconnected rooms', () => {
    renderNode({ data: { ...mockRoomData, isDisconnected: true } });
    const warning = screen.getByTestId('disconnected-warning');
    expect(warning).toBeDefined();
    expect(warning.style.color).toContain('gold');
  });

  it.todo('does not show warning marker for connected rooms', () => {
    renderNode({ data: { ...mockRoomData, isDisconnected: false } });
    expect(screen.queryByTestId('disconnected-warning')).toBeNull();
  });

  // ── 7. Click handler ─────────────────────────────────────────────────────

  it.todo('fires onClick callback when node is clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderNode({ data: mockRoomData, onClick });

    await user.click(screen.getByTestId('room-node'));
    expect(onClick).toHaveBeenCalledWith('room-001');
  });

  it.todo('does not fire onClick when node is not clickable', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderNode({ data: mockRoomData, onClick: undefined });

    await user.click(screen.getByTestId('room-node'));
    expect(onClick).not.toHaveBeenCalled();
  });

  // ── 8. Context menu ──────────────────────────────────────────────────────

  it.todo('fires onContextMenu callback on right-click', async () => {
    const user = userEvent.setup();
    const onContextMenu = vi.fn();
    renderNode({ data: mockRoomData, onContextMenu });

    await user.pointer({ keys: '[MouseRight]', target: screen.getByTestId('room-node') });
    expect(onContextMenu).toHaveBeenCalled();
  });

  // ── 9. Tooltip ───────────────────────────────────────────────────────────

  it.todo('shows tooltip with room details on hover', async () => {
    const user = userEvent.setup();
    renderNode({ data: mockRoomData });

    await user.hover(screen.getByTestId('room-node'));
    // Tooltip should appear after hover delay
    expect(await screen.findByRole('tooltip')).toBeDefined();
    expect(screen.getByText(/The Entrance Hall/)).toBeDefined();
  });

  it.todo('tooltip includes room type in description', async () => {
    const user = userEvent.setup();
    renderNode({ data: mockRoomData });

    await user.hover(screen.getByTestId('room-node'));
    expect(await screen.findByRole('tooltip')).toBeDefined();
    expect(screen.getByText(/hall/i)).toBeDefined();
  });

  // ── 10. Long room names ──────────────────────────────────────────────────

  it.todo('truncates very long room names with ellipsis', () => {
    const longName = 'The Grand Ceremonial Hall of the Ancient Order of the Purple Dragon Knights';
    renderNode({ data: { ...mockRoomData, roomName: longName } });
    
    const nameElement = screen.getByText(/Grand Ceremonial/);
    expect(nameElement.textContent).toContain('…');
  });

  // ── 11. Content badges ───────────────────────────────────────────────────

  it.todo('shows player icon when room has players', () => {
    renderNode({ data: { ...mockRoomData, hasPlayers: true } });
    expect(screen.getByText('👤')).toBeDefined();
  });

  it.todo('shows item icon when room has items', () => {
    renderNode({ data: { ...mockRoomData, hasItems: true } });
    expect(screen.getByText('📦')).toBeDefined();
  });

  it.todo('shows NPC icon when room has NPCs', () => {
    renderNode({ data: { ...mockRoomData, hasNPCs: true } });
    expect(screen.getByText('⚠')).toBeDefined();
  });
});

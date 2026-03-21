/**
 * players-nearby.test.tsx — PlayersNearby component tests.
 * Covers rendering, faction icons, click handlers, trade buttons,
 * empty state, and keyboard accessibility.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlayersNearby, type NearbyPlayer } from '../components/_old/PlayersNearby.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockPlayers: NearbyPlayer[] = [
  { id: 'p1', name: 'Warrior Kael', faction: 'forge-wardens', isTrading: false },
  { id: 'p2', name: 'Shadow Vex', faction: 'veil-walkers', isTrading: true },
  { id: 'p3', name: 'Drift Mara', faction: 'drift-merchants', isTrading: false },
  { id: 'p4', name: 'Lone Wolf', faction: 'none', isTrading: false },
];

const defaultProps = {
  players: mockPlayers,
  onPlayerClick: vi.fn(),
  onTradeRequest: vi.fn(),
};

// ─── Tests ───────────────────────────────────────────────────────────────────

// TODO: PlayersNearby.tsx moved to _old/ during UX overhaul. Player list is now part of new page components.
// Rewrite tests for new player list implementation.
describe.skip('PlayersNearby', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Rendering ──

  it('renders title', () => {
    render(<PlayersNearby {...defaultProps} />);
    expect(screen.getByText('Players Nearby')).toBeInTheDocument();
  });

  it('renders player count', () => {
    render(<PlayersNearby {...defaultProps} />);
    expect(screen.getByText('4 players nearby')).toBeInTheDocument();
  });

  it('renders singular player count', () => {
    render(<PlayersNearby {...defaultProps} players={[mockPlayers[0]]} />);
    expect(screen.getByText('1 player nearby')).toBeInTheDocument();
  });

  it('renders all player names', () => {
    render(<PlayersNearby {...defaultProps} />);
    expect(screen.getByText('Warrior Kael')).toBeInTheDocument();
    expect(screen.getByText('Shadow Vex')).toBeInTheDocument();
    expect(screen.getByText('Drift Mara')).toBeInTheDocument();
    expect(screen.getByText('Lone Wolf')).toBeInTheDocument();
  });

  it('renders empty state when no players', () => {
    render(<PlayersNearby {...defaultProps} players={[]} />);
    expect(screen.getByText('No players nearby')).toBeInTheDocument();
  });

  it('renders zero count when no players', () => {
    render(<PlayersNearby {...defaultProps} players={[]} />);
    expect(screen.getByText('0 players nearby')).toBeInTheDocument();
  });

  // ── Faction icons ──

  it('renders faction icons for each player', () => {
    const { container } = render(<PlayersNearby {...defaultProps} />);
    const icons = container.querySelectorAll('.players-nearby__faction-icon');
    expect(icons.length).toBe(4);
  });

  it('renders Forge Wardens icon', () => {
    render(<PlayersNearby {...defaultProps} players={[mockPlayers[0]]} />);
    expect(screen.getByTitle('Forge Wardens')).toBeInTheDocument();
  });

  it('renders Veil Walkers icon', () => {
    render(<PlayersNearby {...defaultProps} players={[mockPlayers[1]]} />);
    expect(screen.getByTitle('Veil Walkers')).toBeInTheDocument();
  });

  it('renders Unaffiliated icon for faction=none', () => {
    render(<PlayersNearby {...defaultProps} players={[mockPlayers[3]]} />);
    expect(screen.getByTitle('Unaffiliated')).toBeInTheDocument();
  });

  // ── Trading state ──

  it('shows Trading badge for players who are trading', () => {
    render(<PlayersNearby {...defaultProps} />);
    expect(screen.getByText('Trading')).toBeInTheDocument();
  });

  it('applies trading modifier class', () => {
    const { container } = render(<PlayersNearby {...defaultProps} />);
    expect(container.querySelector('.players-nearby__player--trading')).toBeInTheDocument();
  });

  // ── Click handlers ──

  it('calls onPlayerClick when player row is clicked', async () => {
    const onPlayerClick = vi.fn();
    const user = userEvent.setup();
    render(<PlayersNearby {...defaultProps} onPlayerClick={onPlayerClick} />);

    await user.click(screen.getByText('Warrior Kael'));
    expect(onPlayerClick).toHaveBeenCalledWith('p1');
  });

  it('calls onTradeRequest when Trade button clicked', async () => {
    const onTradeRequest = vi.fn();
    const user = userEvent.setup();
    render(<PlayersNearby {...defaultProps} onTradeRequest={onTradeRequest} />);

    const tradeBtns = screen.getAllByText('Trade');
    await user.click(tradeBtns[0]);
    expect(onTradeRequest).toHaveBeenCalledWith('p1');
  });

  it('Trade button click does not trigger player click (stopPropagation)', async () => {
    const onPlayerClick = vi.fn();
    const onTradeRequest = vi.fn();
    const user = userEvent.setup();
    render(
      <PlayersNearby
        {...defaultProps}
        onPlayerClick={onPlayerClick}
        onTradeRequest={onTradeRequest}
      />,
    );

    const tradeBtns = screen.getAllByText('Trade');
    await user.click(tradeBtns[0]);
    expect(onTradeRequest).toHaveBeenCalledWith('p1');
    expect(onPlayerClick).not.toHaveBeenCalled();
  });

  // ── Accessibility ──

  it('has role=list on player list', () => {
    const { container } = render(<PlayersNearby {...defaultProps} />);
    expect(container.querySelector('[role="list"]')).toBeInTheDocument();
  });

  it('has role=listitem on each player', () => {
    const { container } = render(<PlayersNearby {...defaultProps} />);
    const items = container.querySelectorAll('[role="listitem"]');
    expect(items.length).toBe(4);
  });

  it('has aria-label with player name and faction', () => {
    render(<PlayersNearby {...defaultProps} players={[mockPlayers[0]]} />);
    expect(screen.getByLabelText('Warrior Kael, Forge Wardens')).toBeInTheDocument();
  });

  it('has Trade button with aria-label per player', () => {
    render(<PlayersNearby {...defaultProps} players={[mockPlayers[0]]} />);
    expect(screen.getByLabelText('Trade with Warrior Kael')).toBeInTheDocument();
  });

  it('player rows are keyboard focusable (tabIndex=0)', () => {
    const { container } = render(<PlayersNearby {...defaultProps} />);
    const players = container.querySelectorAll('.players-nearby__player');
    players.forEach((p) => {
      expect(p.getAttribute('tabindex')).toBe('0');
    });
  });

  // ── BEM class validation ──

  it('has correct BEM root class', () => {
    const { container } = render(<PlayersNearby {...defaultProps} />);
    expect(container.querySelector('.players-nearby')).toBeInTheDocument();
  });

  // ── Dynamic updates ──

  it('updates when players list changes', () => {
    const { rerender } = render(<PlayersNearby {...defaultProps} players={[mockPlayers[0]]} />);
    expect(screen.getByText('1 player nearby')).toBeInTheDocument();

    rerender(<PlayersNearby {...defaultProps} players={mockPlayers} />);
    expect(screen.getByText('4 players nearby')).toBeInTheDocument();
  });
});

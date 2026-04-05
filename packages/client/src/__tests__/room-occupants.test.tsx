/**
 * room-occupants.test.tsx — RoomOccupants component tests (WI-8)
 *
 * Verifies connected/disconnected player rendering including the
 * 💤 / 👤 icons, opacity styling, and "(linkdead)" label.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RoomOccupants } from '../components/RoomOccupants.js';

describe('RoomOccupants', () => {
  it('renders connected player with 👤 icon', () => {
    render(<RoomOccupants creatures={[]} players={[{ id: '1', name: 'Gandalf' }]} />);

    expect(screen.getByText('👤')).toBeInTheDocument();
    expect(screen.getByText('Gandalf')).toBeInTheDocument();
    expect(screen.queryByText('(linkdead)')).not.toBeInTheDocument();
  });

  it('renders disconnected player with 💤 icon and linkdead label', () => {
    render(
      <RoomOccupants
        creatures={[]}
        players={[{ id: '1', name: 'Sleepy', disconnected: true }]}
      />,
    );

    expect(screen.getByText('💤')).toBeInTheDocument();
    expect(screen.getByText('Sleepy')).toBeInTheDocument();
    expect(screen.getByText('(linkdead)')).toBeInTheDocument();
  });

  it('applies opacity-50 to disconnected player button', () => {
    render(
      <RoomOccupants
        creatures={[]}
        players={[{ id: '1', name: 'Ghost', disconnected: true }]}
      />,
    );

    const button = screen.getByText('Ghost').closest('button');
    expect(button?.className).toContain('opacity-50');
  });

  it('does not apply opacity-50 to connected player button', () => {
    render(
      <RoomOccupants
        creatures={[]}
        players={[{ id: '1', name: 'Active' }]}
      />,
    );

    const button = screen.getByText('Active').closest('button');
    expect(button?.className).not.toContain('opacity-50');
  });

  it('renders mix of connected and disconnected players correctly', () => {
    render(
      <RoomOccupants
        creatures={[]}
        players={[
          { id: '1', name: 'Online', disconnected: false },
          { id: '2', name: 'Offline', disconnected: true },
        ]}
      />,
    );

    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(screen.getByText('Offline')).toBeInTheDocument();
    expect(screen.getByText('👤')).toBeInTheDocument();
    expect(screen.getByText('💤')).toBeInTheDocument();
    expect(screen.getByText('(linkdead)')).toBeInTheDocument();
  });

  it('shows empty message when no creatures or players', () => {
    render(<RoomOccupants creatures={[]} players={[]} />);

    expect(screen.getByText('The room is quiet.')).toBeInTheDocument();
  });
});

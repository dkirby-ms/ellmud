/**
 * terminal-exits.test.tsx — Terminal component with exit detection integration.
 *
 * Verifies that the Terminal correctly renders clickable exit links
 * in room and header messages while leaving other message types untouched.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Terminal } from '../components/Terminal.js';
import type { TerminalMessage } from '../store.js';

function makeMsg(
  text: string,
  type: TerminalMessage['type'] = 'room',
  id?: string,
): TerminalMessage {
  return {
    id: id ?? `msg-${Math.random()}`,
    text,
    type,
    timestamp: Date.now(),
  };
}

// TODO: Terminal.tsx moved to _old/ during UX overhaul. Exit detection integration needs retesting within ShardExploration page.
// Rewrite tests for new ShardExploration exit rendering.
describe.skip('Terminal — exit link rendering', () => {
  it('renders exit links in room messages', () => {
    const handler = vi.fn();
    const messages = [
      makeMsg('A passage leads north to the market.', 'room', 'r1'),
    ];

    render(
      <Terminal
        messages={messages}
        availableExits={['north']}
        onExitClick={handler}
      />,
    );

    const link = screen.getByRole('link', { name: 'Go north' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveClass('exit-link');
  });

  it('renders exit links in header messages', () => {
    const handler = vi.fn();
    const messages = [
      makeMsg('Exits: north, south', 'header', 'h1'),
    ];

    render(
      <Terminal
        messages={messages}
        availableExits={['north', 'south']}
        onExitClick={handler}
      />,
    );

    expect(screen.getByRole('link', { name: 'Go north' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go south' })).toBeInTheDocument();
  });

  it('does NOT render exit links in system messages', () => {
    const handler = vi.fn();
    const messages = [
      makeMsg('> go north', 'system', 's1'),
    ];

    render(
      <Terminal
        messages={messages}
        availableExits={['north']}
        onExitClick={handler}
      />,
    );

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('does NOT render exit links in combat messages', () => {
    const handler = vi.fn();
    const messages = [
      makeMsg('The goblin retreats north!', 'combat', 'c1'),
    ];

    render(
      <Terminal
        messages={messages}
        availableExits={['north']}
        onExitClick={handler}
      />,
    );

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('clicking an exit link triggers onExitClick', () => {
    const handler = vi.fn();
    const messages = [
      makeMsg('Exits: east, west', 'header', 'h1'),
    ];

    render(
      <Terminal
        messages={messages}
        availableExits={['east', 'west']}
        onExitClick={handler}
      />,
    );

    fireEvent.click(screen.getByRole('link', { name: 'Go east' }));
    expect(handler).toHaveBeenCalledWith('east');
  });

  it('renders plain text when no exits are available', () => {
    const messages = [makeMsg('An empty room.', 'room', 'r1')];

    const { container } = render(
      <Terminal messages={messages} availableExits={[]} />,
    );

    expect(container.querySelector('.exit-link')).not.toBeInTheDocument();
    expect(screen.getByText('An empty room.')).toBeInTheDocument();
  });

  it('renders plain text when onExitClick is not provided', () => {
    const messages = [
      makeMsg('A passage leads north.', 'room', 'r1'),
    ];

    const { container } = render(
      <Terminal messages={messages} availableExits={['north']} />,
    );

    expect(container.querySelector('.exit-link')).not.toBeInTheDocument();
  });

  it('works with multiple messages and mixed types', () => {
    const handler = vi.fn();
    const messages = [
      makeMsg('── The Crypt ──', 'header', 'h1'),
      makeMsg('Exits: north, down', 'header', 'h2'),
      makeMsg('Damp stone walls surround you. A staircase leads down.', 'room', 'r1'),
      makeMsg('A rat squeaks from the north.', 'sound', 'snd1'),
      makeMsg('> look', 'system', 's1'),
    ];

    render(
      <Terminal
        messages={messages}
        availableExits={['north', 'down']}
        onExitClick={handler}
      />,
    );

    // Header "Exits:" line and room description should have links
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThanOrEqual(3); // north, down in header + down in room

    // Sound and system messages should NOT have links
    expect(screen.getByText(/A rat squeaks/)).toBeInTheDocument();
  });
});

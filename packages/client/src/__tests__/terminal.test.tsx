/**
 * terminal.test.ts — Terminal component display, auto-scroll, history buffer.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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

describe('Terminal', () => {
  it('renders messages', () => {
    const messages = [
      makeMsg('You enter the crypt.', 'room', 'msg-1'),
      makeMsg('A rat squeaks nearby.', 'sound', 'msg-2'),
    ];

    render(<Terminal messages={messages} />);

    expect(screen.getByText('You enter the crypt.')).toBeInTheDocument();
    expect(screen.getByText('A rat squeaks nearby.')).toBeInTheDocument();
  });

  it('applies correct CSS classes for message types', () => {
    const messages = [
      makeMsg('Room desc', 'room', 'r1'),
      makeMsg('Combat hit', 'combat', 'c1'),
      makeMsg('System notice', 'system', 's1'),
      makeMsg('Someone says hello', 'speech', 'sp1'),
      makeMsg('A distant rumble', 'sound', 'snd1'),
      makeMsg('Old footprints', 'trace', 'tr1'),
      makeMsg('── Crypt ──', 'header', 'h1'),
    ];

    const { container } = render(<Terminal messages={messages} />);

    expect(container.querySelector('.msg-room')).toBeInTheDocument();
    expect(container.querySelector('.msg-combat')).toBeInTheDocument();
    expect(container.querySelector('.msg-system')).toBeInTheDocument();
    expect(container.querySelector('.msg-speech')).toBeInTheDocument();
    expect(container.querySelector('.msg-sound')).toBeInTheDocument();
    expect(container.querySelector('.msg-trace')).toBeInTheDocument();
    expect(container.querySelector('.msg-header')).toBeInTheDocument();
  });

  it('renders empty terminal gracefully', () => {
    const { container } = render(<Terminal messages={[]} />);
    expect(container.querySelector('.terminal')).toBeInTheDocument();
  });

  it('has role=log for accessibility', () => {
    const { container } = render(<Terminal messages={[]} />);
    expect(container.querySelector('[role="log"]')).toBeInTheDocument();
  });

  it('calls scrollIntoView on new messages', () => {
    const scrollMock = vi.fn();
    Element.prototype.scrollIntoView = scrollMock;

    const { rerender } = render(<Terminal messages={[makeMsg('first', 'room', 'f1')]} />);

    // Add a new message — should trigger scroll
    rerender(<Terminal messages={[
      makeMsg('first', 'room', 'f1'),
      makeMsg('second', 'room', 'f2'),
    ]} />);

    expect(scrollMock).toHaveBeenCalled();
  });
});

describe('Terminal — message history buffer', () => {
  it('renders up to 500 messages without issue', () => {
    const messages = Array.from({ length: 500 }, (_, i) =>
      makeMsg(`Message ${i}`, 'room', `msg-${i}`),
    );

    const { container } = render(<Terminal messages={messages} />);
    const lines = container.querySelectorAll('.terminal-line');
    expect(lines.length).toBe(500);
  });
});

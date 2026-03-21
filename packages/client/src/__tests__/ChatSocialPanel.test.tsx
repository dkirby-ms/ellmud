import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatSocialPanel } from '../components/ChatSocialPanel.js';

vi.mock('../services/connection.js');

const defaultProps = {
  messages: [
    { id: 'm1', sender: 'Arken', text: 'Anyone heading to the shard?', timestamp: 1700000000000 },
    { id: 'm2', sender: 'Lyra', text: 'I need a healer!', timestamp: 1700000060000 },
    { id: 'sys1', sender: 'system', text: 'Server maintenance in 30 minutes.', timestamp: 1700000120000 },
  ],
  nearbyPlayers: [
    { id: 'p1', name: 'Arken' },
    { id: 'p2', name: 'Lyra' },
    { id: 'p3', name: 'Thorne' },
  ],
  tradeRequests: [] as Array<{ id: string; from: string; status: 'pending' | 'accepted' | 'declined' }>,
  onSendMessage: vi.fn(),
  onAcceptTrade: vi.fn(),
  onDeclineTrade: vi.fn(),
};

function renderPanel(overrides = {}) {
  const props = { ...defaultProps, onSendMessage: vi.fn(), onAcceptTrade: vi.fn(), onDeclineTrade: vi.fn(), ...overrides };
  return {
    onSendMessage: props.onSendMessage,
    onAcceptTrade: props.onAcceptTrade,
    onDeclineTrade: props.onDeclineTrade,
    ...render(<ChatSocialPanel {...props} />),
  };
}

describe('ChatSocialPanel – Message Display', () => {
  it('renders message history', () => {
    renderPanel();
    expect(screen.getByText('Anyone heading to the shard?')).toBeInTheDocument();
    expect(screen.getByText('I need a healer!')).toBeInTheDocument();
  });

  it('displays sender name on messages', () => {
    renderPanel();
    expect(screen.getByText(/Arken/)).toBeInTheDocument();
    expect(screen.getByText(/Lyra/)).toBeInTheDocument();
  });

  it('displays timestamps on messages', () => {
    const { container } = renderPanel();
    const timestamps = container.querySelectorAll('[class*="timestamp"]');
    expect(timestamps.length).toBeGreaterThan(0);
  });

  it('applies system-message class to system messages', () => {
    const { container } = renderPanel();
    expect(container.querySelector('.system-message')).toBeInTheDocument();
  });

  it('applies user-message class to user messages', () => {
    const { container } = renderPanel();
    expect(container.querySelector('.user-message')).toBeInTheDocument();
  });

  it('auto-scrolls to the newest message', () => {
    const { container } = renderPanel();
    const messageList = container.querySelector('[role="log"]');
    expect(messageList).toBeInTheDocument();
  });
});

describe('ChatSocialPanel – Input', () => {
  it('renders a text input with placeholder', () => {
    renderPanel();
    expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
  });

  it('sends message on Enter key', async () => {
    const user = userEvent.setup();
    const { onSendMessage } = renderPanel();

    const input = screen.getByPlaceholderText('Type a message...');
    await user.type(input, 'Hello world{enter}');

    expect(onSendMessage).toHaveBeenCalledWith('Hello world');
  });

  it('inserts newline on Shift+Enter', async () => {
    const user = userEvent.setup();
    renderPanel();

    const input = screen.getByPlaceholderText('Type a message...');
    await user.type(input, 'Line 1');
    await user.keyboard('{Shift>}{Enter}{/Shift}');
    await user.type(input, 'Line 2');

    expect(input).toHaveValue('Line 1\nLine 2');
  });

  it('enforces 200 character limit', async () => {
    const user = userEvent.setup();
    renderPanel();

    const input = screen.getByPlaceholderText('Type a message...');
    const longText = 'a'.repeat(210);
    await user.type(input, longText);

    expect((input as HTMLInputElement | HTMLTextAreaElement).value.length).toBeLessThanOrEqual(200);
  });

  it('does not send empty messages', async () => {
    const user = userEvent.setup();
    const { onSendMessage } = renderPanel();

    const input = screen.getByPlaceholderText('Type a message...');
    await user.click(input);
    await user.keyboard('{Enter}');

    expect(onSendMessage).not.toHaveBeenCalled();
  });

  it('renders a Send button', () => {
    renderPanel();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });

  it('sends message when Send button is clicked', async () => {
    const user = userEvent.setup();
    const { onSendMessage } = renderPanel();

    const input = screen.getByPlaceholderText('Type a message...');
    await user.type(input, 'Button send test');
    await user.click(screen.getByRole('button', { name: /send/i }));

    expect(onSendMessage).toHaveBeenCalledWith('Button send test');
  });

  it('clears input after sending', async () => {
    const user = userEvent.setup();
    renderPanel();

    const input = screen.getByPlaceholderText('Type a message...');
    await user.type(input, 'Clear me{enter}');

    expect(input).toHaveValue('');
  });
});

describe('ChatSocialPanel – Nearby Players', () => {
  it('renders a nearby-players section', () => {
    const { container } = renderPanel();
    expect(container.querySelector('.nearby-players')).toBeInTheDocument();
  });

  it('displays player character names', () => {
    renderPanel();
    expect(screen.getByText('Arken')).toBeInTheDocument();
    expect(screen.getByText('Lyra')).toBeInTheDocument();
    expect(screen.getByText('Thorne')).toBeInTheDocument();
  });

  it('displays the player count', () => {
    renderPanel();
    expect(screen.getByText(/3/)).toBeInTheDocument();
  });

  it('updates when player list changes', () => {
    const { rerender } = render(
      <ChatSocialPanel {...defaultProps} nearbyPlayers={[{ id: 'p1', name: 'Solo' }]} />,
    );
    expect(screen.getByText('Solo')).toBeInTheDocument();

    rerender(
      <ChatSocialPanel
        {...defaultProps}
        nearbyPlayers={[
          { id: 'p1', name: 'Solo' },
          { id: 'p4', name: 'Newcomer' },
        ]}
      />,
    );
    expect(screen.getByText('Newcomer')).toBeInTheDocument();
  });
});

describe('ChatSocialPanel – Trade Requests', () => {
  const tradeProps = {
    tradeRequests: [
      { id: 'tr1', from: 'Arken', status: 'pending' as const },
    ],
  };

  it('renders a trade-request notification', () => {
    const { container } = renderPanel(tradeProps);
    expect(container.querySelector('.trade-request')).toBeInTheDocument();
  });

  it('renders accept and decline buttons', () => {
    renderPanel(tradeProps);
    expect(screen.getByRole('button', { name: /accept/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /decline/i })).toBeInTheDocument();
  });

  it('applies trade-request--pending class for pending trades', () => {
    const { container } = renderPanel(tradeProps);
    expect(container.querySelector('.trade-request--pending')).toBeInTheDocument();
  });

  it('calls onAcceptTrade when accept is clicked', async () => {
    const user = userEvent.setup();
    const { onAcceptTrade } = renderPanel(tradeProps);

    await user.click(screen.getByRole('button', { name: /accept/i }));
    expect(onAcceptTrade).toHaveBeenCalledWith('tr1');
  });

  it('calls onDeclineTrade when decline is clicked', async () => {
    const user = userEvent.setup();
    const { onDeclineTrade } = renderPanel(tradeProps);

    await user.click(screen.getByRole('button', { name: /decline/i }));
    expect(onDeclineTrade).toHaveBeenCalledWith('tr1');
  });

  it('displays the trade sender name', () => {
    renderPanel(tradeProps);
    expect(screen.getByText(/Arken/)).toBeInTheDocument();
  });

  it('shows no trade requests section when array is empty', () => {
    const { container } = renderPanel({ tradeRequests: [] });
    expect(container.querySelector('.trade-request')).not.toBeInTheDocument();
  });
});

describe('ChatSocialPanel – Accessibility', () => {
  it('has chat-panel region role', () => {
    renderPanel();
    expect(screen.getByRole('region')).toBeInTheDocument();
  });

  it('has message list with log role', () => {
    const { container } = renderPanel();
    expect(container.querySelector('[role="log"]')).toBeInTheDocument();
  });

  it('applies chat-panel CSS class', () => {
    const { container } = renderPanel();
    expect(container.querySelector('.chat-panel')).toBeInTheDocument();
  });

  it('input has accessible label', () => {
    renderPanel();
    const input = screen.getByPlaceholderText('Type a message...');
    expect(input).toBeInTheDocument();
  });

  it('renders system message text content', () => {
    renderPanel();
    expect(screen.getByText('Server maintenance in 30 minutes.')).toBeInTheDocument();
  });
});

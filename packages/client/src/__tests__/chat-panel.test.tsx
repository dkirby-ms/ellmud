/**
 * chat-panel.test.tsx — ChatPanel component tests.
 * Covers message rendering, input behavior, keyboard shortcuts, character limits,
 * auto-scroll, channel tabs, message formatting, and buffer limits.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatPanel, type ChatMessageData, type ChatChannel } from '../components/ChatPanel.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

let msgId = 0;
function makeMsg(
  text: string,
  sender = 'Scout',
  channel: ChatChannel = 'proximity',
  type: ChatMessageData['type'] = 'message',
): ChatMessageData {
  return {
    id: `msg-${++msgId}`,
    sender,
    text,
    timestamp: Date.now(),
    channel,
    type,
  };
}

const defaultProps = {
  messages: [] as ChatMessageData[],
  onSend: vi.fn(),
};

// ─── Tests ───────────────────────────────────────────────────────────────────

// TODO: ChatPanel.tsx rewritten with new API ({isOpen, onClose, context} vs old {messages, onSend, activeChannel}).
// Rewrite tests for new ChatPanel API when implementation stabilizes.
describe.skip('ChatPanel', () => {
  beforeEach(() => {
    msgId = 0;
    vi.clearAllMocks();
  });

  // ── Rendering ──

  it('renders with title', () => {
    render(<ChatPanel {...defaultProps} title="Refuge Chat" />);
    expect(screen.getByText('Refuge Chat')).toBeInTheDocument();
  });

  it('renders default title when none provided', () => {
    render(<ChatPanel {...defaultProps} />);
    expect(screen.getByText('Chat')).toBeInTheDocument();
  });

  it('renders message history', () => {
    const messages = [
      makeMsg('Hello world', 'Scout'),
      makeMsg('Welcome back', 'Guard'),
    ];
    render(<ChatPanel {...defaultProps} messages={messages} />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
  });

  it('renders sender names with colon', () => {
    const messages = [makeMsg('Hello', 'Scout')];
    render(<ChatPanel {...defaultProps} messages={messages} />);
    expect(screen.getByText('Scout:')).toBeInTheDocument();
  });

  it('renders timestamps in mono font class', () => {
    const messages = [makeMsg('Hello', 'Scout')];
    const { container } = render(<ChatPanel {...defaultProps} messages={messages} />);
    const timestamp = container.querySelector('.chat-message__timestamp');
    expect(timestamp).toBeInTheDocument();
    expect(timestamp?.textContent).toMatch(/^\d{2}:\d{2}$/);
  });

  it('renders message log with role=log', () => {
    const { container } = render(<ChatPanel {...defaultProps} />);
    expect(container.querySelector('[role="log"]')).toBeInTheDocument();
  });

  it('renders empty messages area gracefully', () => {
    const { container } = render(<ChatPanel {...defaultProps} />);
    expect(container.querySelector('.chat-panel__messages')).toBeInTheDocument();
  });

  // ── Input behavior ──

  it('has textarea with aria-label', () => {
    render(<ChatPanel {...defaultProps} />);
    expect(screen.getByLabelText('Chat message')).toBeInTheDocument();
  });

  it('has Send button', () => {
    render(<ChatPanel {...defaultProps} />);
    expect(screen.getByText('Send')).toBeInTheDocument();
  });

  it('Send button is disabled when input is empty', () => {
    render(<ChatPanel {...defaultProps} />);
    const btn = screen.getByText('Send');
    expect(btn).toBeDisabled();
  });

  it('sends message on Enter key', async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    render(<ChatPanel {...defaultProps} onSend={onSend} />);

    const textarea = screen.getByLabelText('Chat message');
    await user.type(textarea, 'Hello world{enter}');

    expect(onSend).toHaveBeenCalledWith('Hello world', 'proximity');
  });

  it('does NOT send on Shift+Enter (inserts newline)', async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    render(<ChatPanel {...defaultProps} onSend={onSend} />);

    const textarea = screen.getByLabelText('Chat message');
    await user.type(textarea, 'Line one{shift>}{enter}{/shift}Line two');

    expect(onSend).not.toHaveBeenCalled();
  });

  it('sends message on Send button click', async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    render(<ChatPanel {...defaultProps} onSend={onSend} />);

    const textarea = screen.getByLabelText('Chat message');
    await user.type(textarea, 'Hello');
    await user.click(screen.getByText('Send'));

    expect(onSend).toHaveBeenCalledWith('Hello', 'proximity');
  });

  it('clears input after sending', async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    render(<ChatPanel {...defaultProps} onSend={onSend} />);

    const textarea = screen.getByLabelText('Chat message') as HTMLTextAreaElement;
    await user.type(textarea, 'Hello{enter}');

    expect(textarea.value).toBe('');
  });

  it('does not send empty or whitespace-only input', async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    render(<ChatPanel {...defaultProps} onSend={onSend} />);

    const textarea = screen.getByLabelText('Chat message');
    await user.type(textarea, '   {enter}');

    expect(onSend).not.toHaveBeenCalled();
  });

  // ── Character limit ──

  it('shows character counter', () => {
    render(<ChatPanel {...defaultProps} />);
    expect(screen.getByLabelText('Characters remaining')).toBeInTheDocument();
  });

  it('shows 200 as default character limit', () => {
    render(<ChatPanel {...defaultProps} />);
    expect(screen.getByLabelText('Characters remaining').textContent).toBe('200');
  });

  it('enforces character limit — prevents typing beyond max', async () => {
    const user = userEvent.setup();
    render(<ChatPanel {...defaultProps} maxChars={10} />);

    const textarea = screen.getByLabelText('Chat message') as HTMLTextAreaElement;
    await user.type(textarea, 'abcdefghijklmnop'); // 16 chars, but max is 10

    expect(textarea.value.length).toBeLessThanOrEqual(10);
  });

  it('adds warning class when near character limit', async () => {
    const user = userEvent.setup();
    const { container } = render(<ChatPanel {...defaultProps} maxChars={30} />);

    const textarea = screen.getByLabelText('Chat message');
    await user.type(textarea, 'abcde'); // 5 chars, 25 remaining — no warning
    expect(container.querySelector('.chat-panel__char-counter--warning')).not.toBeInTheDocument();

    await user.type(textarea, 'fghijklmnop'); // now 16 chars, 14 remaining — warning (≤20)
    expect(container.querySelector('.chat-panel__char-counter--warning')).toBeInTheDocument();
  });

  // ── Channel tabs ──

  it('does not show channel tabs by default', () => {
    const { container } = render(<ChatPanel {...defaultProps} />);
    expect(container.querySelector('.chat-panel__channels')).not.toBeInTheDocument();
  });

  it('shows channel tabs when showChannelTabs=true', () => {
    render(<ChatPanel {...defaultProps} showChannelTabs />);
    expect(screen.getByText('Proximity')).toBeInTheDocument();
    expect(screen.getByText('Thinking')).toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument();
  });

  it('marks active channel tab', () => {
    const { container } = render(
      <ChatPanel {...defaultProps} showChannelTabs activeChannel="thinking" />,
    );
    const tabs = container.querySelectorAll('.chat-panel__channel-tab');
    const thinkingTab = Array.from(tabs).find((t) => t.textContent?.includes('Thinking'));
    expect(thinkingTab?.classList.contains('chat-panel__channel-tab--active')).toBe(true);
  });

  it('calls onChannelChange when tab clicked', async () => {
    const onChannelChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ChatPanel {...defaultProps} showChannelTabs onChannelChange={onChannelChange} />,
    );

    await user.click(screen.getByText('Thinking'));
    expect(onChannelChange).toHaveBeenCalledWith('thinking');
  });

  it('filters messages by active channel', () => {
    const messages = [
      makeMsg('Hello from proximity', 'Scout', 'proximity'),
      makeMsg('Internal thought', 'You', 'thinking'),
      makeMsg('System update', 'System', 'system'),
    ];
    render(
      <ChatPanel {...defaultProps} messages={messages} activeChannel="proximity" />,
    );

    expect(screen.getByText('Hello from proximity')).toBeInTheDocument();
    expect(screen.queryByText('Internal thought')).not.toBeInTheDocument();
    expect(screen.queryByText('System update')).not.toBeInTheDocument();
  });

  // ── Message formatting ──

  it('highlights @mentions with accent color class', () => {
    const messages = [makeMsg('Hey @warrior come here', 'Scout')];
    const { container } = render(<ChatPanel {...defaultProps} messages={messages} />);
    const mention = container.querySelector('.chat-message__mention');
    expect(mention).toBeInTheDocument();
    expect(mention?.textContent).toBe('@warrior');
  });

  it('renders emote messages in italic', () => {
    const messages = [
      makeMsg('waves hello', 'Scout', 'proximity', 'emote'),
    ];
    const { container } = render(<ChatPanel {...defaultProps} messages={messages} />);
    expect(container.querySelector('.chat-message__text--emote')).toBeInTheDocument();
  });

  it('renders system messages with mono styling class', () => {
    const messages = [
      makeMsg('Player joined the area', 'System', 'proximity', 'system'),
    ];
    const { container } = render(<ChatPanel {...defaultProps} messages={messages} />);
    expect(container.querySelector('.chat-message--system')).toBeInTheDocument();
  });

  it('renders thinking channel with "You think:" sender', () => {
    const messages = [makeMsg('What is this place?', 'Player', 'thinking')];
    render(
      <ChatPanel {...defaultProps} messages={messages} activeChannel="thinking" />,
    );
    expect(screen.getByText('You think:')).toBeInTheDocument();
  });

  // ── Message buffer ──

  it('enforces max message buffer (default 100)', () => {
    const messages = Array.from({ length: 150 }, (_, i) =>
      makeMsg(`Message ${i}`, 'Scout'),
    );
    const { container } = render(<ChatPanel {...defaultProps} messages={messages} />);
    const rendered = container.querySelectorAll('.chat-message');
    expect(rendered.length).toBe(100);
  });

  it('respects custom maxMessages prop', () => {
    const messages = Array.from({ length: 50 }, (_, i) =>
      makeMsg(`Message ${i}`, 'Scout'),
    );
    const { container } = render(
      <ChatPanel {...defaultProps} messages={messages} maxMessages={20} />,
    );
    const rendered = container.querySelectorAll('.chat-message');
    expect(rendered.length).toBe(20);
  });

  // ── Auto-scroll ──

  it('calls scrollIntoView when messages update', () => {
    const scrollMock = vi.fn();
    Element.prototype.scrollIntoView = scrollMock;

    const { rerender } = render(
      <ChatPanel {...defaultProps} messages={[makeMsg('first')]} />,
    );

    rerender(
      <ChatPanel
        {...defaultProps}
        messages={[makeMsg('first'), makeMsg('second')]}
      />,
    );

    expect(scrollMock).toHaveBeenCalled();
  });

  // ── BEM class validation ──

  it('has correct BEM root class', () => {
    const { container } = render(<ChatPanel {...defaultProps} />);
    expect(container.querySelector('.chat-panel')).toBeInTheDocument();
  });

  it('applies channel-specific message class', () => {
    const messages = [makeMsg('Hello', 'Scout', 'proximity')];
    const { container } = render(<ChatPanel {...defaultProps} messages={messages} />);
    expect(container.querySelector('.chat-message--proximity')).toBeInTheDocument();
  });
});

import { useState, useCallback, useRef, useEffect, type KeyboardEvent } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ChatChannel = 'proximity' | 'thinking' | 'system';

export interface ChatMessageData {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  channel: ChatChannel;
  type: 'message' | 'emote' | 'system';
}

export interface ChatPanelProps {
  messages: ChatMessageData[];
  onSend: (text: string, channel: ChatChannel) => void;
  activeChannel?: ChatChannel;
  onChannelChange?: (channel: ChatChannel) => void;
  maxMessages?: number;
  maxChars?: number;
  title?: string;
  showChannelTabs?: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_MESSAGES_DEFAULT = 100;
const MAX_CHARS_DEFAULT = 200;

const CHANNEL_LABELS: Record<ChatChannel, string> = {
  proximity: 'Proximity',
  thinking: 'Thinking',
  system: 'System',
};

const CHANNEL_ICONS: Record<ChatChannel, string> = {
  proximity: '📢',
  thinking: '💭',
  system: '⚙️',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

/** Detect @mentions and wrap in gold spans */
function formatMessageText(text: string): React.JSX.Element {
  const mentionRegex = /@(\w+)/g;
  const parts: React.JSX.Element[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mentionRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={`t-${lastIndex}`}>{text.slice(lastIndex, match.index)}</span>);
    }
    parts.push(
      <span key={`m-${match.index}`} className="chat-message__mention">{match[0]}</span>,
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(<span key={`t-${lastIndex}`}>{text.slice(lastIndex)}</span>);
  }

  return <>{parts}</>;
}

// ─── ChatPanel ───────────────────────────────────────────────────────────────

export function ChatPanel({
  messages,
  onSend,
  activeChannel = 'proximity',
  onChannelChange,
  maxMessages = MAX_MESSAGES_DEFAULT,
  maxChars = MAX_CHARS_DEFAULT,
  title = 'Chat',
  showChannelTabs = false,
}: ChatPanelProps): React.JSX.Element {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Filter messages by active channel and enforce buffer limit
  const filteredMessages = messages
    .filter((msg) => msg.channel === activeChannel)
    .slice(-maxMessages);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [filteredMessages.length]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend(trimmed, activeChannel);
    setInput('');
  }, [input, onSend, activeChannel]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      if (value.length <= maxChars) {
        setInput(value);
      }
    },
    [maxChars],
  );

  const charsRemaining = maxChars - input.length;

  return (
    <div className="chat-panel">
      <h3 className="chat-panel__title">{title}</h3>

      {showChannelTabs && (
        <div className="chat-panel__channels" role="tablist" aria-label="Chat channels">
          {(Object.keys(CHANNEL_LABELS) as ChatChannel[]).map((ch) => (
            <button
              key={ch}
              role="tab"
              aria-selected={activeChannel === ch}
              className={`chat-panel__channel-tab${activeChannel === ch ? ' chat-panel__channel-tab--active' : ''}`}
              onClick={() => onChannelChange?.(ch)}
              type="button"
            >
              <span className="chat-panel__channel-icon">{CHANNEL_ICONS[ch]}</span>
              {CHANNEL_LABELS[ch]}
            </button>
          ))}
        </div>
      )}

      <div
        className="chat-panel__messages"
        role="log"
        aria-live="polite"
        ref={messagesContainerRef}
      >
        {filteredMessages.map((msg) => (
          <div
            key={msg.id}
            className={`chat-message chat-message--${msg.type} chat-message--${msg.channel}`}
          >
            <span className="chat-message__timestamp">
              {formatTimestamp(msg.timestamp)}
            </span>
            <span className="chat-message__sender">
              {msg.channel === 'thinking' ? 'You think:' : `${msg.sender}:`}
            </span>
            <span
              className={`chat-message__text${msg.type === 'emote' ? ' chat-message__text--emote' : ''}`}
            >
              {msg.type === 'system' ? msg.text : formatMessageText(msg.text)}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-panel__input-area">
        <textarea
          className="chat-panel__textarea"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={activeChannel === 'thinking' ? 'Your thoughts...' : 'Say something...'}
          aria-label="Chat message"
          rows={1}
        />
        <div className="chat-panel__input-controls">
          <span
            className={`chat-panel__char-counter${charsRemaining <= 20 ? ' chat-panel__char-counter--warning' : ''}`}
            aria-label="Characters remaining"
          >
            {charsRemaining}
          </span>
          <button
            className="chat-panel__send-btn"
            type="button"
            onClick={handleSend}
            disabled={input.trim().length === 0}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

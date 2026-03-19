import { useRef, useEffect } from 'react';
import type { TerminalMessage } from '../store.js';

export interface TerminalProps {
  messages: TerminalMessage[];
}

const TYPE_STYLES: Record<string, string> = {
  room: 'msg-room',
  combat: 'msg-combat',
  system: 'msg-system',
  speech: 'msg-speech',
  sound: 'msg-sound',
  trace: 'msg-trace',
  header: 'msg-header',
};

export function Terminal({ messages }: TerminalProps): React.JSX.Element {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  return (
    <div className="terminal" role="log" aria-live="polite">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`terminal-line ${TYPE_STYLES[msg.type] ?? ''}`}
        >
          {msg.text}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

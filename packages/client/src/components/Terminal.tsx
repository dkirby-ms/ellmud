import { useRef, useEffect } from 'react';
import type { TerminalMessage } from '../store.js';
import { parseExits, type TextSegment } from '../utils/exit-detection.js';
import { ExitLink } from './ExitLink.js';

export interface TerminalProps {
  messages: TerminalMessage[];
  /** Directions available in the current room (from RoomHeaderMessage) */
  availableExits?: readonly string[];
  /** Called when a player clicks an exit link */
  onExitClick?: (direction: string) => void;
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

/** Message types where exit detection applies (narrative prose). */
const EXIT_DETECTABLE_TYPES = new Set(['room', 'header']);

function renderSegments(
  segments: TextSegment[],
  onExitClick: (direction: string) => void,
): React.ReactNode[] {
  return segments.map((seg, i) => {
    if (seg.kind === 'exit') {
      return (
        <ExitLink
          key={`exit-${i}`}
          direction={seg.direction}
          displayText={seg.original}
          onExitClick={onExitClick}
        />
      );
    }
    return <span key={`text-${i}`}>{seg.value}</span>;
  });
}

export function Terminal({
  messages,
  availableExits = [],
  onExitClick,
}: TerminalProps): React.JSX.Element {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  return (
    <div className="terminal" role="log" aria-live="polite">
      {messages.map((msg) => {
        const shouldParseExits =
          onExitClick &&
          availableExits.length > 0 &&
          EXIT_DETECTABLE_TYPES.has(msg.type);

        return (
          <div
            key={msg.id}
            className={`terminal-line ${TYPE_STYLES[msg.type] ?? ''}`}
          >
            {shouldParseExits
              ? renderSegments(parseExits(msg.text, availableExits), onExitClick)
              : msg.text}
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}

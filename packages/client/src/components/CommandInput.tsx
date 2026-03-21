import { useState, useCallback, useRef, type KeyboardEvent, type FormEvent } from 'react';
import { expandAlias, DEFAULT_ALIASES, type AliasMap } from '../services/aliases.js';

export interface CommandInputProps {
  onCommand: (input: string) => void;
  disabled?: boolean;
  aliases?: AliasMap;
}

const MAX_HISTORY = 50;

export function CommandInput({
  onCommand,
  disabled = false,
  aliases = DEFAULT_ALIASES,
}: CommandInputProps): React.JSX.Element {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback((e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    const expanded = expandAlias(trimmed, aliases);
    onCommand(expanded);

    setHistory((prev) => {
      const next = [trimmed, ...prev.filter((h) => h !== trimmed)];
      return next.slice(0, MAX_HISTORY);
    });
    setInput('');
    setHistoryIndex(-1);
  }, [input, aliases, onCommand]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHistoryIndex((prev) => {
        const next = Math.min(prev + 1, history.length - 1);
        if (next >= 0 && next < history.length) {
          setInput(history[next]);
        }
        return next;
      });
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHistoryIndex((prev) => {
        const next = prev - 1;
        if (next < 0) {
          setInput('');
          return -1;
        }
        setInput(history[next]);
        return next;
      });
    }
  }, [history]);

  return (
    <form onSubmit={handleSubmit} className="command-input">
      <span className="command-prompt">&gt;</span>
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => { setInput(e.target.value); setHistoryIndex(-1); }}
        onKeyDown={handleKeyDown}
        placeholder={disabled ? 'Disconnected...' : 'Enter command...'}
        disabled={disabled}
        autoFocus
        aria-label="Command input"
      />
    </form>
  );
}

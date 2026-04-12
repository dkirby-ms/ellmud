import { useEffect, useRef, useMemo } from 'react';
import { X, BookOpen, ChevronRight } from 'lucide-react';
import AnsiText from './AnsiText.js';
import type { HelpDataMessage, HelpCommandEntry } from '@ellmud/shared';

interface HelpModalProps {
  data: HelpDataMessage | null;
  onClose: () => void;
}

function CommandCard({ entry, focused }: { entry: HelpCommandEntry; focused: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (focused && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [focused]);

  return (
    <div
      ref={ref}
      className={`rounded border px-3 py-2 transition-colors ${
        focused
          ? 'border-accent-gold bg-accent-gold/10'
          : 'border-border-muted/40 bg-bg-elevated/30 hover:border-border-muted'
      }`}
    >
      <div className="flex items-baseline gap-2 mb-1">
        <span className="font-mono text-sm font-bold text-interactive">{entry.name}</span>
        {entry.aliases && entry.aliases.length > 0 && (
          <span className="text-text-disabled text-xs font-mono">
            ({entry.aliases.join(', ')})
          </span>
        )}
      </div>
      <p className="text-text-secondary text-sm mb-1">{entry.description}</p>
      <div className="flex items-center gap-1 text-xs">
        <ChevronRight className="w-3 h-3 text-text-disabled" />
        <code className="font-mono text-accent-gold/80">
          <AnsiText text={entry.usage} />
        </code>
      </div>
    </div>
  );
}

function CategorySection({
  category,
  commands,
  focusCommand,
}: {
  category: string;
  commands: HelpCommandEntry[];
  focusCommand?: string;
}) {
  return (
    <div>
      <h3 className="text-accent-gold font-serif text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
        <span className="h-px flex-1 bg-border-muted/50" />
        <span>{category}</span>
        <span className="h-px flex-1 bg-border-muted/50" />
      </h3>
      <div className="space-y-1.5">
        {commands.map((cmd) => (
          <CommandCard
            key={cmd.name}
            entry={cmd}
            focused={cmd.name === focusCommand}
          />
        ))}
      </div>
    </div>
  );
}

export default function HelpModal({ data, onClose }: HelpModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (data) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [data, onClose]);

  const grouped = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, HelpCommandEntry[]>();
    for (const cmd of data.commands) {
      const existing = map.get(cmd.category);
      if (existing) {
        existing.push(cmd);
      } else {
        map.set(cmd.category, [cmd]);
      }
    }
    return Array.from(map.entries());
  }, [data]);

  if (!data) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <div
        className="bg-bg-primary border-2 border-accent-gold rounded-lg shadow-2xl flex flex-col w-[75vw] max-w-4xl max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border-muted shrink-0">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-accent-gold" />
            <h2 className="text-accent-gold font-serif text-xl">
              {data.focusCommand ? `Help — ${data.focusCommand}` : 'Command Reference'}
            </h2>
            <span className="text-text-disabled text-xs font-mono">
              {data.commands.length} command{data.commands.length !== 1 ? 's' : ''}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-accent-gold transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {grouped.map(([category, commands]) => (
            <CategorySection
              key={category}
              category={category}
              commands={commands}
              focusCommand={data.focusCommand}
            />
          ))}

          {/* Footer hint */}
          <p className="text-text-disabled text-xs text-center font-mono pt-2 pb-1">
            Type <span className="text-interactive">help &lt;command&gt;</span> for details
            &nbsp;·&nbsp; Press <span className="text-text-secondary">Esc</span> to close
          </p>
        </div>
      </div>
    </div>
  );
}

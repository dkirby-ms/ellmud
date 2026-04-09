import { useEffect } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { useWhoList } from '../hooks/useWhoList.js';
import type { PlayerListEntry } from '@ellmud/shared';

interface WhoListModalProps {
  open: boolean;
  onClose: () => void;
}

function FlagBadge({ flag }: { flag: string }) {
  const colors: Record<string, string> = {
    rp: 'text-interactive bg-interactive/15 border-interactive/30',
    anon: 'text-text-disabled bg-bg-elevated border-border-muted',
  };
  return (
    <span
      className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${colors[flag] ?? 'text-text-secondary bg-bg-elevated border-border-muted'}`}
    >
      {flag}
    </span>
  );
}

function PlayerRow({ entry }: { entry: PlayerListEntry }) {
  return (
    <tr className="border-b border-border-muted/30 hover:bg-bg-elevated/40 transition-colors">
      <td className="py-1.5 px-3 font-mono text-sm">
        {entry.anon ? (
          <span className="text-text-disabled italic">???</span>
        ) : (
          <span className="text-text-primary">{entry.name}</span>
        )}
      </td>
      <td className="py-1.5 px-3 font-mono text-sm text-center">
        {entry.anon ? (
          <span className="text-text-disabled">???</span>
        ) : (
          <span className="text-text-secondary">{entry.level ?? '—'}</span>
        )}
      </td>
      <td className="py-1.5 px-3 font-mono text-sm">
        {entry.anon ? (
          <span className="text-text-disabled">???</span>
        ) : (
          <span className="text-text-secondary">{entry.class ?? '—'}</span>
        )}
      </td>
      <td className="py-1.5 px-3 font-mono text-sm">
        {entry.anon ? (
          <span className="text-text-disabled">???</span>
        ) : (
          <span className="text-text-secondary">{entry.zone ?? '—'}</span>
        )}
      </td>
      <td className="py-1.5 px-3">
        <div className="flex gap-1">
          {entry.flags.map((f) => (
            <FlagBadge key={f} flag={f} />
          ))}
        </div>
      </td>
    </tr>
  );
}

export default function WhoListModal({ open, onClose }: WhoListModalProps) {
  const { players, loading, refresh } = useWhoList(open);

  // Close on Escape (same pattern as SettingsModal)
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [open, onClose]);

  if (!open) return null;

  const sorted = [...players].sort((a, b) => {
    const za = (a.zone ?? '').toLowerCase();
    const zb = (b.zone ?? '').toLowerCase();
    if (za !== zb) return za.localeCompare(zb);
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <div
        className="bg-bg-primary border-2 border-accent-gold rounded-lg shadow-2xl flex flex-col w-[70vw] max-w-3xl max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border-muted">
          <div className="flex items-center gap-3">
            <h2 className="text-accent-gold font-serif text-xl">Who&apos;s Online</h2>
            <span className="text-text-disabled text-xs font-mono">
              {loading ? '…' : `${players.length} player${players.length !== 1 ? 's' : ''} online`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              disabled={loading}
              className="text-text-secondary hover:text-accent-gold transition-colors disabled:opacity-40"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="text-text-secondary hover:text-accent-gold transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {sorted.length === 0 && !loading ? (
            <p className="text-text-disabled text-sm text-center py-8 font-mono">
              No players online.
            </p>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border-muted text-text-disabled text-xs uppercase font-mono tracking-wider">
                  <th className="py-2 px-3">Name</th>
                  <th className="py-2 px-3 text-center">Lvl</th>
                  <th className="py-2 px-3">Class</th>
                  <th className="py-2 px-3">Zone</th>
                  <th className="py-2 px-3">Flags</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((entry, i) => (
                  <PlayerRow key={entry.anon ? `anon-${i}` : entry.name} entry={entry} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

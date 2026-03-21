/**
 * ExtractionSuccess — full-page loot recap and run summary after a successful extraction.
 */

import type { LootItem, RunSummary, StashStats } from './extraction-types.js';

export interface ExtractionSuccessProps {
  items: LootItem[];
  summary: RunSummary;
  stash: StashStats;
  onReturn: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function ExtractionSuccess({
  items,
  summary,
  stash,
  onReturn,
}: ExtractionSuccessProps): React.JSX.Element {
  return (
    <div className="extraction-screen extraction-screen--success" aria-live="polite">
      <header className="extraction-screen__header">
        <h1 className="extraction-screen__title extraction-screen__title--success">
          Extraction Successful
        </h1>
        <p className="extraction-screen__subtitle">You escaped the shard.</p>
      </header>

      {/* Loot recap */}
      <section className="extraction-screen__loot" aria-label="Loot recap">
        <h2 className="extraction-screen__section-title">Extracted Items</h2>
        {items.length === 0 ? (
          <p className="extraction-screen__empty">No items extracted.</p>
        ) : (
          <ul className="extraction-screen__loot-list" role="list">
            {items.map((item) => (
              <li key={item.id} className={`loot-item loot-tier--${item.tier}`}>
                <span className="loot-item__name">{item.name}</span>
                {item.quantity > 1 && (
                  <span className="loot-item__quantity">×{item.quantity}</span>
                )}
                <span className="loot-item__tier">{item.tier}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Run summary */}
      <section className="extraction-screen__summary" aria-label="Run summary">
        <h2 className="extraction-screen__section-title">Run Summary</h2>
        <dl className="extraction-screen__stats">
          <div className="extraction-screen__stat">
            <dt>Time in Shard</dt>
            <dd>{formatTime(summary.timeInShard)}</dd>
          </div>
          <div className="extraction-screen__stat">
            <dt>Rooms Explored</dt>
            <dd>{summary.roomsExplored}</dd>
          </div>
          <div className="extraction-screen__stat">
            <dt>Creatures Defeated</dt>
            <dd>{summary.creaturesDefeated}</dd>
          </div>
          <div className="extraction-screen__stat">
            <dt>Damage Taken</dt>
            <dd>{summary.damageTaken}</dd>
          </div>
          <div className="extraction-screen__stat">
            <dt>Reputation Gained</dt>
            <dd>+{summary.reputationGained}</dd>
          </div>
        </dl>
      </section>

      {/* Stash stats */}
      <section className="extraction-screen__stash" aria-label="Stash stats">
        <h2 className="extraction-screen__section-title">Stash</h2>
        <dl className="extraction-screen__stats">
          <div className="extraction-screen__stat">
            <dt>Total Value</dt>
            <dd>{stash.totalValue.toLocaleString()}</dd>
          </div>
          <div className="extraction-screen__stat">
            <dt>Weight</dt>
            <dd>{stash.weightBefore} → {stash.weightAfter}</dd>
          </div>
        </dl>
      </section>

      <button
        className="extraction-screen__return"
        type="button"
        onClick={onReturn}
      >
        Return to Refuge
      </button>
    </div>
  );
}

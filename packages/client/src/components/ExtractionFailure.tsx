/**
 * ExtractionFailure — full-page screen shown on death or shard collapse.
 *
 * Displays items lost, debuffs applied, and a return button.
 */

import type { LootItem, RunSummary } from './extraction-types.js';

export interface ExtractionFailureProps {
  itemsLost: LootItem[];
  debuffs: string[];
  summary: RunSummary;
  onReturn: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function ExtractionFailure({
  itemsLost,
  debuffs,
  summary,
  onReturn,
}: ExtractionFailureProps): React.JSX.Element {
  return (
    <div className="extraction-screen extraction-screen--failure" aria-live="polite">
      <header className="extraction-screen__header">
        <h1 className="extraction-screen__title extraction-screen__title--failure">
          You were lost in the shard.
        </h1>
        <p className="extraction-screen__subtitle">Your gear is gone.</p>
      </header>

      {/* Items lost */}
      {itemsLost.length > 0 && (
        <section className="extraction-screen__lost" aria-label="Items lost">
          <h2 className="extraction-screen__section-title extraction-screen__section-title--danger">
            Items Lost
          </h2>
          <ul className="extraction-screen__lost-list" role="list">
            {itemsLost.map((item) => (
              <li key={item.id} className="lost-item">
                <span className="lost-item__name">{item.name}</span>
                {item.quantity > 1 && (
                  <span className="lost-item__quantity">×{item.quantity}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Debuffs */}
      {debuffs.length > 0 && (
        <section className="extraction-screen__debuffs" aria-label="Debuffs applied">
          <h2 className="extraction-screen__section-title extraction-screen__section-title--warning">
            Debuffs Applied
          </h2>
          <ul className="extraction-screen__debuff-list" role="list">
            {debuffs.map((debuff) => (
              <li key={debuff} className="debuff-item">{debuff}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Run summary (still shown on failure) */}
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

/**
 * ExtractionScreen — unified component switching between extraction phases.
 *
 * Wraps ExtractionOverlay, ExtractionSuccess, and ExtractionFailure into a
 * single phase-driven component for use in the game loop.
 */

import { ExtractionOverlay } from './ExtractionOverlay.js';
import { ExtractionSuccess } from './ExtractionSuccess.js';
import { ExtractionFailure } from './ExtractionFailure.js';
import type { LootItem, RunSummary, StashStats } from './extraction-types.js';

export type { LootItem, RunSummary, StashStats } from './extraction-types.js';

export type ExtractionPhase = 'extracting' | 'success' | 'failure';

export type ExtractionScreenProps =
  | {
      phase: 'extracting';
      ticksRemaining: number;
      totalTicks: number;
      narration: string;
      onCancel?: () => void;
    }
  | {
      phase: 'success';
      items: LootItem[];
      summary: RunSummary;
      stash: StashStats;
      onReturn: () => void;
    }
  | {
      phase: 'failure';
      itemsLost: LootItem[];
      debuffs: string[];
      summary: RunSummary;
      onReturn: () => void;
    };

export function ExtractionScreen(props: ExtractionScreenProps): React.JSX.Element {
  switch (props.phase) {
    case 'extracting':
      return (
        <ExtractionOverlay
          ticksRemaining={props.ticksRemaining}
          totalTicks={props.totalTicks}
          narration={props.narration}
          onCancel={props.onCancel}
        />
      );
    case 'success':
      return (
        <ExtractionSuccess
          items={props.items}
          summary={props.summary}
          stash={props.stash}
          onReturn={props.onReturn}
        />
      );
    case 'failure':
      return (
        <ExtractionFailure
          itemsLost={props.itemsLost}
          debuffs={props.debuffs}
          summary={props.summary}
          onReturn={props.onReturn}
        />
      );
  }
}

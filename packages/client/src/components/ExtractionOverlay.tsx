/**
 * ExtractionOverlay — progress bar scrim shown during the extraction ritual.
 *
 * Renders on top of the game screen while the player channels extraction.
 * Displays progress bar, countdown, and narration text.
 */

export interface ExtractionOverlayProps {
  ticksRemaining: number;
  totalTicks: number;
  narration: string;
  onCancel?: () => void;
}

export function ExtractionOverlay({
  ticksRemaining,
  totalTicks,
  narration,
  onCancel,
}: ExtractionOverlayProps): React.JSX.Element {
  const progress = totalTicks > 0
    ? Math.round(((totalTicks - ticksRemaining) / totalTicks) * 100)
    : 0;
  const completed = ticksRemaining <= 0;

  return (
    <div className={`extraction-overlay${completed ? ' extraction-overlay--complete' : ''}`}>
      <div className="extraction-overlay__content" aria-live="polite">
        <h2 className="extraction-overlay__title">
          {completed ? 'Extraction Complete' : 'Extracting...'}
        </h2>

        <div
          className="extraction-overlay__track"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Extraction progress"
        >
          <div
            className="extraction-overlay__fill"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="extraction-overlay__countdown">
          {completed ? 'Complete' : `${ticksRemaining}s remaining`}
        </div>

        <p className="extraction-overlay__narration">{narration}</p>

        {!completed && onCancel && (
          <button
            className="extraction-overlay__cancel"
            type="button"
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

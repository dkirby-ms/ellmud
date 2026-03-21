/**
 * ClickableExits — standalone component for rendering prose with
 * clickable exit links.
 *
 * Parses narrative text for the six standard directions (north, south,
 * east, west, up, down) and renders them as clickable inline links.
 * Uses word-boundary matching to avoid false positives.
 *
 * This component is the "self-contained" version. The Terminal component
 * also supports exit detection using the room's actual exit list for
 * more precise matching.
 */

import { parseExits } from '../utils/exit-detection.js';
import { ExitLink } from './ExitLink.js';

const ALL_STANDARD_DIRECTIONS = [
  'north', 'south', 'east', 'west', 'up', 'down',
] as const;

export interface ClickableExitsProps {
  /** Narrative text to parse for exit directions */
  text: string;
  /** Called with the canonical direction when a link is clicked */
  onExitClick: (direction: string) => void;
}

export function ClickableExits({
  text,
  onExitClick,
}: ClickableExitsProps): React.JSX.Element {
  const segments = parseExits(text, ALL_STANDARD_DIRECTIONS);

  return (
    <span>
      {segments.map((seg, i) => {
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
      })}
    </span>
  );
}

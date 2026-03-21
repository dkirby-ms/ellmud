/**
 * ExitLink — inline clickable exit rendered within narrative prose.
 *
 * Styled as teal underlined text that blends with the narrative flow.
 * Clicking pre-fills the command input with the direction command.
 * Keyboard-accessible: focusable via Tab, activates on Enter/Space.
 */

import type { KeyboardEvent } from 'react';

export interface ExitLinkProps {
  /** The canonical direction (e.g., "north", "south") */
  direction: string;
  /** The original text as it appeared in the prose (preserves casing) */
  displayText: string;
  /** Called when the exit is clicked or activated via keyboard */
  onExitClick: (direction: string) => void;
}

export function ExitLink({
  direction,
  displayText,
  onExitClick,
}: ExitLinkProps): React.JSX.Element {
  const handleClick = () => {
    onExitClick(direction);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onExitClick(direction);
    }
  };

  return (
    <span
      className="exit-link"
      role="link"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`Go ${direction}`}
      title={`Go ${direction}`}
    >
      {displayText}
    </span>
  );
}

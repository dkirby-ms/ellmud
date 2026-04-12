/**
 * speedwalk-false-positive.test.tsx — Reproduces the #380 race condition
 * where fast individual direction commands accumulate in a controlled React
 * input and trigger false speedwalk detection.
 *
 * Root cause: React 18's controlled input may not commit `setCommand("")`
 * to the DOM before the next keystroke arrives, causing the previous
 * direction character to remain in the input and concatenate with the new one.
 *
 * Example: User types 'n', Enter, 'e', Enter rapidly.
 *   - After first Enter, setCommand("") is queued but DOM still shows "n"
 *   - User types 'e' → DOM becomes "ne" → onChange("ne")
 *   - Next Enter: shouldTreatAsSpeedwalk("ne") → TRUE (false positive)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, useCallback, useRef } from 'react';
import { shouldTreatAsSpeedwalk, parseSpeedwalk } from '../utils/speedwalk.js';

// ---------------------------------------------------------------------------
// Minimal harness mirroring ZoneExploration's command-input + speedwalk logic
// ---------------------------------------------------------------------------
interface SubmitLog {
  raw: string;
  wasSpeedwalk: boolean;
  moveCount: number;
}

function CommandHarness({ onSubmit }: { onSubmit: (log: SubmitLog) => void }) {
  const [command, setCommand] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = command.trim();
      if (!trimmed) return;

      const wasSpeedwalk = shouldTreatAsSpeedwalk(trimmed);
      let moveCount = 0;
      if (wasSpeedwalk) {
        const result = parseSpeedwalk(trimmed);
        moveCount = result.ok ? result.moves.length : 0;
      }

      setCommand('');
      onSubmit({ raw: trimmed, wasSpeedwalk, moveCount });
    },
    [command, onSubmit],
  );

  return (
    <form onSubmit={handleSubmit}>
      <input
        ref={inputRef}
        data-testid="cmd"
        type="text"
        value={command}
        onChange={(e) => setCommand(e.target.value)}
      />
      <button type="submit" data-testid="go">
        Go
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Speedwalk false-positive race condition (#380 — residual)', () => {
  let submissions: SubmitLog[];
  let onSubmit: (log: SubmitLog) => void;

  beforeEach(() => {
    submissions = [];
    onSubmit = (log) => submissions.push(log);
  });

  it('single direction typed and submitted does NOT trigger speedwalk', async () => {
    const user = userEvent.setup();
    render(<CommandHarness onSubmit={onSubmit} />);

    const input = screen.getByTestId('cmd');
    await user.click(input);
    await user.type(input, 'n');
    await user.keyboard('{Enter}');

    expect(submissions).toHaveLength(1);
    expect(submissions[0]).toEqual({
      raw: 'n',
      wasSpeedwalk: false,
      moveCount: 0,
    });
  });

  it('two separate direction submits each send single moves (happy path)', async () => {
    const user = userEvent.setup();
    render(<CommandHarness onSubmit={onSubmit} />);

    const input = screen.getByTestId('cmd');
    await user.click(input);

    // First move
    await user.type(input, 'n');
    await user.keyboard('{Enter}');

    // Second move
    await user.type(input, 'e');
    await user.keyboard('{Enter}');

    expect(submissions).toHaveLength(2);
    expect(submissions[0].raw).toBe('n');
    expect(submissions[0].wasSpeedwalk).toBe(false);
    expect(submissions[1].raw).toBe('e');
    expect(submissions[1].wasSpeedwalk).toBe(false);
  });

  /**
   * REPRODUCTION: Simulates the race condition by injecting the accumulated
   * value that would result if React's setCommand("") hadn't committed before
   * the next keystroke. In a real browser this happens when:
   *   1. User submits "n" → setCommand("") queued
   *   2. Before React commits, user types "e" → DOM = "ne" → onChange("ne")
   *   3. setCommand("ne") overrides setCommand("")
   *   4. Next Enter → shouldTreatAsSpeedwalk("ne") → true (BUG)
   *
   * In jsdom/testing-library, React commits synchronously so we simulate by
   * directly setting the input's value to the accumulated string.
   */
  it('accumulated direction chars from race condition trigger false positive', async () => {
    const user = userEvent.setup();
    render(<CommandHarness onSubmit={onSubmit} />);

    const input = screen.getByTestId('cmd') as HTMLInputElement;
    await user.click(input);

    // Simulate the accumulated input that results from the race condition:
    // the input contains "ne" (previous 'n' wasn't cleared + new 'e')
    await user.clear(input);
    await user.type(input, 'ne');
    await user.keyboard('{Enter}');

    // This demonstrates the false positive: "ne" is treated as a speedwalk
    // even though the user intended two separate single-direction commands.
    expect(submissions).toHaveLength(1);
    expect(submissions[0].raw).toBe('ne');
    expect(submissions[0].wasSpeedwalk).toBe(true);
    expect(submissions[0].moveCount).toBe(2);
  });

  it('key-repeat scenario: held direction key produces repeated chars', async () => {
    const user = userEvent.setup();
    render(<CommandHarness onSubmit={onSubmit} />);

    const input = screen.getByTestId('cmd') as HTMLInputElement;
    await user.click(input);

    // Simulate key repeat: user holds 'n' slightly too long → "nn"
    await user.type(input, 'nn');
    await user.keyboard('{Enter}');

    expect(submissions).toHaveLength(1);
    expect(submissions[0].raw).toBe('nn');
    expect(submissions[0].wasSpeedwalk).toBe(true);
    expect(submissions[0].moveCount).toBe(2);
  });

  it('all single-direction rapid submits are safe (no accumulation in test env)', async () => {
    const user = userEvent.setup();
    render(<CommandHarness onSubmit={onSubmit} />);

    const input = screen.getByTestId('cmd');
    await user.click(input);

    // Type and submit each direction as fast as possible
    for (const dir of ['n', 's', 'e', 'w', 'u', 'd']) {
      await user.type(input, dir);
      await user.keyboard('{Enter}');
    }

    expect(submissions).toHaveLength(6);
    for (const sub of submissions) {
      expect(sub.wasSpeedwalk).toBe(false);
    }
  });
});

describe('shouldTreatAsSpeedwalk — false positive surface (#380 deeper)', () => {
  it.each([
    ['nn', 2, 'key repeat: north×2'],
    ['ne', 2, 'race: north + east accumulated'],
    ['ns', 2, 'race: north + south accumulated'],
    ['ew', 2, 'race: east + west accumulated'],
    ['ss', 2, 'key repeat: south×2'],
    ['nne', 3, 'race: triple accumulation'],
    ['eee', 3, 'key repeat: east×3'],
  ])(
    'treats "%s" as speedwalk (%d moves) — %s',
    (input, expectedMoves, _label) => {
      expect(shouldTreatAsSpeedwalk(input)).toBe(true);
      const result = parseSpeedwalk(input);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.moves.length).toBe(expectedMoves);
    },
  );

  it('these are the exact strings that would appear from the race condition', () => {
    // Scenario: user submits 'n' then 'e' rapidly.
    // If setCommand("") fails to clear before 'e' keystroke:
    // input = "n" + "e" = "ne"
    const accumulated = 'n' + 'e';
    expect(shouldTreatAsSpeedwalk(accumulated)).toBe(true);

    // But each individual direction is NOT a speedwalk:
    expect(shouldTreatAsSpeedwalk('n')).toBe(false);
    expect(shouldTreatAsSpeedwalk('e')).toBe(false);
  });
});

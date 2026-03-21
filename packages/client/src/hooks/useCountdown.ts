import { useState, useEffect, useRef } from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Counts down from `seconds` to 0, decrementing every second.
 * Returns the current remaining seconds.
 */
export function useCountdown(seconds: number): number {
  const [remaining, setRemaining] = useState(seconds);
  const prevSeconds = useRef(seconds);

  // Reset when the input value changes
  useEffect(() => {
    if (seconds !== prevSeconds.current) {
      prevSeconds.current = seconds;
      setRemaining(seconds);
    }
  }, [seconds]);

  useEffect(() => {
    if (remaining <= 0) return;

    const id = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0) clearInterval(id);
        return Math.max(0, next);
      });
    }, 1000);

    return () => clearInterval(id);
  }, [remaining]);
  }, [remaining <= 0]); // only re-subscribe when crossing the zero boundary

  return remaining;
}

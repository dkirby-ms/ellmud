import { useRef, useEffect } from "react";

/**
 * Auto-scrolls a container to the bottom when new content arrives.
 * Disengages when the user scrolls up; re-engages when they scroll
 * back within `threshold` pixels of the bottom.
 *
 * The check is performed synchronously against the current scroll
 * position so it is immune to event-timing races between scroll
 * handlers and React renders.
 */
export function useAutoScroll<T>(
  dependency: T,
  threshold = 48,
) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const distanceFromBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom > threshold) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [dependency, threshold]);

  return containerRef;
}

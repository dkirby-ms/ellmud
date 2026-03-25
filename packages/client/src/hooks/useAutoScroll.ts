import { useRef, useEffect, useCallback } from "react";

/**
 * Auto-scrolls a container to the bottom when new content arrives.
 * Disengages when the user scrolls up; re-engages when they scroll
 * back within `threshold` pixels of the bottom.
 */
export function useAutoScroll<T>(
  dependency: T,
  threshold = 48,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const distanceFromBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldAutoScroll.current = distanceFromBottom <= threshold;
  }, [threshold]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !shouldAutoScroll.current) return;
    el.scrollTop = el.scrollHeight;
  }, [dependency]);

  return containerRef;
}

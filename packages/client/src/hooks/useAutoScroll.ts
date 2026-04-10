import { useRef, useEffect } from "react";

/**
 * Keeps a scrollable container pinned to the bottom while new content
 * arrives — the core "chat scroll" behaviour for the MUD terminal.
 *
 * ## How it works
 *
 * 1. A boolean ref (`stickyRef`) tracks whether the view SHOULD be
 *    at the bottom.  It starts `true` and remains so until the user
 *    deliberately scrolls away.
 *
 * 2. A passive `scroll` event listener on the container continuously
 *    updates `stickyRef` based on whether the viewport is within
 *    `threshold` pixels of the bottom.  Events caused by our own
 *    programmatic scrolling are suppressed so only genuine user
 *    interaction can toggle stickiness off.
 *
 * 3. When `dependency` changes (new messages), a `useEffect` fires.
 *    If sticky, it coalesces rapid updates into a single
 *    `requestAnimationFrame` callback that scrolls the container to
 *    the absolute bottom via `scrollTop` assignment.
 *
 * ## Why previous versions broke
 *
 * **v1** derived stickiness from scroll geometry AT RENDER TIME.
 * After new content, `scrollHeight` grows but `scrollTop` stays put,
 * so `distanceFromBottom > threshold` bailed even though the user
 * never scrolled.
 *
 * **v2** (sentinel + scrollIntoView) fixed v1 but still failed under
 * rapid content bursts (speedwalks, rapid room changes).  Multiple
 * `requestAnimationFrame` callbacks queued without cancelling stale
 * ones, and the scroll-event listener could read intermediate geometry
 * between DOM commit and rAF execution — flipping `stickyRef` false
 * and causing subsequent effects to bail.  `scrollIntoView` also
 * scrolls ancestor containers, adding unpredictability.
 *
 * **v3** (current) fixes the burst race with three changes:
 * - Coalesce: cancel the pending rAF before scheduling a new one.
 * - Guard: suppress the scroll-event listener during programmatic
 *   scrolls so intermediate geometry cannot flip stickyRef.
 * - Direct: use `el.scrollTop = el.scrollHeight` instead of
 *   `scrollIntoView` — deterministic, no ancestor side-effects.
 *
 * Usage:
 *   const { containerRef, bottomRef } = useAutoScroll(state.messages);
 *   <div ref={containerRef} className="overflow-y-auto ...">
 *     {messages}
 *     <div ref={bottomRef} aria-hidden="true" />
 *   </div>
 */
export function useAutoScroll<T>(
  dependency: T,
  threshold = 80,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef(true);
  const rafIdRef = useRef(0);
  const programmaticScrollRef = useRef(false);

  // ── Scroll-event tracker ───────────────────────────────────────────
  // Continuously updates stickyRef based on user scroll position.
  // Events triggered by our own programmatic scroll are suppressed.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onScroll = () => {
      if (programmaticScrollRef.current) return;
      const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
      stickyRef.current = gap <= threshold;
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [threshold]);

  // ── Content-change auto-scroll ─────────────────────────────────────
  // When content changes, scroll to the bottom if we're still sticky.
  // Rapid dependency changes are coalesced: only the last-scheduled
  // rAF survives, so we never queue up stale scroll operations.
  useEffect(() => {
    if (!stickyRef.current) return;
    const el = containerRef.current;
    if (!el) return;

    // Cancel the previously scheduled scroll — only the latest wins.
    cancelAnimationFrame(rafIdRef.current);

    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = 0;
      // Re-check: user might have scrolled away between effect and rAF.
      if (!stickyRef.current) return;

      // Suppress the scroll-event listener while we programmatically
      // scroll.  Without this, the listener can read an intermediate
      // gap (scrollHeight grown, scrollTop not yet caught up) and
      // flip stickyRef false — the exact race that causes #382.
      programmaticScrollRef.current = true;
      el.scrollTop = el.scrollHeight;
      // We just scrolled to the absolute bottom — assert stickiness
      // so the next effect doesn't bail on a stale stickyRef value.
      stickyRef.current = true;

      // Re-enable scroll tracking on the next frame, after the
      // browser has processed the scroll event from our assignment.
      requestAnimationFrame(() => {
        programmaticScrollRef.current = false;
      });
    });
  }, [dependency]);

  // Clean up pending rAFs on unmount.
  useEffect(() => {
    return () => cancelAnimationFrame(rafIdRef.current);
  }, []);

  return { containerRef, bottomRef };
}

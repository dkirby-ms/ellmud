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
 *    `threshold` pixels of the bottom.
 *
 * 3. When `dependency` changes (new messages), a `useEffect` fires.
 *    If sticky, it scrolls a sentinel `<div>` at the bottom of the
 *    content into view using `requestAnimationFrame` to ensure the
 *    DOM has fully laid out.
 *
 * ## Why previous versions broke
 *
 * The old hook derived stickiness from scroll geometry AT RENDER TIME.
 * After new content is added, `scrollHeight` grows but `scrollTop`
 * stays put, so `distanceFromBottom > threshold` evaluated true and
 * the hook bailed — even though the user never scrolled.  Tracking
 * sticky state via scroll events (not at render time) fixes this.
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

  // Track whether the user is near the bottom via scroll events.
  // This runs continuously between renders, so stickiness is always
  // up-to-date regardless of when React fires effects.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onScroll = () => {
      const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
      stickyRef.current = gap <= threshold;
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [threshold]);

  // When content changes, scroll the sentinel into view if sticky.
  // rAF ensures the browser has finished layout after React's commit.
  useEffect(() => {
    if (!stickyRef.current) return;
    const sentinel = bottomRef.current;
    if (!sentinel) return;

    requestAnimationFrame(() => {
      sentinel.scrollIntoView({ block: "end", behavior: "instant" });
    });
  }, [dependency]);

  return { containerRef, bottomRef };
}

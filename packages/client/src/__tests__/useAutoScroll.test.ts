import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAutoScroll } from "../hooks/useAutoScroll";

function mockContainer(overrides: Partial<HTMLDivElement> = {}) {
  const listeners: Record<string, EventListener[]> = {};
  return {
    scrollHeight: 1000,
    scrollTop: 920,
    clientHeight: 400,
    scrollIntoView: vi.fn(),
    addEventListener: vi.fn((event: string, handler: EventListener) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
    }),
    removeEventListener: vi.fn((event: string, handler: EventListener) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter((h) => h !== handler);
      }
    }),
    _fireScroll: () => {
      (listeners["scroll"] ?? []).forEach((h) => h(new Event("scroll")));
    },
    ...overrides,
  } as unknown as HTMLDivElement & { _fireScroll: () => void };
}

function mockSentinel() {
  return {
    scrollIntoView: vi.fn(),
  } as unknown as HTMLDivElement;
}

describe("useAutoScroll", () => {
  let rafCallbacks: Array<{ id: number; cb: () => void }>;
  let cancelledIds: Set<number>;
  let nextRafId: number;

  beforeEach(() => {
    vi.restoreAllMocks();
    rafCallbacks = [];
    cancelledIds = new Set();
    nextRafId = 1;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      const id = nextRafId++;
      rafCallbacks.push({ id, cb: cb as () => void });
      return id;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
      cancelledIds.add(id);
    });
  });

  /** Flush all queued rAF callbacks (including nested ones). */
  function flushRaf() {
    while (rafCallbacks.length > 0) {
      const batch = rafCallbacks.splice(0);
      batch.forEach(({ id, cb }) => {
        if (!cancelledIds.has(id)) cb();
      });
    }
  }

  /**
   * Helper: set up the hook with refs properly wired and the scroll
   * listener attached.  Works around the renderHook limitation where
   * refs are null on the initial render — we force the scroll-event
   * effect to re-run by changing the threshold parameter.
   */
  function setupWithRefs(
    initialDep: number,
    containerOverrides: Partial<HTMLDivElement> = {},
  ) {
    const el = mockContainer(containerOverrides);
    const sentinel = mockSentinel();

    // Render with threshold-1 so we can bump it to attach the listener
    const hookReturn = renderHook(
      ({ dep, threshold }: { dep: number; threshold: number }) =>
        useAutoScroll(dep, threshold),
      { initialProps: { dep: initialDep, threshold: 79 } },
    );

    // Wire up refs (simulates React setting refs after commit)
    Object.defineProperty(hookReturn.result.current.containerRef, "current", {
      value: el,
      writable: true,
    });
    Object.defineProperty(hookReturn.result.current.bottomRef, "current", {
      value: sentinel,
      writable: true,
    });

    // Bump threshold to force the scroll-event effect to re-run,
    // now that containerRef.current is available → listener attached.
    hookReturn.rerender({ dep: initialDep, threshold: 80 });
    flushRaf(); // Clear any rAFs from setup

    return {
      el,
      sentinel,
      result: hookReturn.result,
      rerender: (dep: number) =>
        hookReturn.rerender({ dep, threshold: 80 }),
      unmount: hookReturn.unmount,
    };
  }

  it("returns containerRef and bottomRef", () => {
    const { result } = renderHook(() => useAutoScroll("dep"));
    expect(result.current).toHaveProperty("containerRef");
    expect(result.current).toHaveProperty("bottomRef");
  });

  it("scrolls to bottom when dependency changes (sticky by default)", () => {
    const { el, rerender } = setupWithRefs(1);

    rerender(2);
    flushRaf();

    // Should set scrollTop to scrollHeight (direct assignment, not scrollIntoView)
    expect(el.scrollTop).toBe(el.scrollHeight);
  });

  it("does not scroll when user has scrolled up (unsticky)", () => {
    const { el, rerender } = setupWithRefs(0, { scrollTop: 0 });

    // Fire scroll event — listener is attached, gap is huge → stickyRef = false
    act(() => {
      (el as unknown as { _fireScroll: () => void })._fireScroll();
    });

    rerender(1);
    flushRaf();

    // scrollTop should stay at 0 — user scrolled away, not sticky
    expect(el.scrollTop).toBe(0);
  });

  it("re-engages when user scrolls back near bottom", () => {
    const { el, rerender } = setupWithRefs(0, { scrollTop: 0 });

    // Scroll far away → unsticky
    act(() => {
      (el as unknown as { _fireScroll: () => void })._fireScroll();
    });
    rerender(1);
    flushRaf();
    expect(el.scrollTop).toBe(0); // didn't scroll

    // Scroll back near bottom → re-sticky
    Object.assign(el, { scrollTop: 920 });
    act(() => {
      (el as unknown as { _fireScroll: () => void })._fireScroll();
    });
    rerender(2);
    flushRaf();

    expect(el.scrollTop).toBe(el.scrollHeight);
  });

  it("cleans up without crashing when ref is null", () => {
    const { unmount } = renderHook(() => useAutoScroll("dep"));
    expect(() => unmount()).not.toThrow();
  });

  // ── Race condition tests (#382) ────────────────────────────────────

  it("coalesces rapid dependency changes into a single scroll", () => {
    const { el, rerender } = setupWithRefs(0);

    // Rapid dependency changes (simulating speedwalk message bursts)
    rerender(1);
    rerender(2);
    rerender(3);
    rerender(4);
    rerender(5);

    // Only the last rAF should survive — earlier ones were cancelled
    flushRaf();
    expect(el.scrollTop).toBe(el.scrollHeight);
    // cancelAnimationFrame should have been called for stale rAFs
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });

  it("suppresses scroll events during programmatic scroll", () => {
    const { el, rerender } = setupWithRefs(0);

    rerender(1);

    // Flush only the first rAF batch (the programmatic scroll)
    const firstBatch = rafCallbacks.splice(0);
    firstBatch.forEach(({ id, cb }) => {
      if (!cancelledIds.has(id)) cb();
    });

    // At this point, programmaticScrollRef is true.
    // Simulate content being added that grows scrollHeight.
    Object.assign(el, { scrollHeight: 2000, scrollTop: 1000 });

    // Fire a scroll event — should be suppressed during programmatic scroll
    act(() => {
      (el as unknown as { _fireScroll: () => void })._fireScroll();
    });

    // Flush the nested rAF that re-enables scroll tracking
    flushRaf();

    // Trigger another dependency change — should still be sticky
    rerender(2);
    flushRaf();

    expect(el.scrollTop).toBe(el.scrollHeight);
  });

  it("remains sticky through rapid room transitions (#382 regression)", () => {
    const { el, rerender } = setupWithRefs(0, {
      scrollHeight: 500,
      scrollTop: 100,
      clientHeight: 400,
    });

    // Simulate 5 rapid room transitions.
    // Each "room" adds content, growing scrollHeight, while scrollTop
    // hasn't caught up yet — the exact scenario from #382.
    for (let room = 1; room <= 5; room++) {
      Object.assign(el, { scrollHeight: 500 + room * 300 });

      rerender(room);
      flushRaf();

      // After programmatic scroll, scrollTop should be at scrollHeight
      expect(el.scrollTop).toBe(el.scrollHeight);
    }
  });
});

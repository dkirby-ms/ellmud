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
  let rafCallback: (() => void) | null;

  beforeEach(() => {
    vi.restoreAllMocks();
    rafCallback = null;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallback = cb as () => void;
      return 0;
    });
  });

  it("returns containerRef and bottomRef", () => {
    const { result } = renderHook(() => useAutoScroll("dep"));
    expect(result.current).toHaveProperty("containerRef");
    expect(result.current).toHaveProperty("bottomRef");
  });

  it("scrolls sentinel into view when dependency changes (sticky by default)", () => {
    const el = mockContainer();
    const sentinel = mockSentinel();
    const { result, rerender } = renderHook(
      ({ dep }) => useAutoScroll(dep),
      { initialProps: { dep: 1 } },
    );

    // Wire up refs
    Object.defineProperty(result.current.containerRef, "current", {
      value: el,
      writable: true,
    });
    Object.defineProperty(result.current.bottomRef, "current", {
      value: sentinel,
      writable: true,
    });

    rerender({ dep: 2 });
    // Flush rAF
    expect(rafCallback).toBeTruthy();
    rafCallback!();

    expect(sentinel.scrollIntoView).toHaveBeenCalledWith({
      block: "end",
      behavior: "instant",
    });
  });

  it("does not scroll when user has scrolled up (unsticky)", () => {
    const el = mockContainer({ scrollTop: 0 });
    const sentinel = mockSentinel();
    const { result, rerender } = renderHook(
      ({ dep }) => useAutoScroll(dep),
      { initialProps: { dep: 0 } },
    );

    Object.defineProperty(result.current.containerRef, "current", {
      value: el,
      writable: true,
    });
    Object.defineProperty(result.current.bottomRef, "current", {
      value: sentinel,
      writable: true,
    });

    // Simulate user scrolling far from bottom
    act(() => {
      (el as unknown as { _fireScroll: () => void })._fireScroll();
    });

    rerender({ dep: 1 });
    // rAF should not be scheduled (sticky is false)
    expect(sentinel.scrollIntoView).not.toHaveBeenCalled();
  });

  it("re-engages when user scrolls back near bottom", () => {
    const el = mockContainer({ scrollTop: 0 });
    const sentinel = mockSentinel();
    const { result, rerender } = renderHook(
      ({ dep }) => useAutoScroll(dep),
      { initialProps: { dep: 0 } },
    );

    Object.defineProperty(result.current.containerRef, "current", {
      value: el,
      writable: true,
    });
    Object.defineProperty(result.current.bottomRef, "current", {
      value: sentinel,
      writable: true,
    });

    // Scroll far away → unsticky
    act(() => {
      (el as unknown as { _fireScroll: () => void })._fireScroll();
    });
    rerender({ dep: 1 });
    expect(sentinel.scrollIntoView).not.toHaveBeenCalled();

    // Scroll back near bottom → re-sticky
    Object.assign(el, { scrollTop: 920 });
    act(() => {
      (el as unknown as { _fireScroll: () => void })._fireScroll();
    });
    rerender({ dep: 2 });
    expect(rafCallback).toBeTruthy();
    rafCallback!();

    expect(sentinel.scrollIntoView).toHaveBeenCalledWith({
      block: "end",
      behavior: "instant",
    });
  });

  it("cleans up without crashing when ref is null", () => {
    const { unmount } = renderHook(() => useAutoScroll("dep"));
    expect(() => unmount()).not.toThrow();
  });
});

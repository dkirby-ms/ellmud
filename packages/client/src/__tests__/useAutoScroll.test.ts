import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAutoScroll } from "../hooks/useAutoScroll";

function mockContainer(overrides: Partial<HTMLDivElement> = {}) {
  return {
    scrollHeight: 1000,
    scrollTop: 0,
    clientHeight: 400,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    ...overrides,
  } as unknown as HTMLDivElement;
}

describe("useAutoScroll", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a ref object", () => {
    const { result } = renderHook(() => useAutoScroll("dep"));
    expect(result.current).toHaveProperty("current");
  });

  it("scrolls to bottom when dependency changes and auto-scroll is engaged", () => {
    const el = mockContainer();
    const { result, rerender } = renderHook(
      ({ dep }) => useAutoScroll(dep),
      { initialProps: { dep: 1 } },
    );

    Object.defineProperty(result.current, "current", {
      value: el,
      writable: true,
    });

    rerender({ dep: 2 });
    expect(el.scrollTop).toBe(el.scrollHeight);
  });

  it("auto-scroll defaults to engaged (scrolls on each new dependency)", () => {
    const el = mockContainer({ scrollTop: 0 });
    const { result, rerender } = renderHook(
      ({ dep }) => useAutoScroll(dep),
      { initialProps: { dep: 0 } },
    );

    Object.defineProperty(result.current, "current", {
      value: el,
      writable: true,
    });

    rerender({ dep: 1 });
    expect(el.scrollTop).toBe(1000);

    Object.assign(el, { scrollHeight: 1500 });
    rerender({ dep: 2 });
    expect(el.scrollTop).toBe(1500);
  });

  it("cleans up without crashing when ref is null", () => {
    const { unmount } = renderHook(() => useAutoScroll("dep"));
    expect(() => unmount()).not.toThrow();
  });
});

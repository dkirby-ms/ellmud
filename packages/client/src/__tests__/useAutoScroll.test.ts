import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAutoScroll } from "../hooks/useAutoScroll";

function mockContainer(overrides: Partial<HTMLDivElement> = {}) {
  return {
    scrollHeight: 1000,
    scrollTop: 952,
    clientHeight: 400,
    scrollTo: vi.fn(),
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

  it("scrolls to bottom when dependency changes and near bottom", () => {
    const el = mockContainer({ scrollTop: 952 });
    const { result, rerender } = renderHook(
      ({ dep }) => useAutoScroll(dep),
      { initialProps: { dep: 1 } },
    );

    Object.defineProperty(result.current, "current", {
      value: el,
      writable: true,
    });

    rerender({ dep: 2 });
    expect(el.scrollTo).toHaveBeenCalledWith({
      top: el.scrollHeight,
      behavior: "smooth",
    });
  });

  it("does not scroll when user has scrolled up beyond threshold", () => {
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
    expect(el.scrollTo).not.toHaveBeenCalled();
  });

  it("re-engages auto-scroll when user scrolls back near bottom", () => {
    const el = mockContainer({ scrollTop: 0 });
    const { result, rerender } = renderHook(
      ({ dep }) => useAutoScroll(dep),
      { initialProps: { dep: 0 } },
    );

    Object.defineProperty(result.current, "current", {
      value: el,
      writable: true,
    });

    // User scrolled up — should not scroll
    rerender({ dep: 1 });
    expect(el.scrollTo).not.toHaveBeenCalled();

    // User scrolls back to bottom
    Object.assign(el, { scrollTop: 960 });
    rerender({ dep: 2 });
    expect(el.scrollTo).toHaveBeenCalledWith({
      top: 1000,
      behavior: "smooth",
    });
  });

  it("cleans up without crashing when ref is null", () => {
    const { unmount } = renderHook(() => useAutoScroll("dep"));
    expect(() => unmount()).not.toThrow();
  });
});

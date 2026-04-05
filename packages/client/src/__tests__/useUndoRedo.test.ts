import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useUndoRedo } from "../hooks/useUndoRedo";

describe("useUndoRedo", () => {
  let onZoneChanged: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onZoneChanged = vi.fn();
  });

  it("starts with empty stacks", () => {
    const { result } = renderHook(() => useUndoRedo(onZoneChanged, false));
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.undoLabel).toBeNull();
    expect(result.current.redoLabel).toBeNull();
    expect(result.current.undoRedoBusy).toBe(false);
  });

  it("pushOperation enables undo", () => {
    const { result } = renderHook(() => useUndoRedo(onZoneChanged, false));

    act(() => {
      result.current.pushOperation({
        type: "createRoom",
        label: "Create room 'tavern'",
        undo: vi.fn(async () => {}),
        redo: vi.fn(async () => {}),
      });
    });

    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.undoLabel).toBe("Create room 'tavern'");
  });

  it("undo calls the undo fn and moves op to redo stack", async () => {
    const undoFn = vi.fn(async () => {});
    const redoFn = vi.fn(async () => {});

    const { result } = renderHook(() => useUndoRedo(onZoneChanged, false));

    act(() => {
      result.current.pushOperation({
        type: "createRoom",
        label: "Create room 'tavern'",
        undo: undoFn,
        redo: redoFn,
      });
    });

    await act(async () => {
      await result.current.handleUndo();
    });

    expect(undoFn).toHaveBeenCalledOnce();
    expect(onZoneChanged).toHaveBeenCalledOnce();
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
    expect(result.current.redoLabel).toBe("Create room 'tavern'");
  });

  it("redo calls the redo fn and moves op back to undo stack", async () => {
    const undoFn = vi.fn(async () => {});
    const redoFn = vi.fn(async () => {});

    const { result } = renderHook(() => useUndoRedo(onZoneChanged, false));

    act(() => {
      result.current.pushOperation({
        type: "createRoom",
        label: "Create room 'tavern'",
        undo: undoFn,
        redo: redoFn,
      });
    });

    await act(async () => {
      await result.current.handleUndo();
    });

    await act(async () => {
      await result.current.handleRedo();
    });

    expect(redoFn).toHaveBeenCalledOnce();
    expect(onZoneChanged).toHaveBeenCalledTimes(2);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it("new operation clears redo stack", async () => {
    const { result } = renderHook(() => useUndoRedo(onZoneChanged, false));

    act(() => {
      result.current.pushOperation({
        type: "createRoom",
        label: "Create room A",
        undo: vi.fn(async () => {}),
        redo: vi.fn(async () => {}),
      });
    });

    await act(async () => {
      await result.current.handleUndo();
    });

    expect(result.current.canRedo).toBe(true);

    act(() => {
      result.current.pushOperation({
        type: "createExit",
        label: "Create exit B",
        undo: vi.fn(async () => {}),
        redo: vi.fn(async () => {}),
      });
    });

    expect(result.current.canRedo).toBe(false);
  });

  it("respects max stack size of 50", () => {
    const { result } = renderHook(() => useUndoRedo(onZoneChanged, false));

    act(() => {
      for (let i = 0; i < 55; i++) {
        result.current.pushOperation({
          type: "createRoom",
          label: `Op ${i}`,
          undo: vi.fn(async () => {}),
          redo: vi.fn(async () => {}),
        });
      }
    });

    // Can still undo but the oldest ops were evicted
    expect(result.current.canUndo).toBe(true);
    expect(result.current.undoLabel).toBe("Op 54");
  });

  it("undo is no-op when stack is empty", async () => {
    const { result } = renderHook(() => useUndoRedo(onZoneChanged, false));

    await act(async () => {
      await result.current.handleUndo();
    });

    expect(onZoneChanged).not.toHaveBeenCalled();
  });

  it("redo is no-op when stack is empty", async () => {
    const { result } = renderHook(() => useUndoRedo(onZoneChanged, false));

    await act(async () => {
      await result.current.handleRedo();
    });

    expect(onZoneChanged).not.toHaveBeenCalled();
  });

  it("propagates undo errors", async () => {
    const { result } = renderHook(() => useUndoRedo(onZoneChanged, false));

    act(() => {
      result.current.pushOperation({
        type: "deleteRoom",
        label: "Delete room",
        undo: vi.fn(async () => { throw new Error("API error"); }),
        redo: vi.fn(async () => {}),
      });
    });

    await expect(
      act(async () => { await result.current.handleUndo(); })
    ).rejects.toThrow("API error");

    // Operation stays in undo stack on failure (was not moved to redo)
    expect(result.current.canUndo).toBe(true);
  });

  it("multiple operations undo/redo in LIFO order", async () => {
    const order: string[] = [];
    const { result } = renderHook(() => useUndoRedo(onZoneChanged, false));

    act(() => {
      result.current.pushOperation({
        type: "createRoom",
        label: "First",
        undo: vi.fn(async () => { order.push("undo-first"); }),
        redo: vi.fn(async () => { order.push("redo-first"); }),
      });
      result.current.pushOperation({
        type: "createExit",
        label: "Second",
        undo: vi.fn(async () => { order.push("undo-second"); }),
        redo: vi.fn(async () => { order.push("redo-second"); }),
      });
    });

    await act(async () => { await result.current.handleUndo(); });
    await act(async () => { await result.current.handleUndo(); });

    expect(order).toEqual(["undo-second", "undo-first"]);

    await act(async () => { await result.current.handleRedo(); });
    await act(async () => { await result.current.handleRedo(); });

    expect(order).toEqual(["undo-second", "undo-first", "redo-first", "redo-second"]);
  });
});

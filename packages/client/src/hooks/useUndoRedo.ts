/**
 * useUndoRedo — Operation stack for zone designer CRUD undo/redo.
 *
 * Each operation records an async undo() and redo() function that issue
 * real API calls (e.g. undo "create room" → DELETE the room).
 *
 * Keyboard shortcuts: Ctrl+Z (undo), Ctrl+Shift+Z / Ctrl+Y (redo).
 * Stack is capped at MAX_STACK_SIZE to prevent memory bloat.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export type UndoRedoOperationType =
  | 'createRoom'
  | 'deleteRoom'
  | 'updateRoom'
  | 'createExit'
  | 'deleteExit'
  | 'updateExit';

export interface UndoRedoOperation {
  /** Operation type for debugging / display */
  type: UndoRedoOperationType;
  /** Human-readable label, e.g. "Create room 'tavern'" */
  label: string;
  /** Reverse this operation (makes real API calls) */
  undo: () => Promise<void>;
  /** Re-apply this operation (makes real API calls) */
  redo: () => Promise<void>;
}

export interface UseUndoRedoReturn {
  /** Push a new operation onto the stack (clears redo stack) */
  pushOperation: (op: UndoRedoOperation) => void;
  /** Execute undo — pops from undo stack, executes undo(), pushes to redo */
  handleUndo: () => Promise<void>;
  /** Execute redo — pops from redo stack, executes redo(), pushes to undo */
  handleRedo: () => Promise<void>;
  /** True while an undo/redo API call is in flight */
  undoRedoBusy: boolean;
  /** Whether the undo stack has entries */
  canUndo: boolean;
  /** Whether the redo stack has entries */
  canRedo: boolean;
  /** Label of the next undo operation (for tooltip) */
  undoLabel: string | null;
  /** Label of the next redo operation (for tooltip) */
  redoLabel: string | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_STACK_SIZE = 50;

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useUndoRedo(
  /** Called after a successful undo/redo to refresh zone data */
  onZoneChanged?: () => void,
  /** Whether keyboard shortcuts should be active */
  keyboardEnabled = true,
): UseUndoRedoReturn {
  const [undoStack, setUndoStack] = useState<UndoRedoOperation[]>([]);
  const [redoStack, setRedoStack] = useState<UndoRedoOperation[]>([]);
  const [undoRedoBusy, setUndoRedoBusy] = useState(false);

  // Refs to avoid stale closures in the keyboard handler
  const undoStackRef = useRef(undoStack);
  const redoStackRef = useRef(redoStack);
  const busyRef = useRef(undoRedoBusy);
  undoStackRef.current = undoStack;
  redoStackRef.current = redoStack;
  busyRef.current = undoRedoBusy;

  const pushOperation = useCallback((op: UndoRedoOperation) => {
    setUndoStack((prev) => {
      const next = [...prev, op];
      if (next.length > MAX_STACK_SIZE) next.shift();
      return next;
    });
    // New operation invalidates the redo stack
    setRedoStack([]);
  }, []);

  const handleUndo = useCallback(async () => {
    const stack = undoStackRef.current;
    if (stack.length === 0 || busyRef.current) return;
    const op = stack[stack.length - 1];
    try {
      setUndoRedoBusy(true);
      await op.undo();
      setUndoStack((prev) => prev.slice(0, -1));
      setRedoStack((prev) => {
        const next = [...prev, op];
        if (next.length > MAX_STACK_SIZE) next.shift();
        return next;
      });
      onZoneChanged?.();
    } catch (err) {
      console.error('[useUndoRedo] undo failed:', err);
      throw err;
    } finally {
      setUndoRedoBusy(false);
    }
  }, [onZoneChanged]);

  const handleRedo = useCallback(async () => {
    const stack = redoStackRef.current;
    if (stack.length === 0 || busyRef.current) return;
    const op = stack[stack.length - 1];
    try {
      setUndoRedoBusy(true);
      await op.redo();
      setRedoStack((prev) => prev.slice(0, -1));
      setUndoStack((prev) => {
        const next = [...prev, op];
        if (next.length > MAX_STACK_SIZE) next.shift();
        return next;
      });
      onZoneChanged?.();
    } catch (err) {
      console.error('[useUndoRedo] redo failed:', err);
      throw err;
    } finally {
      setUndoRedoBusy(false);
    }
  }, [onZoneChanged]);

  // ─── Keyboard shortcuts ──────────────────────────────────────────────────

  useEffect(() => {
    if (!keyboardEnabled) return;

    function onKeyDown(e: KeyboardEvent) {
      // Don't capture when typing in inputs/textareas
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      if (!isCtrlOrMeta) return;

      // Ctrl+Z → undo
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        void handleUndo();
        return;
      }

      // Ctrl+Shift+Z or Ctrl+Y → redo
      if ((e.key === 'z' && e.shiftKey) || (e.key === 'y' && !e.shiftKey)) {
        e.preventDefault();
        void handleRedo();
        return;
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [keyboardEnabled, handleUndo, handleRedo]);

  // ─── Derived state ─────────────────────────────────────────────────────

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;
  const undoLabel = canUndo ? undoStack[undoStack.length - 1].label : null;
  const redoLabel = canRedo ? redoStack[redoStack.length - 1].label : null;

  return {
    pushOperation,
    handleUndo,
    handleRedo,
    undoRedoBusy,
    canUndo,
    canRedo,
    undoLabel,
    redoLabel,
  };
}

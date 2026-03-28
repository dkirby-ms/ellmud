import { useState, useEffect, useCallback } from 'react';

/** Tags that indicate the user is typing — don't intercept M key. */
const INPUT_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

export function useMapToggle(): {
  isMapOpen: boolean;
  toggleMap: () => void;
  closeMap: () => void;
} {
  const [isMapOpen, setIsMapOpen] = useState(false);

  const toggleMap = useCallback(() => setIsMapOpen((prev) => !prev), []);
  const closeMap = useCallback(() => setIsMapOpen(false), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'm' || e.key === 'M') {
        const tag = document.activeElement?.tagName ?? '';
        if (INPUT_TAGS.has(tag)) return;
        const editable = (document.activeElement as HTMLElement)?.isContentEditable;
        if (editable) return;

        e.preventDefault();
        setIsMapOpen((prev) => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { isMapOpen, toggleMap, closeMap };
}

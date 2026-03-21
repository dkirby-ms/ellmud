import { useState, useEffect, useCallback, useRef } from 'react';
import { toast, ToastData, ToastType } from '../services/toast.js';

const MAX_VISIBLE = 3;
const EXIT_MS = 300;

interface DisplayToast extends ToastData {
  exiting: boolean;
}

/* ── Lucide-style SVG icons (18 × 18, stroke-only) ── */

function ToastIcon({ type }: { type: ToastType }): React.JSX.Element {
  const shared = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (type) {
    case 'system':
      return (
        <svg {...shared} aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      );
    case 'success':
      return (
        <svg {...shared} aria-hidden="true">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      );
    case 'warning':
      return (
        <svg {...shared} aria-hidden="true">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    case 'danger':
      return (
        <svg {...shared} aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      );
  }
}

export function ToastContainer(): React.JSX.Element {
  const [items, setItems] = useState<DisplayToast[]>([]);
  const exitTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const startExit = useCallback((id: string) => {
    if (exitTimers.current.has(id)) return;

    setItems(prev => prev.map(t => (t.id === id ? { ...t, exiting: true } : t)));

    exitTimers.current.set(
      id,
      setTimeout(() => {
        setItems(prev => prev.filter(t => t.id !== id));
        exitTimers.current.delete(id);
      }, EXIT_MS),
    );
  }, []);

  useEffect(() => {
    return toast.subscribe({
      onAdd(data) {
        setItems(prev => {
          const next = [...prev, { ...data, exiting: false }];
          const active = next.filter(t => !t.exiting);
          if (active.length > MAX_VISIBLE) {
            const overflow = active.slice(0, active.length - MAX_VISIBLE);
            for (const t of overflow) {
              setTimeout(() => toast.dismiss(t.id), 0);
            }
          }
          return next;
        });
      },
      onDismiss(id) {
        startExit(id);
      },
    });
  }, [startExit]);

  useEffect(() => {
    const timers = exitTimers.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
    };
  }, []);

  return (
    <div className="toast-container" aria-live="polite">
      {items.map(item => (
        <div
          key={item.id}
          className={`toast toast-${item.type}${item.exiting ? ' toast-exit' : ''}`}
          role="alert"
        >
          <div className="toast-accent" />
          <div className="toast-icon">
            <ToastIcon type={item.type} />
          </div>
          <div className="toast-content">
            {item.title && <div className="toast-title">{item.title}</div>}
            <div className="toast-message">{item.message}</div>
          </div>
          <button
            className="toast-close"
            onClick={() => toast.dismiss(item.id)}
            aria-label="Close notification"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

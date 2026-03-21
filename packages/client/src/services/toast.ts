/**
 * Toast notification service.
 *
 * Event-driven pub/sub — the service fires add/dismiss events and manages
 * auto-dismiss timers. The visual queue limit (max 3) is enforced by the
 * ToastContainer component so animations can play before removal.
 */

export type ToastType = 'system' | 'success' | 'warning' | 'danger';

export interface ToastData {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
}

export interface ToastSubscriber {
  onAdd: (toast: ToastData) => void;
  onDismiss: (id: string) => void;
}

let counter = 0;
const subscribers = new Set<ToastSubscriber>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();

const AUTO_DISMISS_MS = 4_000;

function add(type: ToastType, message: string, title?: string): string {
  const id = `toast-${++counter}`;
  const data: ToastData = { id, type, message, title };
  for (const sub of subscribers) sub.onAdd(data);
  timers.set(id, setTimeout(() => dismiss(id), AUTO_DISMISS_MS));
  return id;
}

function dismiss(id: string): void {
  const timer = timers.get(id);
  if (timer !== undefined) {
    clearTimeout(timer);
    timers.delete(id);
  }
  for (const sub of subscribers) sub.onDismiss(id);
}

function subscribe(subscriber: ToastSubscriber): () => void {
  subscribers.add(subscriber);
  return () => {
    subscribers.delete(subscriber);
  };
}

/** Reset all state — test helper only. */
function _reset(): void {
  for (const timer of timers.values()) clearTimeout(timer);
  timers.clear();
  subscribers.clear();
  counter = 0;
}

export const toast = {
  system: (message: string, title?: string) => add('system', message, title),
  success: (message: string, title?: string) => add('success', message, title),
  warning: (message: string, title?: string) => add('warning', message, title),
  danger: (message: string, title?: string) => add('danger', message, title),
  dismiss,
  subscribe,
  _reset,
};

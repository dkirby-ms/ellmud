import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { toast } from '../services/toast.js';
import { ToastContainer } from '../components/ToastContainer.js';

/* ── Helpers ── */

function renderToasts() {
  return render(<ToastContainer />);
}

/* ══════════════════════════════════════════════════════════════════════════
   Toast service — unit tests
   ══════════════════════════════════════════════════════════════════════ */

// TODO: ToastContainer.tsx moved to _old/ during UX overhaul. App now uses Sonner <Toaster /> via App.tsx.
// Rewrite tests for Sonner-based toast system.
describe.skip('toast service', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    toast._reset();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires onAdd with correct type for each helper', () => {
    const added: Array<{ type: string; message: string }> = [];
    toast.subscribe({
      onAdd: (t) => added.push({ type: t.type, message: t.message }),
      onDismiss: () => {},
    });

    toast.system('sys');
    toast.success('ok');
    toast.warning('watch out');
    toast.danger('oops');

    expect(added).toEqual([
      { type: 'system', message: 'sys' },
      { type: 'success', message: 'ok' },
      { type: 'warning', message: 'watch out' },
      { type: 'danger', message: 'oops' },
    ]);
  });

  it('returns a unique id per toast', () => {
    const ids = [toast.system('a'), toast.success('b'), toast.warning('c')];
    expect(new Set(ids).size).toBe(3);
  });

  it('auto-dismisses after 4 seconds', () => {
    const dismissed: string[] = [];
    toast.subscribe({ onAdd: () => {}, onDismiss: (id) => dismissed.push(id) });

    const id = toast.system('temp');
    expect(dismissed).toHaveLength(0);

    vi.advanceTimersByTime(4000);
    expect(dismissed).toEqual([id]);
  });

  it('manual dismiss fires onDismiss and clears auto-timer', () => {
    const dismissed: string[] = [];
    toast.subscribe({ onAdd: () => {}, onDismiss: (id) => dismissed.push(id) });

    const id = toast.system('bye');
    toast.dismiss(id);
    expect(dismissed).toEqual([id]);

    // Advancing time should NOT fire a second dismiss
    vi.advanceTimersByTime(5000);
    expect(dismissed).toEqual([id]);
  });

  it('passes optional title through onAdd', () => {
    let title: string | undefined;
    toast.subscribe({ onAdd: (t) => { title = t.title; }, onDismiss: () => {} });

    toast.success('done', 'Saved!');
    expect(title).toBe('Saved!');
  });

  it('unsubscribe stops receiving events', () => {
    const msgs: string[] = [];
    const unsub = toast.subscribe({
      onAdd: (t) => msgs.push(t.message),
      onDismiss: () => {},
    });

    toast.system('first');
    unsub();
    toast.system('second');

    expect(msgs).toEqual(['first']);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   ToastContainer component — integration tests
   ══════════════════════════════════════════════════════════════════════ */

describe.skip('ToastContainer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    toast._reset();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when no toasts exist', () => {
    renderToasts();
    expect(screen.queryAllByRole('alert')).toHaveLength(0);
  });

  it('renders a system toast with correct class and message', () => {
    renderToasts();
    act(() => { toast.system('Server restarting'); });

    const el = screen.getByRole('alert');
    expect(el).toHaveClass('toast', 'toast-system');
    expect(el).toHaveTextContent('Server restarting');
  });

  it('renders a success toast with correct class', () => {
    renderToasts();
    act(() => { toast.success('Saved'); });

    expect(screen.getByRole('alert')).toHaveClass('toast-success');
  });

  it('renders a warning toast with correct class', () => {
    renderToasts();
    act(() => { toast.warning('Low health'); });

    expect(screen.getByRole('alert')).toHaveClass('toast-warning');
  });

  it('renders a danger toast with correct class', () => {
    renderToasts();
    act(() => { toast.danger('Connection lost'); });

    expect(screen.getByRole('alert')).toHaveClass('toast-danger');
  });

  it('renders title when provided', () => {
    renderToasts();
    act(() => { toast.success('All items transferred', 'Extraction Complete'); });

    expect(screen.getByText('Extraction Complete')).toBeInTheDocument();
    expect(screen.getByText('All items transferred')).toBeInTheDocument();
  });

  it('renders an SVG icon for each toast type', () => {
    renderToasts();
    act(() => { toast.system('msg'); });

    const icon = screen.getByRole('alert').querySelector('.toast-icon svg');
    expect(icon).not.toBeNull();
  });

  it('close button dismisses the toast', () => {
    renderToasts();
    act(() => { toast.system('dismiss me'); });

    expect(screen.getAllByRole('alert')).toHaveLength(1);

    const closeBtn = screen.getByLabelText('Close notification');
    act(() => { fireEvent.click(closeBtn); });

    // Exit animation completes → removed from DOM
    act(() => { vi.advanceTimersByTime(300); });
    expect(screen.queryAllByRole('alert')).toHaveLength(0);
  });

  it('auto-dismisses after 4 seconds', () => {
    renderToasts();
    act(() => { toast.system('going away'); });
    expect(screen.getAllByRole('alert')).toHaveLength(1);

    // 4s: service fires dismiss → component starts exit animation
    act(() => { vi.advanceTimersByTime(4000); });
    // 300ms: exit animation completes → removed from DOM
    act(() => { vi.advanceTimersByTime(300); });

    expect(screen.queryAllByRole('alert')).toHaveLength(0);
  });

  it('enforces max 3 visible toasts, dismissing oldest', () => {
    renderToasts();

    act(() => {
      toast.system('one');
      toast.success('two');
      toast.warning('three');
    });
    expect(screen.getAllByRole('alert')).toHaveLength(3);

    // Adding a 4th causes the oldest to be dismissed
    act(() => { toast.danger('four'); });
    // Flush the setTimeout(0) used for overflow dismiss
    act(() => { vi.advanceTimersByTime(0); });
    // Flush the exit animation timer
    act(() => { vi.advanceTimersByTime(300); });

    const alerts = screen.getAllByRole('alert');
    expect(alerts.length).toBeLessThanOrEqual(3);
    // The 4th toast ("four") should be visible
    expect(screen.getByText('four')).toBeInTheDocument();
  });

  it('applies toast-exit class during fade-out', () => {
    renderToasts();
    act(() => { toast.system('fading'); });

    const el = screen.getByRole('alert');
    expect(el).not.toHaveClass('toast-exit');

    // Trigger dismiss — starts exit animation
    act(() => { vi.advanceTimersByTime(4000); });
    expect(el).toHaveClass('toast-exit');
  });

  it('has aria-live on container', () => {
    const { container } = renderToasts();
    const toastContainer = container.querySelector('.toast-container');
    expect(toastContainer).toHaveAttribute('aria-live', 'polite');
  });
});

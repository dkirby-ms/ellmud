import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { ReconnectionOverlay, type ReconnectionOverlayProps } from '../components/ReconnectionOverlay.js';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function renderOverlay(props: Partial<ReconnectionOverlayProps> = {}) {
  const defaults: ReconnectionOverlayProps = {
    state: 'disconnected',
    attempt: 1,
    maxAttempts: 5,
    elapsedSeconds: 0,
    onReconnect: vi.fn(),
    onCancel: vi.fn(),
    onReturnToRefuge: vi.fn(),
    ...props,
  };
  return render(<ReconnectionOverlay {...defaults} />);
}

// TODO: ReconnectionOverlay.tsx moved to _old/ during UX overhaul. Reconnection UI will be rebuilt with new design system.
// Rewrite tests for new reconnection overlay.
describe.skip('ReconnectionOverlay', () => {
  describe('Hidden state', () => {
    it('renders nothing when state is hidden', () => {
      renderOverlay({ state: 'hidden' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Disconnected state', () => {
    it('renders the overlay dialog', () => {
      renderOverlay({ state: 'disconnected' });
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('shows warning icon', () => {
      renderOverlay({ state: 'disconnected' });
      expect(screen.getByText('⚠')).toBeInTheDocument();
    });

    it('displays "Connection Lost" title', () => {
      renderOverlay({ state: 'disconnected' });
      expect(screen.getByText('Connection Lost')).toBeInTheDocument();
    });

    it('shows reconnection attempt counter', () => {
      renderOverlay({ state: 'disconnected', attempt: 3, maxAttempts: 5 });
      expect(screen.getByText('Attempt 3 of 5')).toBeInTheDocument();
    });

    it('renders "Reconnect Now" button with correct aria-label', () => {
      renderOverlay({ state: 'disconnected' });
      const btn = screen.getByRole('button', { name: 'Reconnect now' });
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveTextContent('Reconnect Now');
    });

    it('renders "Return to Refuge" button with correct aria-label', () => {
      renderOverlay({ state: 'disconnected' });
      const btn = screen.getByRole('button', { name: 'Return to Refuge' });
      expect(btn).toBeInTheDocument();
    });

    it('calls onReconnect when Reconnect Now is clicked', () => {
      const onReconnect = vi.fn();
      renderOverlay({ state: 'disconnected', onReconnect });
      fireEvent.click(screen.getByRole('button', { name: 'Reconnect now' }));
      expect(onReconnect).toHaveBeenCalledOnce();
    });

    it('calls onReturnToRefuge when Return to Refuge is clicked', () => {
      const onReturnToRefuge = vi.fn();
      renderOverlay({ state: 'disconnected', onReturnToRefuge });
      fireEvent.click(screen.getByRole('button', { name: 'Return to Refuge' }));
      expect(onReturnToRefuge).toHaveBeenCalledOnce();
    });

    it('applies disconnected title CSS class', () => {
      renderOverlay({ state: 'disconnected' });
      expect(screen.getByText('Connection Lost')).toHaveClass('reconnect-title--disconnected');
    });

    it('has aria-modal and aria-label on dialog', () => {
      renderOverlay({ state: 'disconnected' });
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-label', 'Connection status');
    });

    it('has aria-live assertive for screen readers', () => {
      renderOverlay({ state: 'disconnected' });
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-live', 'assertive');
    });
  });

  describe('Reconnecting state', () => {
    it('shows spinner element', () => {
      const { container } = renderOverlay({ state: 'reconnecting' });
      expect(container.querySelector('.reconnect-spinner')).toBeInTheDocument();
    });

    it('displays "Reconnecting…" title', () => {
      renderOverlay({ state: 'reconnecting' });
      expect(screen.getByText('Reconnecting…')).toBeInTheDocument();
    });

    it('applies reconnecting title CSS class', () => {
      renderOverlay({ state: 'reconnecting' });
      expect(screen.getByText('Reconnecting…')).toHaveClass('reconnect-title--reconnecting');
    });

    it('shows progress bar with correct value', () => {
      renderOverlay({ state: 'reconnecting', attempt: 2, maxAttempts: 5 });
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toBeInTheDocument();
      expect(progressbar).toHaveAttribute('aria-valuenow', '40');
    });

    it('shows elapsed time and attempt info', () => {
      renderOverlay({ state: 'reconnecting', attempt: 2, maxAttempts: 5, elapsedSeconds: 7 });
      expect(screen.getByText('Attempt 2 of 5 · 7s elapsed')).toBeInTheDocument();
    });

    it('renders Cancel button', () => {
      renderOverlay({ state: 'reconnecting' });
      expect(screen.getByRole('button', { name: 'Cancel reconnection' })).toBeInTheDocument();
    });

    it('calls onCancel when Cancel is clicked', () => {
      const onCancel = vi.fn();
      renderOverlay({ state: 'reconnecting', onCancel });
      fireEvent.click(screen.getByRole('button', { name: 'Cancel reconnection' }));
      expect(onCancel).toHaveBeenCalledOnce();
    });

    it('progress bar fills proportionally to attempts', () => {
      const { container } = renderOverlay({ state: 'reconnecting', attempt: 3, maxAttempts: 5 });
      const fill = container.querySelector('.reconnect-progress__fill') as HTMLElement;
      expect(fill.style.width).toBe('60%');
    });
  });

  describe('Reconnected state', () => {
    it('shows checkmark icon', () => {
      renderOverlay({ state: 'reconnected' });
      expect(screen.getByText('✓')).toBeInTheDocument();
    });

    it('displays "Connection Restored" title', () => {
      renderOverlay({ state: 'reconnected' });
      expect(screen.getByText('Connection Restored')).toBeInTheDocument();
    });

    it('applies reconnected title CSS class with success color', () => {
      renderOverlay({ state: 'reconnected' });
      expect(screen.getByText('Connection Restored')).toHaveClass('reconnect-title--reconnected');
    });

    it('auto-dismisses after 2 seconds', () => {
      renderOverlay({ state: 'reconnected' });
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      act(() => { vi.advanceTimersByTime(2000); });

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('does not show any action buttons', () => {
      renderOverlay({ state: 'reconnected' });
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('Overlay styling', () => {
    it('renders with overlay scrim', () => {
      const { container } = renderOverlay({ state: 'disconnected' });
      expect(container.querySelector('.reconnect-overlay')).toBeInTheDocument();
    });

    it('applies visible class for fade-in', () => {
      const { container } = renderOverlay({ state: 'disconnected' });
      expect(container.querySelector('.reconnect-overlay--visible')).toBeInTheDocument();
    });

    it('renders centered card', () => {
      const { container } = renderOverlay({ state: 'disconnected' });
      expect(container.querySelector('.reconnect-card')).toBeInTheDocument();
    });
  });

  describe('CSS variable compliance', () => {
    it('uses theme CSS classes for title variants', () => {
      const { rerender } = render(
        <ReconnectionOverlay state="disconnected" attempt={1} maxAttempts={5} />,
      );
      expect(screen.getByText('Connection Lost')).toHaveClass('reconnect-title--disconnected');

      rerender(
        <ReconnectionOverlay state="reconnecting" attempt={1} maxAttempts={5} />,
      );
      expect(screen.getByText('Reconnecting…')).toHaveClass('reconnect-title--reconnecting');
    });

    it('button variants use correct CSS classes', () => {
      const { container } = renderOverlay({ state: 'disconnected' });
      expect(container.querySelector('.reconnect-btn--primary')).toBeInTheDocument();
      expect(container.querySelector('.reconnect-btn--secondary')).toBeInTheDocument();
    });
  });
});

/**
 * LoadingTransitions tests — validates all four transition components.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import {
  RoomTransitionLoader,
  ShardEntryLoader,
  CombatInitiationBanner,
  LongRunningIndicator,
} from '../components/LoadingTransitions.js';

// ─── Room Transition Loader ──────────────────────────────────────────────────

describe('RoomTransitionLoader — rendering', () => {
  it('renders when active', () => {
    render(<RoomTransitionLoader active={true} />);
    expect(screen.getByText(/transitioning/i)).toBeInTheDocument();
  });

  it('does not render when inactive', () => {
    const { container } = render(<RoomTransitionLoader active={false} />);
    expect(container.querySelector('.room-transition')).not.toBeInTheDocument();
  });

  it('has room-transition CSS class', () => {
    const { container } = render(<RoomTransitionLoader active={true} />);
    expect(container.querySelector('.room-transition')).toBeInTheDocument();
  });

  it('shows a spinner element', () => {
    const { container } = render(<RoomTransitionLoader active={true} />);
    expect(container.querySelector('.spinner')).toBeInTheDocument();
  });

  it('has role="status" for accessibility', () => {
    render(<RoomTransitionLoader active={true} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has aria-label describing the transition', () => {
    render(<RoomTransitionLoader active={true} />);
    const status = screen.getByRole('status');
    expect(status.getAttribute('aria-label')).toMatch(/transition|loading/i);
  });
});

describe('RoomTransitionLoader — minimum display time', () => {
  beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true }); });
  afterEach(() => { vi.useRealTimers(); });

  it('stays visible for at least 300ms even if set inactive immediately', async () => {
    const { container, rerender } = render(<RoomTransitionLoader active={true} />);

    rerender(<RoomTransitionLoader active={false} />);

    // Should still be visible due to min display time
    expect(container.querySelector('.room-transition')).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(350); });

    await waitFor(() => {
      expect(container.querySelector('.room-transition')).not.toBeInTheDocument();
    });
  });

  it('stays visible for at least 300ms, not more than ~500ms', async () => {
    const { container, rerender } = render(<RoomTransitionLoader active={true} />);
    rerender(<RoomTransitionLoader active={false} />);

    act(() => { vi.advanceTimersByTime(200); });
    expect(container.querySelector('.room-transition')).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(350); });
    await waitFor(() => {
      expect(container.querySelector('.room-transition')).not.toBeInTheDocument();
    });
  });
});

// ─── Shard Entry Loader ──────────────────────────────────────────────────────

describe('ShardEntryLoader — rendering', () => {
  it('renders "Entering shard..." text when active', () => {
    render(<ShardEntryLoader active={true} />);
    expect(screen.getByText(/entering shard/i)).toBeInTheDocument();
  });

  it('has shard-entry-loader CSS class', () => {
    const { container } = render(<ShardEntryLoader active={true} />);
    expect(container.querySelector('.shard-entry-loader')).toBeInTheDocument();
  });

  it('does not render when inactive', () => {
    const { container } = render(<ShardEntryLoader active={false} />);
    expect(container.querySelector('.shard-entry-loader')).not.toBeInTheDocument();
  });

  it('shows a spinner element', () => {
    const { container } = render(<ShardEntryLoader active={true} />);
    expect(container.querySelector('.spinner')).toBeInTheDocument();
  });

  it('has role="status" for accessibility', () => {
    render(<ShardEntryLoader active={true} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});

describe('ShardEntryLoader — dismissed on first room', () => {
  it('hides when active toggles to false', () => {
    const { container, rerender } = render(<ShardEntryLoader active={true} />);
    expect(container.querySelector('.shard-entry-loader')).toBeInTheDocument();

    rerender(<ShardEntryLoader active={false} />);
    expect(container.querySelector('.shard-entry-loader')).not.toBeInTheDocument();
  });
});

// ─── Combat Initiation Banner ────────────────────────────────────────────────

describe('CombatInitiationBanner — rendering', () => {
  it('renders combat initiation text', () => {
    render(<CombatInitiationBanner active={true} />);
    expect(screen.getByText(/combat/i)).toBeInTheDocument();
  });

  it('has combat-initiation CSS class', () => {
    const { container } = render(<CombatInitiationBanner active={true} />);
    expect(container.querySelector('.combat-initiation')).toBeInTheDocument();
  });

  it('is a banner, not a full-screen overlay', () => {
    const { container } = render(<CombatInitiationBanner active={true} />);
    expect(container.querySelector('.overlay-blocking')).not.toBeInTheDocument();
  });

  it('applies slide-in animation class', () => {
    const { container } = render(<CombatInitiationBanner active={true} />);
    expect(container.querySelector('.banner-slide-in')).toBeInTheDocument();
  });

  it('does not render when inactive', () => {
    const { container } = render(<CombatInitiationBanner active={false} />);
    expect(container.querySelector('.combat-initiation')).not.toBeInTheDocument();
  });

  it('has role="alert" for screen reader announcement', () => {
    render(<CombatInitiationBanner active={true} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});

describe('CombatInitiationBanner — auto-dismiss', () => {
  beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true }); });
  afterEach(() => { vi.useRealTimers(); });

  it('auto-dismisses after a short display', async () => {
    const { container } = render(<CombatInitiationBanner active={true} />);
    expect(container.querySelector('.combat-initiation')).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(2500); });

    await waitFor(() => {
      expect(container.querySelector('.combat-initiation')).not.toBeInTheDocument();
    });
  });
});

// ─── Long-Running Indicator ──────────────────────────────────────────────────

describe('LongRunningIndicator — rendering', () => {
  it('does not show cancel button before 5s', () => {
    render(<LongRunningIndicator elapsedMs={3000} onCancel={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
  });

  it('shows cancel button after 5s', () => {
    render(<LongRunningIndicator elapsedMs={5500} onCancel={vi.fn()} />);
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<LongRunningIndicator elapsedMs={6000} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('has long-running CSS class', () => {
    const { container } = render(
      <LongRunningIndicator elapsedMs={6000} onCancel={vi.fn()} />,
    );
    expect(container.querySelector('.long-running')).toBeInTheDocument();
  });
});

describe('LongRunningIndicator — threshold crossing', () => {
  it('cancel button appears when elapsed crosses 5s threshold', () => {
    const { rerender } = render(
      <LongRunningIndicator elapsedMs={4000} onCancel={vi.fn()} />,
    );
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();

    rerender(<LongRunningIndicator elapsedMs={5500} onCancel={vi.fn()} />);
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });
});

// ─── CSS compliance ──────────────────────────────────────────────────────────

describe('LoadingTransitions — CSS compliance', () => {
  it('room transition does not use inline hardcoded hex colors', () => {
    const { container } = render(<RoomTransitionLoader active={true} />);
    container.querySelectorAll('[style]').forEach((el) => {
      const style = el.getAttribute('style') ?? '';
      expect(style).not.toMatch(/#[0-9A-Fa-f]{3,8}/);
    });
  });

  it('shard entry does not use inline hardcoded hex colors', () => {
    const { container } = render(<ShardEntryLoader active={true} />);
    container.querySelectorAll('[style]').forEach((el) => {
      const style = el.getAttribute('style') ?? '';
      expect(style).not.toMatch(/#[0-9A-Fa-f]{3,8}/);
    });
  });

  it('combat initiation does not use inline hardcoded hex colors', () => {
    const { container } = render(<CombatInitiationBanner active={true} />);
    container.querySelectorAll('[style]').forEach((el) => {
      const style = el.getAttribute('style') ?? '';
      expect(style).not.toMatch(/#[0-9A-Fa-f]{3,8}/);
    });
  });
});

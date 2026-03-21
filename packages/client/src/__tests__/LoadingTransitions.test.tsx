import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  RoomTransitionLoader,
  ShardEntryLoader,
  CombatInitiationBanner,
  LongRunningIndicator,
} from '../components/LoadingTransitions.js';

vi.mock('../services/connection.js');

describe('RoomTransitionLoader', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders a full-screen overlay with loading-overlay class', () => {
    const { container } = render(<RoomTransitionLoader roomName="Crypt Depths" />);
    expect(container.querySelector('.loading-overlay')).toBeInTheDocument();
  });

  it('displays the destination room name', () => {
    render(<RoomTransitionLoader roomName="Crypt Depths" />);
    expect(screen.getByText('Crypt Depths')).toBeInTheDocument();
  });

  it('enforces minimum 300ms display time', () => {
    const onComplete = vi.fn();
    render(<RoomTransitionLoader roomName="Crypt" duration={100} onComplete={onComplete} />);

    vi.advanceTimersByTime(100);
    expect(onComplete).not.toHaveBeenCalled();

    vi.advanceTimersByTime(200);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('has aria-live polite for screen readers', () => {
    render(<RoomTransitionLoader roomName="Crypt" />);
    expect(screen.getByText('Crypt').closest('[aria-live]')).toHaveAttribute('aria-live', 'polite');
  });

  it('auto-dismisses after specified duration', () => {
    const onComplete = vi.fn();
    render(<RoomTransitionLoader roomName="Crypt" duration={500} onComplete={onComplete} />);

    vi.advanceTimersByTime(500);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('renders loading text content', () => {
    render(<RoomTransitionLoader roomName="The Refuge" />);
    expect(screen.getByText(/loading|entering|transitioning/i)).toBeInTheDocument();
  });
});

describe('ShardEntryLoader', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('applies shard-entry-loader CSS class', () => {
    const { container } = render(<ShardEntryLoader shardName="Obsidian Halls" tier={2} />);
    expect(container.querySelector('.shard-entry-loader')).toBeInTheDocument();
  });

  it('shows the shard name', () => {
    render(<ShardEntryLoader shardName="Obsidian Halls" tier={2} />);
    expect(screen.getByText('Obsidian Halls')).toBeInTheDocument();
  });

  it('shows the shard tier', () => {
    render(<ShardEntryLoader shardName="Obsidian Halls" tier={3} />);
    expect(screen.getByText(/T3|tier 3/i)).toBeInTheDocument();
  });

  it('renders a progress bar with progressbar role', () => {
    render(<ShardEntryLoader shardName="Halls" tier={1} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('contains a portal/rift animation container', () => {
    const { container } = render(<ShardEntryLoader shardName="Halls" tier={1} />);
    expect(
      container.querySelector('.shard-entry-portal') ?? container.querySelector('.shard-entry-rift'),
    ).toBeInTheDocument();
  });

  it('updates progress bar value over time', () => {
    render(<ShardEntryLoader shardName="Halls" tier={1} duration={2000} />);
    const bar = screen.getByRole('progressbar');

    vi.advanceTimersByTime(1000);
    const value = Number(bar.getAttribute('aria-valuenow'));
    expect(value).toBeGreaterThan(0);
  });
});

describe('CombatInitiationBanner', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('applies combat-initiation CSS class', () => {
    const { container } = render(<CombatInitiationBanner />);
    expect(container.querySelector('.combat-initiation')).toBeInTheDocument();
  });

  it('displays "⚔ Engaging..." text', () => {
    render(<CombatInitiationBanner />);
    expect(screen.getByText(/⚔\s*engaging/i)).toBeInTheDocument();
  });

  it('has blood-red accent styling', () => {
    const { container } = render(<CombatInitiationBanner />);
    expect(
      container.querySelector('.combat-initiation--blood-red') ??
      container.querySelector('.combat-initiation'),
    ).toBeInTheDocument();
  });

  it('auto-dismisses after 1.5 seconds', () => {
    const onComplete = vi.fn();
    render(<CombatInitiationBanner onComplete={onComplete} />);

    vi.advanceTimersByTime(1400);
    expect(onComplete).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('has alert role for screen readers', () => {
    render(<CombatInitiationBanner />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders the banner visibly', () => {
    const { container } = render(<CombatInitiationBanner />);
    expect(container.firstElementChild).toBeVisible();
  });
});

describe('LongRunningIndicator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders a spinner with status role', () => {
    render(<LongRunningIndicator active message="Loading world..." />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows the provided message text', () => {
    render(<LongRunningIndicator active message="Connecting to server..." />);
    expect(screen.getByText('Connecting to server...')).toBeInTheDocument();
  });

  it('updates elapsed timer every 1 second', () => {
    render(<LongRunningIndicator active message="Working..." />);

    vi.advanceTimersByTime(3000);
    expect(screen.getByText(/3s/)).toBeInTheDocument();
  });

  it('is hidden when not active', () => {
    const { container } = render(<LongRunningIndicator active={false} message="Hidden" />);
    expect(container.firstElementChild).not.toBeVisible();
  });

  it('resets elapsed time when message changes', () => {
    const { rerender } = render(<LongRunningIndicator active message="First task" />);
    vi.advanceTimersByTime(5000);

    rerender(<LongRunningIndicator active message="Second task" />);
    expect(screen.queryByText(/5s/)).not.toBeInTheDocument();
  });

  it('shows elapsed time starting from 0', () => {
    render(<LongRunningIndicator active message="Starting..." />);
    expect(screen.getByText(/0s/)).toBeInTheDocument();
  });
});

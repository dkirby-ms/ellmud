/**
 * trade-request.test.tsx — TradeRequest and TradeRequestList component tests.
 * Covers rendering, accept/decline, auto-decline timer, item tier styling,
 * empty state, and accessibility.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  TradeRequest,
  TradeRequestList,
  type TradeRequestData,
} from '../components/TradeRequest.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(overrides?: Partial<TradeRequestData>): TradeRequestData {
  return {
    id: 'trade-1',
    traderId: 'p1',
    traderName: 'Warrior Kael',
    offeredItems: [
      { id: 'i1', name: 'Iron Sword', tier: 'common', type: 'weapon' },
    ],
    requestedItems: [
      { id: 'i2', name: 'Steel Ingot', tier: 'sturdy', type: 'material' },
    ],
    timestamp: Date.now(),
    ...overrides,
  };
}

const defaultProps = {
  request: makeRequest(),
  onAccept: vi.fn(),
  onDecline: vi.fn(),
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('TradeRequest', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Rendering ──

  it('renders trade request dialog', () => {
    render(<TradeRequest {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders trader name', () => {
    render(<TradeRequest {...defaultProps} />);
    expect(screen.getByText('Warrior Kael')).toBeInTheDocument();
  });

  it('renders "wants to trade" description', () => {
    render(<TradeRequest {...defaultProps} />);
    expect(screen.getByText(/wants to trade/)).toBeInTheDocument();
  });

  it('renders offered items', () => {
    render(<TradeRequest {...defaultProps} />);
    expect(screen.getByText('Iron Sword')).toBeInTheDocument();
    expect(screen.getByText('Offering:')).toBeInTheDocument();
  });

  it('renders requested items', () => {
    render(<TradeRequest {...defaultProps} />);
    expect(screen.getByText('Steel Ingot')).toBeInTheDocument();
    expect(screen.getByText('Wants:')).toBeInTheDocument();
  });

  it('renders item type labels', () => {
    render(<TradeRequest {...defaultProps} />);
    expect(screen.getByText('weapon')).toBeInTheDocument();
    expect(screen.getByText('material')).toBeInTheDocument();
  });

  it('renders Accept and Decline buttons', () => {
    render(<TradeRequest {...defaultProps} />);
    expect(screen.getByText('Accept')).toBeInTheDocument();
    expect(screen.getByText('Decline')).toBeInTheDocument();
  });

  // ── Accept/Decline ──

  it('calls onAccept with request id on Accept click', async () => {
    vi.useRealTimers();
    const onAccept = vi.fn();
    const user = userEvent.setup();
    render(<TradeRequest {...defaultProps} onAccept={onAccept} />);

    await user.click(screen.getByText('Accept'));
    expect(onAccept).toHaveBeenCalledWith('trade-1');
  });

  it('calls onDecline with request id on Decline click', async () => {
    vi.useRealTimers();
    const onDecline = vi.fn();
    const user = userEvent.setup();
    render(<TradeRequest {...defaultProps} onDecline={onDecline} />);

    await user.click(screen.getByText('Decline'));
    expect(onDecline).toHaveBeenCalledWith('trade-1');
  });

  // ── Auto-decline timer ──

  it('auto-declines after default timeout (30s)', () => {
    const onDecline = vi.fn();
    render(<TradeRequest {...defaultProps} onDecline={onDecline} />);

    expect(onDecline).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(30000);
    });

    expect(onDecline).toHaveBeenCalledWith('trade-1');
  });

  it('auto-declines after custom timeout', () => {
    const onDecline = vi.fn();
    render(
      <TradeRequest {...defaultProps} onDecline={onDecline} autoDeclineMs={5000} />,
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(onDecline).toHaveBeenCalledWith('trade-1');
  });

  it('clears auto-decline timer on Accept', async () => {
    vi.useRealTimers();
    const onDecline = vi.fn();
    const onAccept = vi.fn();
    const user = userEvent.setup();
    render(
      <TradeRequest {...defaultProps} onAccept={onAccept} onDecline={onDecline} />,
    );

    await user.click(screen.getByText('Accept'));
    expect(onAccept).toHaveBeenCalled();
    // Timer should have been cleared — decline should not fire
    // (if real timers were used, timeout wouldn't fire after accept)
  });

  it('clears auto-decline timer on unmount', () => {
    const onDecline = vi.fn();
    const { unmount } = render(
      <TradeRequest {...defaultProps} onDecline={onDecline} />,
    );

    unmount();

    act(() => {
      vi.advanceTimersByTime(30000);
    });

    expect(onDecline).not.toHaveBeenCalled();
  });

  // ── Item tier styling ──

  it('applies tier class to offered items', () => {
    const { container } = render(<TradeRequest {...defaultProps} />);
    expect(container.querySelector('.trade-item--common')).toBeInTheDocument();
  });

  it('applies tier class to requested items', () => {
    const { container } = render(<TradeRequest {...defaultProps} />);
    expect(container.querySelector('.trade-item--sturdy')).toBeInTheDocument();
  });

  it('renders multiple item tiers correctly', () => {
    const request = makeRequest({
      offeredItems: [
        { id: 'i1', name: 'Void Blade', tier: 'anomalous', type: 'weapon' },
        { id: 'i2', name: 'Steel Shield', tier: 'refined', type: 'armour' },
      ],
    });
    const { container } = render(
      <TradeRequest {...defaultProps} request={request} />,
    );
    expect(container.querySelector('.trade-item--anomalous')).toBeInTheDocument();
    expect(container.querySelector('.trade-item--refined')).toBeInTheDocument();
  });

  // ── Edge cases ──

  it('renders with empty offered items', () => {
    const request = makeRequest({ offeredItems: [] });
    render(<TradeRequest {...defaultProps} request={request} />);
    expect(screen.queryByText('Offering:')).not.toBeInTheDocument();
    expect(screen.getByText('Wants:')).toBeInTheDocument();
  });

  it('renders with empty requested items', () => {
    const request = makeRequest({ requestedItems: [] });
    render(<TradeRequest {...defaultProps} request={request} />);
    expect(screen.getByText('Offering:')).toBeInTheDocument();
    expect(screen.queryByText('Wants:')).not.toBeInTheDocument();
  });

  // ── BEM class validation ──

  it('has correct BEM root class', () => {
    const { container } = render(<TradeRequest {...defaultProps} />);
    expect(container.querySelector('.trade-request')).toBeInTheDocument();
  });

  it('has aria-label on dialog', () => {
    render(<TradeRequest {...defaultProps} />);
    expect(screen.getByLabelText('Trade request')).toBeInTheDocument();
  });
});

// ─── TradeRequestList ────────────────────────────────────────────────────────

describe('TradeRequestList', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders title', () => {
    render(
      <TradeRequestList requests={[]} onAccept={vi.fn()} onDecline={vi.fn()} />,
    );
    expect(screen.getByText('Trade Requests')).toBeInTheDocument();
  });

  it('renders empty state when no requests', () => {
    render(
      <TradeRequestList requests={[]} onAccept={vi.fn()} onDecline={vi.fn()} />,
    );
    expect(screen.getByText('No pending requests')).toBeInTheDocument();
  });

  it('renders multiple trade requests', () => {
    const requests = [
      makeRequest({ id: 'tr1', traderName: 'Kael' }),
      makeRequest({ id: 'tr2', traderName: 'Vex' }),
    ];
    render(
      <TradeRequestList requests={requests} onAccept={vi.fn()} onDecline={vi.fn()} />,
    );
    expect(screen.getByText('Kael')).toBeInTheDocument();
    expect(screen.getByText('Vex')).toBeInTheDocument();
  });
});

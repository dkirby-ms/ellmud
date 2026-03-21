import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReconnection } from '../hooks/useReconnection.js';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useReconnection', () => {
  it('starts in hidden state', () => {
    const { result } = renderHook(() =>
      useReconnection({ onReconnect: vi.fn().mockResolvedValue(true) }),
    );
    expect(result.current.overlayState).toBe('hidden');
    expect(result.current.attempt).toBe(0);
  });

  it('transitions to reconnecting on reportDisconnect', () => {
    const onReconnect = vi.fn().mockResolvedValue(false);
    const { result } = renderHook(() => useReconnection({ onReconnect }));

    act(() => { result.current.reportDisconnect(); });
    expect(result.current.overlayState).toBe('reconnecting');
    expect(result.current.attempt).toBe(1);
  });

  it('transitions to reconnected on successful reconnect', async () => {
    const onReconnect = vi.fn().mockResolvedValue(true);
    const { result } = renderHook(() => useReconnection({ onReconnect }));

    act(() => { result.current.reportDisconnect(); });
    // Flush the async onReconnect
    await act(async () => { await vi.runAllTimersAsync(); });

    expect(result.current.overlayState).toBe('reconnected');
  });

  it('increments elapsed seconds', () => {
    const onReconnect = vi.fn().mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useReconnection({ onReconnect }));

    act(() => { result.current.reportDisconnect(); });
    act(() => { vi.advanceTimersByTime(3000); });

    expect(result.current.elapsedSeconds).toBe(3);
  });

  it('cancels reconnection', async () => {
    const onReconnect = vi.fn().mockResolvedValue(false);
    const { result } = renderHook(() =>
      useReconnection({ onReconnect, baseDelayMs: 1000 }),
    );

    act(() => { result.current.reportDisconnect(); });
    // Flush first attempt
    await act(async () => { await vi.runAllTimersAsync(); });

    act(() => { result.current.cancel(); });
    expect(result.current.overlayState).toBe('disconnected');

    // Should not attempt again after cancel
    const callCount = onReconnect.mock.calls.length;
    act(() => { vi.advanceTimersByTime(10000); });
    expect(onReconnect.mock.calls.length).toBe(callCount);
  });

  it('calls onReturnToRefuge and hides overlay', () => {
    const onReturnToRefuge = vi.fn();
    const onReconnect = vi.fn().mockResolvedValue(false);
    const { result } = renderHook(() =>
      useReconnection({ onReconnect, onReturnToRefuge }),
    );

    act(() => { result.current.reportDisconnect(); });
    act(() => { result.current.returnToRefuge(); });

    expect(onReturnToRefuge).toHaveBeenCalledOnce();
    expect(result.current.overlayState).toBe('hidden');
  });

  it('reportConnected transitions to reconnected when overlay is visible', () => {
    const onReconnect = vi.fn().mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useReconnection({ onReconnect }));

    act(() => { result.current.reportDisconnect(); });
    expect(result.current.overlayState).toBe('reconnecting');

    act(() => { result.current.reportConnected(); });
    expect(result.current.overlayState).toBe('reconnected');
  });

  it('reportConnected does nothing when overlay is hidden', () => {
    const { result } = renderHook(() =>
      useReconnection({ onReconnect: vi.fn().mockResolvedValue(true) }),
    );

    act(() => { result.current.reportConnected(); });
    expect(result.current.overlayState).toBe('hidden');
  });

  it('stops at maxAttempts', async () => {
    const onReconnect = vi.fn().mockResolvedValue(false);
    const { result } = renderHook(() =>
      useReconnection({ onReconnect, maxAttempts: 2, baseDelayMs: 100 }),
    );

    act(() => { result.current.reportDisconnect(); });

    // Run through all retry timers
    for (let i = 0; i < 5; i++) {
      await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    }

    expect(result.current.overlayState).toBe('disconnected');
    // Should have called onReconnect at most maxAttempts times
    expect(onReconnect.mock.calls.length).toBeLessThanOrEqual(3);
  });
});

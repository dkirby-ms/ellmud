"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const react_1 = require("@testing-library/react");
const useReconnection_js_1 = require("../hooks/useReconnection.js");
(0, vitest_1.beforeEach)(() => {
    vitest_1.vi.useFakeTimers();
});
(0, vitest_1.afterEach)(() => {
    vitest_1.vi.useRealTimers();
});
(0, vitest_1.describe)('useReconnection', () => {
    (0, vitest_1.it)('starts in hidden state', () => {
        const { result } = (0, react_1.renderHook)(() => (0, useReconnection_js_1.useReconnection)({ onReconnect: vitest_1.vi.fn().mockResolvedValue(true) }));
        (0, vitest_1.expect)(result.current.overlayState).toBe('hidden');
        (0, vitest_1.expect)(result.current.attempt).toBe(0);
    });
    (0, vitest_1.it)('transitions to reconnecting on reportDisconnect', () => {
        const onReconnect = vitest_1.vi.fn().mockResolvedValue(false);
        const { result } = (0, react_1.renderHook)(() => (0, useReconnection_js_1.useReconnection)({ onReconnect }));
        (0, react_1.act)(() => { result.current.reportDisconnect(); });
        (0, vitest_1.expect)(result.current.overlayState).toBe('reconnecting');
        (0, vitest_1.expect)(result.current.attempt).toBe(1);
    });
    (0, vitest_1.it)('transitions to reconnected on successful reconnect', async () => {
        const onReconnect = vitest_1.vi.fn().mockResolvedValue(true);
        const { result } = (0, react_1.renderHook)(() => (0, useReconnection_js_1.useReconnection)({ onReconnect }));
        (0, react_1.act)(() => { result.current.reportDisconnect(); });
        // Flush the async onReconnect
        await (0, react_1.act)(async () => { await vitest_1.vi.runAllTimersAsync(); });
        (0, vitest_1.expect)(result.current.overlayState).toBe('reconnected');
    });
    (0, vitest_1.it)('increments elapsed seconds', () => {
        const onReconnect = vitest_1.vi.fn().mockReturnValue(new Promise(() => { })); // never resolves
        const { result } = (0, react_1.renderHook)(() => (0, useReconnection_js_1.useReconnection)({ onReconnect }));
        (0, react_1.act)(() => { result.current.reportDisconnect(); });
        (0, react_1.act)(() => { vitest_1.vi.advanceTimersByTime(3000); });
        (0, vitest_1.expect)(result.current.elapsedSeconds).toBe(3);
    });
    (0, vitest_1.it)('cancels reconnection', async () => {
        const onReconnect = vitest_1.vi.fn().mockResolvedValue(false);
        const { result } = (0, react_1.renderHook)(() => (0, useReconnection_js_1.useReconnection)({ onReconnect, baseDelayMs: 1000 }));
        (0, react_1.act)(() => { result.current.reportDisconnect(); });
        // Flush first attempt
        await (0, react_1.act)(async () => { await vitest_1.vi.runAllTimersAsync(); });
        (0, react_1.act)(() => { result.current.cancel(); });
        (0, vitest_1.expect)(result.current.overlayState).toBe('disconnected');
        // Should not attempt again after cancel
        const callCount = onReconnect.mock.calls.length;
        (0, react_1.act)(() => { vitest_1.vi.advanceTimersByTime(10000); });
        (0, vitest_1.expect)(onReconnect.mock.calls.length).toBe(callCount);
    });
    (0, vitest_1.it)('calls onReturnToRefuge and hides overlay', () => {
        const onReturnToRefuge = vitest_1.vi.fn();
        const onReconnect = vitest_1.vi.fn().mockResolvedValue(false);
        const { result } = (0, react_1.renderHook)(() => (0, useReconnection_js_1.useReconnection)({ onReconnect, onReturnToRefuge }));
        (0, react_1.act)(() => { result.current.reportDisconnect(); });
        (0, react_1.act)(() => { result.current.returnToRefuge(); });
        (0, vitest_1.expect)(onReturnToRefuge).toHaveBeenCalledOnce();
        (0, vitest_1.expect)(result.current.overlayState).toBe('hidden');
    });
    (0, vitest_1.it)('reportConnected transitions to reconnected when overlay is visible', () => {
        const onReconnect = vitest_1.vi.fn().mockReturnValue(new Promise(() => { }));
        const { result } = (0, react_1.renderHook)(() => (0, useReconnection_js_1.useReconnection)({ onReconnect }));
        (0, react_1.act)(() => { result.current.reportDisconnect(); });
        (0, vitest_1.expect)(result.current.overlayState).toBe('reconnecting');
        (0, react_1.act)(() => { result.current.reportConnected(); });
        (0, vitest_1.expect)(result.current.overlayState).toBe('reconnected');
    });
    (0, vitest_1.it)('reportConnected does nothing when overlay is hidden', () => {
        const { result } = (0, react_1.renderHook)(() => (0, useReconnection_js_1.useReconnection)({ onReconnect: vitest_1.vi.fn().mockResolvedValue(true) }));
        (0, react_1.act)(() => { result.current.reportConnected(); });
        (0, vitest_1.expect)(result.current.overlayState).toBe('hidden');
    });
    (0, vitest_1.it)('stops at maxAttempts', async () => {
        const onReconnect = vitest_1.vi.fn().mockResolvedValue(false);
        const { result } = (0, react_1.renderHook)(() => (0, useReconnection_js_1.useReconnection)({ onReconnect, maxAttempts: 2, baseDelayMs: 100 }));
        (0, react_1.act)(() => { result.current.reportDisconnect(); });
        // Run through all retry timers
        for (let i = 0; i < 5; i++) {
            await (0, react_1.act)(async () => { await vitest_1.vi.advanceTimersByTimeAsync(5000); });
        }
        (0, vitest_1.expect)(result.current.overlayState).toBe('disconnected');
        // Should have called onReconnect at most maxAttempts times
        (0, vitest_1.expect)(onReconnect.mock.calls.length).toBeLessThanOrEqual(3);
    });
});
//# sourceMappingURL=useReconnection.test.js.map
/**
 * useSettings.test.ts — Tests for the settings sync hook.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { initializeAppStore, resetAppStore } from '../store.js';
import { useSettings } from '../hooks/useSettings.js';
import type { ResolvedSettings } from '../hooks/useSettings.js';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('../services/settings-api.js', () => ({
  fetchUserSettings: vi.fn(),
  updateUserSettings: vi.fn(),
  SettingsApiError: class extends Error {
    status: number;
    constructor(status: number, msg: string) {
      super(msg);
      this.status = status;
      this.name = 'SettingsApiError';
    }
  },
}));

import { fetchUserSettings, updateUserSettings } from '../services/settings-api.js';

const mockFetch = fetchUserSettings as ReturnType<typeof vi.fn>;
const mockUpdate = updateUserSettings as ReturnType<typeof vi.fn>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DEFAULTS: ResolvedSettings = {
  display: { fontSize: 16 },
  narration: { verbosity: 'standard', narrationStyle: 'default' },
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useSettings', () => {
  beforeEach(() => {
    resetAppStore();
    localStorage.clear();
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ config: {} });
    mockUpdate.mockResolvedValue({ config: {} });
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ── Loading from localStorage ────────────────────────────────────────────

  it('loads defaults when localStorage is empty', () => {
    const { result } = renderHook(() => useSettings());
    expect(result.current.settings).toEqual(DEFAULTS);
  });

  it('loads existing values from localStorage on mount', () => {
    localStorage.setItem('ellmud_fontSize', '20');
    localStorage.setItem('ellmud_verbosity', 'verbose');
    localStorage.setItem('ellmud_narrationStyle', 'gothic');

    const { result } = renderHook(() => useSettings());

    expect(result.current.settings.display.fontSize).toBe(20);
    expect(result.current.settings.narration.verbosity).toBe('verbose');
    expect(result.current.settings.narration.narrationStyle).toBe('gothic');
  });

  // ── No API calls when not authenticated ──────────────────────────────────

  it('does not call API when token is null', () => {
    initializeAppStore({ token: null });
    renderHook(() => useSettings());
    expect(mockFetch).not.toHaveBeenCalled();
  });

  // ── Server fetch when authenticated ──────────────────────────────────────

  it('fetches from server when token is available', async () => {
    mockFetch.mockResolvedValueOnce({
      config: {
        display: { fontSize: 22 },
        narration: { verbosity: 'terse', narrationStyle: 'noir' },
      },
    });

    initializeAppStore({ token: 'test-token', authenticated: true });
    const { result } = renderHook(() => useSettings());

    expect(mockFetch).toHaveBeenCalledWith('test-token');

    await waitFor(() => {
      expect(result.current.settings.display.fontSize).toBe(22);
    });
    expect(result.current.settings.narration.verbosity).toBe('terse');
    expect(result.current.settings.narration.narrationStyle).toBe('noir');
    expect(result.current.isSynced).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it('server response overrides localStorage values', async () => {
    localStorage.setItem('ellmud_fontSize', '14');
    localStorage.setItem('ellmud_verbosity', 'verbose');

    mockFetch.mockResolvedValueOnce({
      config: {
        display: { fontSize: 18 },
        narration: { verbosity: 'terse' },
      },
    });

    initializeAppStore({ token: 'tok', authenticated: true });
    const { result } = renderHook(() => useSettings());

    // Initially loads from localStorage
    expect(result.current.settings.display.fontSize).toBe(14);

    // After server response, server wins
    await waitFor(() => {
      expect(result.current.settings.display.fontSize).toBe(18);
    });
    expect(result.current.settings.narration.verbosity).toBe('terse');

    // localStorage should also be updated
    expect(localStorage.getItem('ellmud_fontSize')).toBe('18');
    expect(localStorage.getItem('ellmud_verbosity')).toBe('terse');
  });

  it('partial server response merges with localStorage', async () => {
    localStorage.setItem('ellmud_fontSize', '14');
    localStorage.setItem('ellmud_narrationStyle', 'gothic');

    mockFetch.mockResolvedValueOnce({
      config: {
        display: { fontSize: 20 },
        // narration not included — keep localStorage values
      },
    });

    initializeAppStore({ token: 'tok', authenticated: true });
    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.settings.display.fontSize).toBe(20);
    });
    // narrationStyle should keep the localStorage value
    expect(result.current.settings.narration.narrationStyle).toBe('gothic');
  });

  // ── Graceful fallback ────────────────────────────────────────────────────

  it('falls back to localStorage when server is unreachable', async () => {
    localStorage.setItem('ellmud_fontSize', '14');
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    initializeAppStore({ token: 'tok', authenticated: true });
    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.settings.display.fontSize).toBe(14);
    expect(result.current.isSynced).toBe(false);
  });

  // ── updateSetting ────────────────────────────────────────────────────────

  it('updateSetting updates state and writes to localStorage', () => {
    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.updateSetting('display', 'fontSize', 20);
    });

    expect(result.current.settings.display.fontSize).toBe(20);
    expect(localStorage.getItem('ellmud_fontSize')).toBe('20');
  });

  it('updateSetting sends PUT to server when authenticated', () => {
    initializeAppStore({ token: 'tok', authenticated: true });
    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.updateSetting('narration', 'verbosity', 'terse');
    });

    expect(mockUpdate).toHaveBeenCalledWith('tok', { narration: { verbosity: 'terse' } });
  });

  it('updateSetting does not call PUT when no token', () => {
    initializeAppStore({ token: null });
    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.updateSetting('display', 'fontSize', 18);
    });

    expect(mockUpdate).not.toHaveBeenCalled();
    // But localStorage still updated
    expect(localStorage.getItem('ellmud_fontSize')).toBe('18');
  });

  it('updateSetting handles server error gracefully', async () => {
    mockUpdate.mockRejectedValueOnce(new Error('Server down'));

    initializeAppStore({ token: 'tok', authenticated: true });
    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.updateSetting('display', 'fontSize', 22);
    });

    // UI still updates optimistically
    expect(result.current.settings.display.fontSize).toBe(22);
    expect(localStorage.getItem('ellmud_fontSize')).toBe('22');
  });

  // ── Loading state ────────────────────────────────────────────────────────

  it('isLoading is true while fetching from server', async () => {
    let resolveFetch!: (value: unknown) => void;
    mockFetch.mockReturnValueOnce(new Promise((r) => { resolveFetch = r; }));

    initializeAppStore({ token: 'tok', authenticated: true });
    const { result } = renderHook(() => useSettings());

    // Should be loading
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveFetch({ config: { display: { fontSize: 18 } } });
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSynced).toBe(true);
  });
});

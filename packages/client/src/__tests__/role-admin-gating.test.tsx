/**
 * role-admin-gating.test.tsx — Admin page gating by user role (Issue #373).
 *
 * Design Decisions:
 *   - Player role → redirected/blocked from admin
 *   - Content-dev role → can access admin
 *   - Admin role → can access admin
 *   - No auth → redirected to login
 *   - Both admin and content-dev get full admin page access
 *
 * These tests extend the existing auth-guards.test.tsx pattern.
 * They will fail until Jarlaxle adds role to AppState and the admin
 * route guard checks role in addition to authentication.
 *
 * TDD: Will fail until role-based gating is implemented in routes.tsx.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { useReducer } from 'react';
import { AppContext, appReducer, initialState, type AppState, type AppContextValue } from '../store.js';
import { routes } from '../routes.js';

// ─── Mocks (same pattern as auth-guards.test.tsx) ────────────────────────────

vi.mock('../services/api.js', () => ({
  login: vi.fn(),
  register: vi.fn(),
  fetchSpawnZone: vi.fn().mockResolvedValue({
    target: 'zone:the-refuge',
    zoneSlug: 'the-refuge',
    factionSlug: null,
  }),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

vi.mock('../services/connection.js', () => ({
  connect: vi.fn().mockResolvedValue(undefined),
  switchRoom: vi.fn().mockResolvedValue(undefined),
  sendCommand: vi.fn(),
  sendRawCommand: vi.fn(),
  resetClient: vi.fn(),
}));

vi.mock('../lib/admin-api.js', () => ({
  getAdminToken: vi.fn(() => localStorage.getItem('admin_token')),
  setAdminToken: vi.fn(),
  clearAdminToken: vi.fn(),
  validateAdminToken: vi.fn().mockResolvedValue(undefined),
  adminFetch: vi.fn().mockResolvedValue({}),
  listEntities: vi.fn().mockResolvedValue([]),
  fetchNotifications: vi.fn().mockResolvedValue([]),
  fetchDashboardMetrics: vi.fn().mockResolvedValue({
    serverUptime: 0,
    onlinePlayers: 0,
    totalPlayers: 0,
    activeZones: 0,
    dbStatus: 'connected',
  }),
  ADMIN_AUTH_FAILURE_EVENT: 'admin:auth-failure',
  AdminAPIError: class AdminAPIError extends Error {
    constructor(message: string, public status: number, public details?: unknown) {
      super(message);
      this.name = 'AdminAPIError';
    }
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderWithRouter(
  initialPath: string,
  stateOverrides: Partial<AppState> = {},
) {
  const state = { ...initialState, ...stateOverrides };

  const router = createMemoryRouter(routes, {
    initialEntries: [initialPath],
  });

  function Wrapper() {
    const [currentState, dispatch] = useReducer(appReducer, state);
    const ctxValue: AppContextValue = { state: currentState, dispatch };
    return (
      <AppContext.Provider value={ctxValue}>
        <RouterProvider router={router} />
      </AppContext.Provider>
    );
  }

  return render(<Wrapper />);
}

// ─── Role-Based Admin Page Gating Tests ──────────────────────────────────────

describe('Admin Page Gating by Role (Issue #373)', () => {
  afterEach(() => {
    localStorage.clear();
  });

  // ── No auth → redirected to login ──

  describe('unauthenticated users', () => {
    it('redirects /admin to login when not authenticated', async () => {
      renderWithRouter('/admin');
      await waitFor(() => {
        expect(screen.getByText('ELLMUD')).toBeInTheDocument();
      });
      expect(screen.queryByText('Ellmud Content Admin')).not.toBeInTheDocument();
    });

    it('redirects /admin/creatures to login when not authenticated', async () => {
      renderWithRouter('/admin/creatures');
      await waitFor(() => {
        expect(screen.getByText('ELLMUD')).toBeInTheDocument();
      });
    });
  });

  // ── Player role → blocked from admin ──

  describe('player role (blocked)', () => {
    const playerState: Partial<AppState> = {
      authenticated: true,
      token: 'player-session-token',
      playerId: 'player-1',
      // Jarlaxle will add 'role' to AppState; for now we cast
      ...({ role: 'player' } as Partial<AppState>),
    };

    it('player is blocked from /admin', async () => {
      renderWithRouter('/admin', playerState);
      await waitFor(() => {
        // Player should see either login page or an "access denied" message
        // They should NOT see admin content
        const adminContent = screen.queryByText('Ellmud Content Admin');
        const dashboard = screen.queryByRole('heading', { name: 'Dashboard' });
        expect(adminContent || dashboard).toBeFalsy();
      });
    });

    it('player is blocked from /admin/creatures', async () => {
      renderWithRouter('/admin/creatures', playerState);
      await waitFor(() => {
        expect(screen.queryByText('Ellmud Content Admin')).not.toBeInTheDocument();
      });
    });

    it('player is blocked from /admin/users', async () => {
      renderWithRouter('/admin/users', playerState);
      await waitFor(() => {
        expect(screen.queryByText('Ellmud Content Admin')).not.toBeInTheDocument();
      });
    });

    it('player is blocked from /admin/audit', async () => {
      renderWithRouter('/admin/audit', playerState);
      await waitFor(() => {
        expect(screen.queryByText('Ellmud Content Admin')).not.toBeInTheDocument();
      });
    });
  });

  // ── Content-dev role → can access admin ──

  describe('content-dev role (allowed)', () => {
    const contentDevState: Partial<AppState> = {
      authenticated: true,
      token: 'content-dev-session-token',
      playerId: 'player-2',
      ...({ role: 'content-dev' } as Partial<AppState>),
    };

    it('content-dev can access /admin dashboard', async () => {
      localStorage.setItem('admin_token', 'test-token');
      renderWithRouter('/admin', contentDevState);
      await waitFor(() => {
        // Content-dev should see admin content
        const heading = screen.queryByRole('heading', { name: 'Dashboard' });
        const adminContent = screen.queryByText('Ellmud Content Admin');
        expect(heading || adminContent).toBeTruthy();
      });
    });

    it('content-dev can access /admin/creatures', async () => {
      localStorage.setItem('admin_token', 'test-token');
      renderWithRouter('/admin/creatures', contentDevState);
      await waitFor(() => {
        // Should render admin layout, not be redirected
        expect(screen.queryByText('ELLMUD')).not.toBeInTheDocument();
      });
    });
  });

  // ── Admin role → can access admin ──

  describe('admin role (allowed)', () => {
    const adminState: Partial<AppState> = {
      authenticated: true,
      token: 'admin-session-token',
      playerId: 'player-3',
      ...({ role: 'admin' } as Partial<AppState>),
    };

    it('admin can access /admin dashboard', async () => {
      localStorage.setItem('admin_token', 'test-token');
      renderWithRouter('/admin', adminState);
      await waitFor(() => {
        const heading = screen.queryByRole('heading', { name: 'Dashboard' });
        const adminContent = screen.queryByText('Ellmud Content Admin');
        expect(heading || adminContent).toBeTruthy();
      });
    });

    it('admin can access /admin/users', async () => {
      localStorage.setItem('admin_token', 'test-token');
      renderWithRouter('/admin/users', adminState);
      await waitFor(() => {
        expect(screen.queryByText('ELLMUD')).not.toBeInTheDocument();
      });
    });

    it('admin can access /admin/audit', async () => {
      localStorage.setItem('admin_token', 'test-token');
      renderWithRouter('/admin/audit', adminState);
      await waitFor(() => {
        expect(screen.queryByText('ELLMUD')).not.toBeInTheDocument();
      });
    });

    it('admin can access /admin/deploy', async () => {
      localStorage.setItem('admin_token', 'test-token');
      renderWithRouter('/admin/deploy', adminState);
      await waitFor(() => {
        expect(screen.queryByText('ELLMUD')).not.toBeInTheDocument();
      });
    });
  });
});

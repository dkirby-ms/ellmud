/**
 * admin-token-validation.test.tsx — Tests for admin token validation (Issue #369).
 *
 * Bug: Invalid admin tokens were accepted on input, stored to localStorage,
 * then caused every admin page to break. Fix should reject invalid tokens
 * immediately at the login form and handle stale stored tokens gracefully.
 *
 * Scenarios covered:
 * 1. Invalid token is rejected immediately on input
 * 2. Valid token is accepted and admin content loads
 * 3. Empty/missing token shows appropriate error
 * 4. After rejection, user can re-enter a valid token
 * 5. Stored token that becomes invalid redirects back to login
 * 6. ADMIN_AUTH_FAILURE_EVENT triggers logout from any page
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { initializeAppStore, resetAppStore, type AppState } from '../store.js';
import { routes } from '../routes.js';
import { routes } from '../routes.js';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockSetAdminToken = vi.fn((token: string) => {
  localStorage.setItem('admin_token', token);
});
const mockClearAdminToken = vi.fn(() => {
  localStorage.removeItem('admin_token');
});
const mockGetAdminToken = vi.fn(() => localStorage.getItem('admin_token'));
const mockValidateAdminToken = vi.fn();
const mockFetchNotifications = vi.fn();
const mockListEntities = vi.fn().mockResolvedValue([]);
const mockAdminFetch = vi.fn();
const mockFetchDashboardMetrics = vi.fn().mockResolvedValue({
  serverUptime: 0,
  onlinePlayers: 0,
  totalPlayers: 0,
  activeZones: 0,
  dbStatus: 'connected',
});

vi.mock('../lib/admin-api.js', () => ({
  getAdminToken: (...args: unknown[]) => mockGetAdminToken(...args),
  setAdminToken: (...args: unknown[]) => mockSetAdminToken(...args),
  clearAdminToken: (...args: unknown[]) => mockClearAdminToken(...args),
  validateAdminToken: (...args: unknown[]) => mockValidateAdminToken(...args),
  adminFetch: (...args: unknown[]) => mockAdminFetch(...args),
  listEntities: (...args: unknown[]) => mockListEntities(...args),
  fetchNotifications: (...args: unknown[]) => mockFetchNotifications(...args),
  fetchDashboardMetrics: (...args: unknown[]) => mockFetchDashboardMetrics(...args),
  ADMIN_AUTH_FAILURE_EVENT: 'admin:auth-failure',
  AdminAPIError: class AdminAPIError extends Error {
    status: number;
    details?: unknown;
    constructor(message: string, status: number, details?: unknown) {
      super(message);
      this.name = 'AdminAPIError';
      this.status = status;
      this.details = details;
    }
  },
}));

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

const AUTHED_STATE: Partial<AppState> = {
  authenticated: true,
  token: 'test-jwt-token',
  playerId: 'player-1',
};

function renderAdmin(
  initialPath = '/admin',
  stateOverrides: Partial<AppState> = AUTHED_STATE,
) {
  initializeAppStore(stateOverrides);

  const router = createMemoryRouter(routes, {
    initialEntries: [initialPath],
  });

  return render(<RouterProvider router={router} />);
}

// ─── Setup / Teardown ────────────────────────────────────────────────────────

beforeEach(() => {
  resetAppStore();
  localStorage.clear();
  vi.clearAllMocks();
  mockValidateAdminToken.mockResolvedValue(undefined);
  mockFetchNotifications.mockResolvedValue([]);
});

afterEach(() => {
  localStorage.clear();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Admin Token Validation (Issue #369)', () => {

  describe('empty / missing token', () => {
    it('shows the login form when no token is stored', async () => {
      renderAdmin();
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Admin Token')).toBeInTheDocument();
      });
      expect(screen.getByText('Authenticate')).toBeInTheDocument();
    });

    it('shows error for empty token submission', async () => {
      const user = userEvent.setup();
      renderAdmin();

      await waitFor(() => {
        expect(screen.getByText('Authenticate')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Authenticate'));

      await waitFor(() => {
        expect(screen.getByText('Token is required')).toBeInTheDocument();
      });

      expect(mockSetAdminToken).not.toHaveBeenCalled();
    });

    it('shows error for whitespace-only token submission', async () => {
      const user = userEvent.setup();
      renderAdmin();

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Admin Token')).toBeInTheDocument();
      });

      await user.type(screen.getByPlaceholderText('Admin Token'), '   ');
      await user.click(screen.getByText('Authenticate'));

      await waitFor(() => {
        expect(screen.getByText('Token is required')).toBeInTheDocument();
      });
    });
  });

  describe('invalid token is rejected immediately on input', () => {
    it('rejects invalid token and shows error message', async () => {
      mockValidateAdminToken.mockRejectedValueOnce(
        new Error('HTTP 403: Invalid admin token')
      );

      const user = userEvent.setup();
      renderAdmin();

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Admin Token')).toBeInTheDocument();
      });

      await user.type(screen.getByPlaceholderText('Admin Token'), 'wrong-token');
      await user.click(screen.getByText('Authenticate'));

      await waitFor(() => {
        expect(screen.getByText(/invalid token/i)).toBeInTheDocument();
      });
    });

    it('clears invalid token from localStorage after rejection', async () => {
      mockValidateAdminToken.mockRejectedValueOnce(
        new Error('HTTP 403: Invalid admin token')
      );

      const user = userEvent.setup();
      renderAdmin();

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Admin Token')).toBeInTheDocument();
      });

      await user.type(screen.getByPlaceholderText('Admin Token'), 'bad-token');
      await user.click(screen.getByText('Authenticate'));

      await waitFor(() => {
        expect(screen.getByText(/invalid token/i)).toBeInTheDocument();
      });

      expect(mockClearAdminToken).toHaveBeenCalled();
    });

    it('does NOT show admin content after invalid token', async () => {
      mockValidateAdminToken.mockRejectedValueOnce(
        new Error('HTTP 403: Invalid admin token')
      );

      const user = userEvent.setup();
      renderAdmin();

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Admin Token')).toBeInTheDocument();
      });

      await user.type(screen.getByPlaceholderText('Admin Token'), 'bad-token');
      await user.click(screen.getByText('Authenticate'));

      await waitFor(() => {
        expect(screen.getByText(/invalid token/i)).toBeInTheDocument();
      });

      expect(screen.queryByText(/Ellmud Content Admin/)).not.toBeInTheDocument();
    });
  });

  describe('valid token is accepted', () => {
    it('shows admin content after valid token entry', async () => {
      mockValidateAdminToken.mockResolvedValueOnce(undefined);

      const user = userEvent.setup();
      renderAdmin();

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Admin Token')).toBeInTheDocument();
      });

      await user.type(screen.getByPlaceholderText('Admin Token'), 'correct-admin-token');
      await user.click(screen.getByText('Authenticate'));

      await waitFor(() => {
        expect(screen.getByText(/Ellmud Content Admin/)).toBeInTheDocument();
      });
    });

    it('stores valid token in localStorage', async () => {
      mockValidateAdminToken.mockResolvedValueOnce(undefined);

      const user = userEvent.setup();
      renderAdmin();

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Admin Token')).toBeInTheDocument();
      });

      await user.type(screen.getByPlaceholderText('Admin Token'), 'valid-token');
      await user.click(screen.getByText('Authenticate'));

      await waitFor(() => {
        expect(screen.getByText(/Ellmud Content Admin/)).toBeInTheDocument();
      });

      expect(mockSetAdminToken).toHaveBeenCalledWith('valid-token');
    });

    it('loads admin dashboard when valid token already in localStorage', async () => {
      localStorage.setItem('admin_token', 'stored-valid-token');
      mockValidateAdminToken.mockResolvedValueOnce(undefined);
      renderAdmin();

      await waitFor(() => {
        expect(screen.getByText(/Ellmud Content Admin/)).toBeInTheDocument();
      });

      expect(screen.queryByPlaceholderText('Admin Token')).not.toBeInTheDocument();
    });
  });

  describe('recovery after token rejection', () => {
    it('allows re-entry of valid token after initial rejection', async () => {
      mockValidateAdminToken.mockRejectedValueOnce(
        new Error('HTTP 403: Invalid admin token')
      );
      mockValidateAdminToken.mockResolvedValueOnce(undefined);

      const user = userEvent.setup();
      renderAdmin();

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Admin Token')).toBeInTheDocument();
      });

      await user.type(screen.getByPlaceholderText('Admin Token'), 'wrong-token');
      await user.click(screen.getByText('Authenticate'));

      await waitFor(() => {
        expect(screen.getByText(/invalid token/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Admin Token');
      await user.clear(input);
      await user.type(input, 'correct-token');
      await user.click(screen.getByText('Authenticate'));

      await waitFor(() => {
        expect(screen.getByText(/Ellmud Content Admin/)).toBeInTheDocument();
      });
    });

    it('clears error message when user starts typing new token', async () => {
      mockValidateAdminToken.mockRejectedValueOnce(
        new Error('HTTP 403: Invalid admin token')
      );

      const user = userEvent.setup();
      renderAdmin();

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Admin Token')).toBeInTheDocument();
      });

      await user.type(screen.getByPlaceholderText('Admin Token'), 'bad');
      await user.click(screen.getByText('Authenticate'));

      await waitFor(() => {
        expect(screen.getByText(/invalid token/i)).toBeInTheDocument();
      });

      await user.type(screen.getByPlaceholderText('Admin Token'), 'x');

      await waitFor(() => {
        expect(screen.queryByText(/invalid token/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('stale stored token handling', () => {
    it('shows login form when stored token fails validation on mount', async () => {
      localStorage.setItem('admin_token', 'previously-valid-token');

      mockValidateAdminToken.mockRejectedValueOnce(
        new Error('HTTP 403: Invalid admin token')
      );

      renderAdmin();

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Admin Token')).toBeInTheDocument();
      });

      expect(mockClearAdminToken).toHaveBeenCalled();
    });

    it('shows stale-token-specific error message', async () => {
      localStorage.setItem('admin_token', 'stale-token');

      mockValidateAdminToken.mockRejectedValueOnce(
        new Error('HTTP 403: Invalid admin token')
      );

      renderAdmin();

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Admin Token')).toBeInTheDocument();
      });

      const errorText = screen.getByText(/no longer valid|expired|re-enter/i);
      expect(errorText).toBeInTheDocument();
    });

    it('shows login form when localStorage token is cleared externally', async () => {
      renderAdmin();

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Admin Token')).toBeInTheDocument();
      });

      expect(screen.getByText(/enter admin token/i)).toBeInTheDocument();
    });
  });

  describe('ADMIN_AUTH_FAILURE_EVENT resets to login', () => {
    it('returns to login form when auth failure event fires mid-session', async () => {
      localStorage.setItem('admin_token', 'valid-token');
      mockValidateAdminToken.mockResolvedValueOnce(undefined);

      renderAdmin();

      await waitFor(() => {
        expect(screen.getByText(/Ellmud Content Admin/)).toBeInTheDocument();
      });

      act(() => {
        window.dispatchEvent(new CustomEvent('admin:auth-failure'));
      });

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Admin Token')).toBeInTheDocument();
      });

      expect(mockClearAdminToken).toHaveBeenCalled();
    });

    it('shows session-expired message after auth failure event', async () => {
      localStorage.setItem('admin_token', 'valid-token');
      mockValidateAdminToken.mockResolvedValueOnce(undefined);

      renderAdmin();

      await waitFor(() => {
        expect(screen.getByText(/Ellmud Content Admin/)).toBeInTheDocument();
      });

      act(() => {
        window.dispatchEvent(new CustomEvent('admin:auth-failure'));
      });

      await waitFor(() => {
        expect(screen.getByText(/expired|re-enter/i)).toBeInTheDocument();
      });
    });
  });

  describe('shows validating state for stored tokens', () => {
    it('shows loading indicator while validating stored token', async () => {
      localStorage.setItem('admin_token', 'stored-token');

      let resolveValidation!: () => void;
      mockValidateAdminToken.mockReturnValueOnce(
        new Promise<void>((resolve) => { resolveValidation = resolve; })
      );

      renderAdmin();

      // While validating, should NOT show the login form prematurely
      await waitFor(() => {
        const validating = screen.queryByText(/validating/i);
        const loginForm = screen.queryByPlaceholderText('Admin Token');
        expect(validating || !loginForm).toBeTruthy();
      });

      await act(async () => {
        resolveValidation();
      });

      await waitFor(() => {
        expect(screen.getByText(/Ellmud Content Admin/)).toBeInTheDocument();
      });
    });
  });
});

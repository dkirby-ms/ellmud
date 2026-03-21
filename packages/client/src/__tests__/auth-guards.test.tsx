/**
 * auth-guards.test.tsx — Tests that admin routes require authentication.
 *
 * Validates:
 * - Admin routes redirect to login when no token is present
 * - Admin routes are accessible when authenticated
 * - The ProtectedRoute wrapper is applied to admin routes
 *
 * These are anticipatory tests: they will FAIL until Volo wraps admin
 * routes inside ProtectedRoute (or equivalent auth guard).
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { useReducer } from 'react';
import { AppContext, appReducer, initialState, type AppState, type AppContextValue } from '../store.js';
import { routes } from '../routes.js';

// Mock the api service to prevent real network calls
vi.mock('../services/api.js', () => ({
  login: vi.fn(),
  register: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

// Mock connection service to prevent Colyseus initialization
vi.mock('../services/connection.js', () => ({
  connect: vi.fn().mockResolvedValue(undefined),
  switchRoom: vi.fn().mockResolvedValue(undefined),
  sendCommand: vi.fn(),
  sendRawCommand: vi.fn(),
  resetClient: vi.fn(),
}));

/**
 * Renders routes with AppContext wrapping a memory router.
 * Mirrors the helper in routing.test.tsx.
 */
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

describe('Admin Route Auth Guards', () => {
  describe('unauthenticated users are redirected to login', () => {
    it('redirects /admin to / when not authenticated', async () => {
      renderWithRouter('/admin');
      await waitFor(() => {
        expect(screen.getByText('ELLMUD')).toBeInTheDocument();
      });
      expect(screen.queryByText('Ellmud Content Admin')).not.toBeInTheDocument();
    });

    it('redirects /admin/creatures to / when not authenticated', async () => {
      renderWithRouter('/admin/creatures');
      await waitFor(() => {
        expect(screen.getByText('ELLMUD')).toBeInTheDocument();
      });
    });

    it('redirects /admin/items to / when not authenticated', async () => {
      renderWithRouter('/admin/items');
      await waitFor(() => {
        expect(screen.getByText('ELLMUD')).toBeInTheDocument();
      });
    });

    it('redirects /admin/deploy to / when not authenticated', async () => {
      renderWithRouter('/admin/deploy');
      await waitFor(() => {
        expect(screen.getByText('ELLMUD')).toBeInTheDocument();
      });
    });

    it('redirects /admin/users to / when not authenticated', async () => {
      renderWithRouter('/admin/users');
      await waitFor(() => {
        expect(screen.getByText('ELLMUD')).toBeInTheDocument();
      });
    });

    it('redirects /admin/audit to / when not authenticated', async () => {
      renderWithRouter('/admin/audit');
      await waitFor(() => {
        expect(screen.getByText('ELLMUD')).toBeInTheDocument();
      });
    });
  });

  describe('authenticated users can access admin routes', () => {
    const authedState: Partial<AppState> = {
      authenticated: true,
      token: 'test-jwt-token',
      playerId: 'player-1',
    };

    it('renders admin dashboard at /admin when authenticated', async () => {
      renderWithRouter('/admin', authedState);
      await waitFor(() => {
        // Use heading role to distinguish from sidebar nav link "Dashboard"
        expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
      });
    });

    it('does not show login form at /admin when authenticated', async () => {
      renderWithRouter('/admin', authedState);
      await waitFor(() => {
        expect(screen.queryByLabelText('Username')).not.toBeInTheDocument();
      });
      expect(screen.queryByText('Enter the Refuge')).not.toBeInTheDocument();
    });
  });

  describe('ProtectedRoute wraps admin routes', () => {
    it('admin route tree includes ProtectedRoute as a layout ancestor', () => {
      // After Volo's changes, admin routes should be nested under ProtectedRoute.
      // This can be structured two ways:
      //   1. Admin block moved inside the existing ProtectedRoute children
      //   2. A new ProtectedRoute layout wrapping the admin block
      //
      // Either way, we verify by checking that visiting /admin unauthenticated
      // produces a redirect (behavioral test above), PLUS a structural check:
      // find the route entry whose children include path "admin" or "/admin"
      // and confirm ProtectedRoute is in the ancestry.

      const hasProtectedAdmin = routes.some((route) => {
        // Case 1: admin is a child of a ProtectedRoute layout route
        if ('Component' in route && route.Component?.name === 'ProtectedRoute') {
          return route.children?.some(
            (child) => 'path' in child && (child.path === '/admin' || child.path === 'admin'),
          );
        }
        // Case 2: admin route itself has ProtectedRoute wrapper in its hierarchy
        if ('path' in route && route.path === '/admin') {
          // Check if admin's parent or admin itself uses ProtectedRoute
          // If admin route still sits at top-level, Volo may have added
          // a pathless ProtectedRoute layout wrapping it
          return false;
        }
        return false;
      });

      expect(hasProtectedAdmin).toBe(true);
    });

    it('unauthenticated /admin does not render any admin content', async () => {
      renderWithRouter('/admin');
      await waitFor(() => {
        expect(screen.getByText('ELLMUD')).toBeInTheDocument();
      });
      // No admin sidebar, header, or dashboard content should be visible
      expect(screen.queryByText('Ellmud Content Admin')).not.toBeInTheDocument();
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    });
  });
});

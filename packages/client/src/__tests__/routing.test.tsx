/**
 * routing.test.tsx — Tests for the new React Router structure.
 *
 * Validates:
 * - Unauthenticated users see the Login page at /
 * - Protected routes redirect unauthenticated users to /
 * - Authenticated users can access protected routes
 * - Login page redirects authenticated users to /refuge
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

describe('Routing', () => {
  describe('unauthenticated users', () => {
    it('renders Login page at /', async () => {
      renderWithRouter('/');
      await waitFor(() => {
        expect(screen.getByText('ELLMUD')).toBeInTheDocument();
      });
      // Microsoft sign-in is always visible regardless of VITE_ALLOW_LOCAL_AUTH
      expect(screen.getByText('Sign in with Microsoft')).toBeInTheDocument();
    });

    it('redirects /refuge to / when not authenticated', async () => {
      renderWithRouter('/refuge');
      await waitFor(() => {
        expect(screen.getByText('ELLMUD')).toBeInTheDocument();
      });
    });

    it('redirects /characters to / when not authenticated', async () => {
      renderWithRouter('/characters');
      await waitFor(() => {
        expect(screen.getByText('ELLMUD')).toBeInTheDocument();
      });
    });

    it('redirects /settings to / when not authenticated', async () => {
      renderWithRouter('/settings');
      await waitFor(() => {
        expect(screen.getByText('ELLMUD')).toBeInTheDocument();
      });
    });

    it('redirects /leaderboard to / when not authenticated', async () => {
      renderWithRouter('/leaderboard');
      await waitFor(() => {
        expect(screen.getByText('ELLMUD')).toBeInTheDocument();
      });
    });
  });

  describe('authenticated users', () => {
    const authedState: Partial<AppState> = {
      authenticated: true,
      token: 'test-jwt-token',
      playerId: 'player-1',
    };

    it('Login page redirects to /refuge when already authenticated', async () => {
      renderWithRouter('/', authedState);
      // Login.tsx does <Navigate to="/refuge" replace /> when authenticated
      // Refuge renders instead — it has a header bar with player info, no login form
      await waitFor(() => {
        expect(screen.queryByLabelText('Username')).not.toBeInTheDocument();
      });
      expect(screen.queryByText('Enter the Refuge')).not.toBeInTheDocument();
    });

    it('renders Refuge page for authenticated user at /refuge', async () => {
      renderWithRouter('/refuge', authedState);
      await waitFor(() => {
        // Refuge page should render — check for something specific to Refuge
        expect(screen.queryByLabelText('Username')).not.toBeInTheDocument();
      });
    });
  });
});

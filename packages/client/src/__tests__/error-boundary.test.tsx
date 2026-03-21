/**
 * error-boundary.test.tsx — Tests for route error boundary handling.
 *
 * Validates:
 * - A route error renders the ErrorFallback component (not a white screen)
 * - ErrorFallback shows a "Return to Refuge" link
 * - The link navigates to /refuge
 *
 * These are anticipatory tests: they will FAIL until Volo creates the
 * ErrorFallback component and wires it as errorElement in routes.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { useReducer } from 'react';
import { AppContext, appReducer, initialState, type AppState, type AppContextValue } from '../store.js';
import { ErrorFallback } from '../components/ErrorFallback.js';

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

/** A component that always throws during render — triggers errorElement. */
function CrashingComponent() {
  throw new Error('Test explosion');
}

/**
 * Renders custom routes with AppContext wrapping a memory router.
 */
function renderWithRouter(
  initialPath: string,
  customRoutes: Parameters<typeof createMemoryRouter>[0],
  stateOverrides: Partial<AppState> = {},
) {
  const state = { ...initialState, ...stateOverrides };

  const router = createMemoryRouter(customRoutes, {
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

describe('Error Boundaries', () => {
  describe('ErrorFallback component renders on route crash', () => {
    it('renders ErrorFallback instead of a white screen when a route throws', async () => {
      const testRoutes = [
        {
          path: '/crash',
          Component: CrashingComponent,
          errorElement: <ErrorFallback />,
        },
      ];

      renderWithRouter('/crash', testRoutes);

      await waitFor(() => {
        // The page should have visible content — not an empty/white screen
        expect(document.body.textContent).not.toBe('');
        expect(screen.getByText(/Return to Refuge/i)).toBeInTheDocument();
      });
    });
  });

  describe('ErrorFallback content', () => {
    it('shows a "Return to Refuge" link', async () => {
      const testRoutes = [
        {
          path: '/crash',
          Component: CrashingComponent,
          errorElement: <ErrorFallback />,
        },
      ];

      renderWithRouter('/crash', testRoutes);

      await waitFor(() => {
        const link = screen.getByText(/Return to Refuge/i);
        expect(link).toBeInTheDocument();
      });
    });

    it('"Return to Refuge" link points to /refuge', async () => {
      const testRoutes = [
        {
          path: '/crash',
          Component: CrashingComponent,
          errorElement: <ErrorFallback />,
        },
      ];

      renderWithRouter('/crash', testRoutes);

      await waitFor(() => {
        const link = screen.getByText(/Return to Refuge/i).closest('a');
        expect(link).toHaveAttribute('href', '/refuge');
      });
    });
  });

  describe('ErrorFallback navigation', () => {
    it('"Return to Refuge" link navigates to /refuge via href', async () => {
      const testRoutes = [
        {
          path: '/crash',
          Component: CrashingComponent,
          errorElement: <ErrorFallback />,
        },
      ];

      renderWithRouter('/crash', testRoutes);

      await waitFor(() => {
        const link = screen.getByText(/Return to Refuge/i);
        expect(link).toBeInTheDocument();
        // ErrorFallback uses a standard <a> for full page navigation out of the
        // error state — verify href points to /refuge
        expect(link.closest('a')).toHaveAttribute('href', '/refuge');
        expect(link.tagName).toBe('A');
      });
    });
  });
});

"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const react_1 = require("@testing-library/react");
const react_router_1 = require("react-router");
const react_2 = require("react");
const store_js_1 = require("../store.js");
const ErrorFallback_js_1 = require("../components/ErrorFallback.js");
// Mock the api service to prevent real network calls
vitest_1.vi.mock('../services/api.js', () => ({
    login: vitest_1.vi.fn(),
    register: vitest_1.vi.fn(),
    ApiError: class ApiError extends Error {
        status;
        constructor(message, status) {
            super(message);
            this.status = status;
        }
    },
}));
// Mock connection service to prevent Colyseus initialization
vitest_1.vi.mock('../services/connection.js', () => ({
    connect: vitest_1.vi.fn().mockResolvedValue(undefined),
    switchRoom: vitest_1.vi.fn().mockResolvedValue(undefined),
    sendCommand: vitest_1.vi.fn(),
    sendRawCommand: vitest_1.vi.fn(),
    resetClient: vitest_1.vi.fn(),
}));
/** A component that always throws during render — triggers errorElement. */
function CrashingComponent() {
    throw new Error('Test explosion');
}
/**
 * Renders custom routes with AppContext wrapping a memory router.
 */
function renderWithRouter(initialPath, customRoutes, stateOverrides = {}) {
    const state = { ...store_js_1.initialState, ...stateOverrides };
    const router = (0, react_router_1.createMemoryRouter)(customRoutes, {
        initialEntries: [initialPath],
    });
    function Wrapper() {
        const [currentState, dispatch] = (0, react_2.useReducer)(store_js_1.appReducer, state);
        const ctxValue = { state: currentState, dispatch };
        return (<store_js_1.AppContext.Provider value={ctxValue}>
        <react_router_1.RouterProvider router={router}/>
      </store_js_1.AppContext.Provider>);
    }
    return (0, react_1.render)(<Wrapper />);
}
(0, vitest_1.describe)('Error Boundaries', () => {
    (0, vitest_1.describe)('ErrorFallback component renders on route crash', () => {
        (0, vitest_1.it)('renders ErrorFallback instead of a white screen when a route throws', async () => {
            const testRoutes = [
                {
                    path: '/crash',
                    Component: CrashingComponent,
                    errorElement: <ErrorFallback_js_1.ErrorFallback />,
                },
            ];
            renderWithRouter('/crash', testRoutes);
            await (0, react_1.waitFor)(() => {
                // The page should have visible content — not an empty/white screen
                (0, vitest_1.expect)(document.body.textContent).not.toBe('');
                (0, vitest_1.expect)(react_1.screen.getByText(/Return to Refuge/i)).toBeInTheDocument();
            });
        });
    });
    (0, vitest_1.describe)('ErrorFallback content', () => {
        (0, vitest_1.it)('shows a "Return to Refuge" link', async () => {
            const testRoutes = [
                {
                    path: '/crash',
                    Component: CrashingComponent,
                    errorElement: <ErrorFallback_js_1.ErrorFallback />,
                },
            ];
            renderWithRouter('/crash', testRoutes);
            await (0, react_1.waitFor)(() => {
                const link = react_1.screen.getByText(/Return to Refuge/i);
                (0, vitest_1.expect)(link).toBeInTheDocument();
            });
        });
        (0, vitest_1.it)('"Return to Refuge" link points to /refuge', async () => {
            const testRoutes = [
                {
                    path: '/crash',
                    Component: CrashingComponent,
                    errorElement: <ErrorFallback_js_1.ErrorFallback />,
                },
            ];
            renderWithRouter('/crash', testRoutes);
            await (0, react_1.waitFor)(() => {
                const link = react_1.screen.getByText(/Return to Refuge/i).closest('a');
                (0, vitest_1.expect)(link).toHaveAttribute('href', '/refuge');
            });
        });
    });
    (0, vitest_1.describe)('ErrorFallback navigation', () => {
        (0, vitest_1.it)('"Return to Refuge" link navigates to /refuge via href', async () => {
            const testRoutes = [
                {
                    path: '/crash',
                    Component: CrashingComponent,
                    errorElement: <ErrorFallback_js_1.ErrorFallback />,
                },
            ];
            renderWithRouter('/crash', testRoutes);
            await (0, react_1.waitFor)(() => {
                const link = react_1.screen.getByText(/Return to Refuge/i);
                (0, vitest_1.expect)(link).toBeInTheDocument();
                // ErrorFallback uses a standard <a> for full page navigation out of the
                // error state — verify href points to /refuge
                (0, vitest_1.expect)(link.closest('a')).toHaveAttribute('href', '/refuge');
                (0, vitest_1.expect)(link.tagName).toBe('A');
            });
        });
    });
});
//# sourceMappingURL=error-boundary.test.js.map
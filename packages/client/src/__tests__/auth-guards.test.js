"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const react_1 = require("@testing-library/react");
const react_router_1 = require("react-router");
const react_2 = require("react");
const store_js_1 = require("../store.js");
const routes_js_1 = require("../routes.js");
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
/**
 * Renders routes with AppContext wrapping a memory router.
 * Mirrors the helper in routing.test.tsx.
 */
function renderWithRouter(initialPath, stateOverrides = {}) {
    const state = { ...store_js_1.initialState, ...stateOverrides };
    const router = (0, react_router_1.createMemoryRouter)(routes_js_1.routes, {
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
(0, vitest_1.describe)('Admin Route Auth Guards', () => {
    (0, vitest_1.describe)('unauthenticated users are redirected to login', () => {
        (0, vitest_1.it)('redirects /admin to / when not authenticated', async () => {
            renderWithRouter('/admin');
            await (0, react_1.waitFor)(() => {
                (0, vitest_1.expect)(react_1.screen.getByText('ELLMUD')).toBeInTheDocument();
            });
            (0, vitest_1.expect)(react_1.screen.queryByText('Ellmud Content Admin')).not.toBeInTheDocument();
        });
        (0, vitest_1.it)('redirects /admin/creatures to / when not authenticated', async () => {
            renderWithRouter('/admin/creatures');
            await (0, react_1.waitFor)(() => {
                (0, vitest_1.expect)(react_1.screen.getByText('ELLMUD')).toBeInTheDocument();
            });
        });
        (0, vitest_1.it)('redirects /admin/items to / when not authenticated', async () => {
            renderWithRouter('/admin/items');
            await (0, react_1.waitFor)(() => {
                (0, vitest_1.expect)(react_1.screen.getByText('ELLMUD')).toBeInTheDocument();
            });
        });
        (0, vitest_1.it)('redirects /admin/deploy to / when not authenticated', async () => {
            renderWithRouter('/admin/deploy');
            await (0, react_1.waitFor)(() => {
                (0, vitest_1.expect)(react_1.screen.getByText('ELLMUD')).toBeInTheDocument();
            });
        });
        (0, vitest_1.it)('redirects /admin/users to / when not authenticated', async () => {
            renderWithRouter('/admin/users');
            await (0, react_1.waitFor)(() => {
                (0, vitest_1.expect)(react_1.screen.getByText('ELLMUD')).toBeInTheDocument();
            });
        });
        (0, vitest_1.it)('redirects /admin/audit to / when not authenticated', async () => {
            renderWithRouter('/admin/audit');
            await (0, react_1.waitFor)(() => {
                (0, vitest_1.expect)(react_1.screen.getByText('ELLMUD')).toBeInTheDocument();
            });
        });
    });
    (0, vitest_1.describe)('authenticated users can access admin routes', () => {
        const authedState = {
            authenticated: true,
            token: 'test-jwt-token',
            playerId: 'player-1',
        };
        (0, vitest_1.it)('renders admin dashboard at /admin when authenticated', async () => {
            renderWithRouter('/admin', authedState);
            await (0, react_1.waitFor)(() => {
                // Use heading role to distinguish from sidebar nav link "Dashboard"
                (0, vitest_1.expect)(react_1.screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
            });
        });
        (0, vitest_1.it)('does not show login form at /admin when authenticated', async () => {
            renderWithRouter('/admin', authedState);
            await (0, react_1.waitFor)(() => {
                (0, vitest_1.expect)(react_1.screen.queryByLabelText('Username')).not.toBeInTheDocument();
            });
            (0, vitest_1.expect)(react_1.screen.queryByText('Enter the Refuge')).not.toBeInTheDocument();
        });
    });
    (0, vitest_1.describe)('ProtectedRoute wraps admin routes', () => {
        (0, vitest_1.it)('admin route tree includes ProtectedRoute as a layout ancestor', () => {
            // After Volo's changes, admin routes should be nested under ProtectedRoute.
            // This can be structured two ways:
            //   1. Admin block moved inside the existing ProtectedRoute children
            //   2. A new ProtectedRoute layout wrapping the admin block
            //
            // Either way, we verify by checking that visiting /admin unauthenticated
            // produces a redirect (behavioral test above), PLUS a structural check:
            // find the route entry whose children include path "admin" or "/admin"
            // and confirm ProtectedRoute is in the ancestry.
            const hasProtectedAdmin = routes_js_1.routes.some((route) => {
                // Case 1: admin is a child of a ProtectedRoute layout route
                if ('Component' in route && route.Component?.name === 'ProtectedRoute') {
                    return route.children?.some((child) => 'path' in child && (child.path === '/admin' || child.path === 'admin'));
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
            (0, vitest_1.expect)(hasProtectedAdmin).toBe(true);
        });
        (0, vitest_1.it)('unauthenticated /admin does not render any admin content', async () => {
            renderWithRouter('/admin');
            await (0, react_1.waitFor)(() => {
                (0, vitest_1.expect)(react_1.screen.getByText('ELLMUD')).toBeInTheDocument();
            });
            // No admin sidebar, header, or dashboard content should be visible
            (0, vitest_1.expect)(react_1.screen.queryByText('Ellmud Content Admin')).not.toBeInTheDocument();
            (0, vitest_1.expect)(react_1.screen.queryByText('Dashboard')).not.toBeInTheDocument();
        });
    });
});
//# sourceMappingURL=auth-guards.test.js.map
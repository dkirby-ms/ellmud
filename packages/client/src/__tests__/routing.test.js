"use strict";
/**
 * routing.test.tsx — Tests for the new React Router structure.
 *
 * Validates:
 * - Unauthenticated users see the Login page at /
 * - Protected routes redirect unauthenticated users to /
 * - Authenticated users can access protected routes
 * - Login page redirects authenticated users to /refuge
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
(0, vitest_1.describe)('Routing', () => {
    (0, vitest_1.describe)('unauthenticated users', () => {
        (0, vitest_1.it)('renders Login page at /', async () => {
            renderWithRouter('/');
            await (0, react_1.waitFor)(() => {
                (0, vitest_1.expect)(react_1.screen.getByText('ELLMUD')).toBeInTheDocument();
            });
            (0, vitest_1.expect)(react_1.screen.getByLabelText('Username')).toBeInTheDocument();
            (0, vitest_1.expect)(react_1.screen.getByLabelText('Password')).toBeInTheDocument();
        });
        (0, vitest_1.it)('shows Login and Register tabs', async () => {
            renderWithRouter('/');
            await (0, react_1.waitFor)(() => {
                (0, vitest_1.expect)(react_1.screen.getByText('Login')).toBeInTheDocument();
            });
            (0, vitest_1.expect)(react_1.screen.getByText('Register')).toBeInTheDocument();
        });
        (0, vitest_1.it)('shows "Enter the Refuge" submit button', async () => {
            renderWithRouter('/');
            await (0, react_1.waitFor)(() => {
                (0, vitest_1.expect)(react_1.screen.getByText('Enter the Refuge')).toBeInTheDocument();
            });
        });
        (0, vitest_1.it)('redirects /refuge to / when not authenticated', async () => {
            renderWithRouter('/refuge');
            await (0, react_1.waitFor)(() => {
                (0, vitest_1.expect)(react_1.screen.getByText('ELLMUD')).toBeInTheDocument();
            });
        });
        (0, vitest_1.it)('redirects /characters to / when not authenticated', async () => {
            renderWithRouter('/characters');
            await (0, react_1.waitFor)(() => {
                (0, vitest_1.expect)(react_1.screen.getByText('ELLMUD')).toBeInTheDocument();
            });
        });
        (0, vitest_1.it)('redirects /settings to / when not authenticated', async () => {
            renderWithRouter('/settings');
            await (0, react_1.waitFor)(() => {
                (0, vitest_1.expect)(react_1.screen.getByText('ELLMUD')).toBeInTheDocument();
            });
        });
        (0, vitest_1.it)('redirects /leaderboard to / when not authenticated', async () => {
            renderWithRouter('/leaderboard');
            await (0, react_1.waitFor)(() => {
                (0, vitest_1.expect)(react_1.screen.getByText('ELLMUD')).toBeInTheDocument();
            });
        });
    });
    (0, vitest_1.describe)('authenticated users', () => {
        const authedState = {
            authenticated: true,
            token: 'test-jwt-token',
            playerId: 'player-1',
        };
        (0, vitest_1.it)('Login page redirects to /refuge when already authenticated', async () => {
            renderWithRouter('/', authedState);
            // Login.tsx does <Navigate to="/refuge" replace /> when authenticated
            // Refuge renders instead — it has a header bar with player info, no login form
            await (0, react_1.waitFor)(() => {
                (0, vitest_1.expect)(react_1.screen.queryByLabelText('Username')).not.toBeInTheDocument();
            });
            (0, vitest_1.expect)(react_1.screen.queryByText('Enter the Refuge')).not.toBeInTheDocument();
        });
        (0, vitest_1.it)('renders Refuge page for authenticated user at /refuge', async () => {
            renderWithRouter('/refuge', authedState);
            await (0, react_1.waitFor)(() => {
                // Refuge page should render — check for something specific to Refuge
                (0, vitest_1.expect)(react_1.screen.queryByLabelText('Username')).not.toBeInTheDocument();
            });
        });
    });
});
//# sourceMappingURL=routing.test.js.map
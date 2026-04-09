import { useReducer, useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes.js';
import { Toaster } from 'sonner';
import { AppContext, appReducer, initialState } from './store.js';
import type { AppState } from './store.js';
import { onAuthError, validateToken, fetchMe } from './services/api.js';
import { isValidRole } from '@ellmud/shared';

const TOKEN_KEY = 'ellmud_token';
const PLAYER_KEY = 'ellmud_playerId';
const USERNAME_KEY = 'ellmud_username';

function loadPersistedState(): AppState {
  const token = localStorage.getItem(TOKEN_KEY);
  const playerId = localStorage.getItem(PLAYER_KEY);
  const username = localStorage.getItem(USERNAME_KEY);
  if (token && playerId) {
    return { ...initialState, authenticated: true, token, playerId, username };
  }
  return initialState;
}

export function App(): React.JSX.Element {
  const [state, dispatch] = useReducer(appReducer, null as never, loadPersistedState);

  // Register global 401 interceptor — any API call that gets a 401
  // automatically clears auth state so stale tokens don't linger.
  useEffect(() => {
    onAuthError(() => dispatch({ type: 'LOGOUT' }));
  }, [dispatch]);

  // Validate persisted token on mount (non-blocking).
  // If the server rejects it with 401, clear auth immediately.
  // Also fetch username from /auth/me if missing (for existing sessions).
  useEffect(() => {
    if (state.authenticated && state.token) {
      validateToken(state.token).then((valid) => {
        if (!valid) dispatch({ type: 'LOGOUT' });
      });
      
      // Fetch username and role if missing
      if (state.token) {
        fetchMe(state.token).then((data) => {
          const role = data.role && isValidRole(data.role) ? data.role : 'player';
          dispatch({ type: 'LOGIN_SUCCESS', token: state.token!, playerId: data.playerId, username: data.username, role });
        }).catch(() => {
          // Ignore errors - username/role fetch is non-blocking
        });
      }
    }
  }, []); // Only on initial mount

  // Sync auth state to localStorage
  useEffect(() => {
    if (state.authenticated && state.token && state.playerId) {
      localStorage.setItem(TOKEN_KEY, state.token);
      localStorage.setItem(PLAYER_KEY, state.playerId);
      if (state.username) {
        localStorage.setItem(USERNAME_KEY, state.username);
      }
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(PLAYER_KEY);
      localStorage.removeItem(USERNAME_KEY);
    }
  }, [state.authenticated, state.token, state.playerId, state.username]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      <RouterProvider router={router} />
      <Toaster />
    </AppContext.Provider>
  );
}

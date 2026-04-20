import { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes.js';
import { Toaster } from 'sonner';
import { useAppStore } from './store.js';
import { onAuthError, validateToken, fetchMe } from './services/api.js';
import { isValidRole } from '@ellmud/shared';
import { shallow } from 'zustand/shallow';

const TOKEN_KEY = 'ellmud_token';
const PLAYER_KEY = 'ellmud_playerId';
const USERNAME_KEY = 'ellmud_username';

function loadPersistedAuth(): void {
  const token = localStorage.getItem(TOKEN_KEY);
  const playerId = localStorage.getItem(PLAYER_KEY);
  const username = localStorage.getItem(USERNAME_KEY);
  if (token && playerId) {
    useAppStore.setState({ authenticated: true, token, playerId, username });
  }
}

// Restore persisted auth on module load (before first render)
loadPersistedAuth();

// Sync auth slice to localStorage whenever it changes
useAppStore.subscribe(
  (state) => ({ authenticated: state.authenticated, token: state.token, playerId: state.playerId, username: state.username }),
  (authSlice) => {
    if (authSlice.authenticated && authSlice.token && authSlice.playerId) {
      localStorage.setItem(TOKEN_KEY, authSlice.token);
      localStorage.setItem(PLAYER_KEY, authSlice.playerId);
      if (authSlice.username) {
        localStorage.setItem(USERNAME_KEY, authSlice.username);
      }
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(PLAYER_KEY);
      localStorage.removeItem(USERNAME_KEY);
    }
  },
  { equalityFn: shallow },
);

export function App(): React.JSX.Element {
  const dispatch = useAppStore((s) => s.dispatch);

  // Register global 401 interceptor — any API call that gets a 401
  // automatically clears auth state so stale tokens don't linger.
  useEffect(() => {
    onAuthError(() => dispatch({ type: 'LOGOUT' }));
  }, [dispatch]);

  // Suppress the browser right-click menu across the entire app.
  useEffect(() => {
    const suppress = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', suppress);
    return () => document.removeEventListener('contextmenu', suppress);
  }, []);

  // Validate persisted token on mount (non-blocking).
  useEffect(() => {
    const { authenticated, token } = useAppStore.getState();
    if (authenticated && token) {
      validateToken(token).then((valid) => {
        if (!valid) dispatch({ type: 'LOGOUT' });
      });
      
      fetchMe(token).then((data) => {
        const role = data.role && isValidRole(data.role) ? data.role : 'player';
        dispatch({ type: 'LOGIN_SUCCESS', token: token, playerId: data.playerId, username: data.username, role });
      }).catch(() => {
        // Ignore errors - username/role fetch is non-blocking
      });
    }
  }, []); // Only on initial mount

  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}

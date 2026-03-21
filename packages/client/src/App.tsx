import { useReducer, useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes.js';
import { Toaster } from 'sonner';
import { AppContext, appReducer, initialState } from './store.js';
import type { AppState } from './store.js';

const TOKEN_KEY = 'ellmud_token';
const PLAYER_KEY = 'ellmud_playerId';

function loadPersistedState(): AppState {
  const token = localStorage.getItem(TOKEN_KEY);
  const playerId = localStorage.getItem(PLAYER_KEY);
  if (token && playerId) {
    return { ...initialState, authenticated: true, token, playerId };
  }
  return initialState;
}

export function App(): React.JSX.Element {
  const [state, dispatch] = useReducer(appReducer, null as never, loadPersistedState);

  // Sync auth state to localStorage
  useEffect(() => {
    if (state.authenticated && state.token && state.playerId) {
      localStorage.setItem(TOKEN_KEY, state.token);
      localStorage.setItem(PLAYER_KEY, state.playerId);
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(PLAYER_KEY);
    }
  }, [state.authenticated, state.token, state.playerId]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      <RouterProvider router={router} />
      <Toaster />
    </AppContext.Provider>
  );
}

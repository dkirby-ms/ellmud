import { useEffect, useRef } from 'react';
import { login, register } from '../services/api.js';
import { useAppContext } from '../store.js';

/**
 * Dev mode auto-login hook.
 * When running in Vite dev mode, automatically logs in with dev credentials.
 * Ensures the dev user exists (registers if needed), then logs in.
 * On failure (server not running), silently continues to AuthScreen.
 */
export function useDevAutoLogin(): void {
  const { state, dispatch } = useAppContext();
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (!import.meta.env.DEV || state.authenticated || attemptedRef.current) {
      return;
    }

    attemptedRef.current = true;

    (async () => {
      try {
        // Try register first (ignore 409 duplicate), then login
        await register('dev', 'devdev').catch((err) => {
          // Ignore duplicate username error, we'll just login next
          if (err.status !== 409) throw err;
        });

        const result = await login('dev', 'devdev');
        dispatch({ type: 'LOGIN_SUCCESS', token: result.token, playerId: result.playerId });
      } catch {
        // Server not running or other failure — fall back to AuthScreen
      }
    })();
  }, [state.authenticated, dispatch]);
}

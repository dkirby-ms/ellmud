import { useEffect, useRef } from 'react';
import { login, register } from '../services/api.js';
import { useAppContext } from '../store.js';

/**
 * Dev mode auto-login hook — OPT-IN only.
 * Set VITE_DEV_AUTO_LOGIN=true in your .env to enable automatic login
 * with dev/devdev credentials. Disabled by default so that auth is
 * exercised during local development.
 * Skipped when VITE_ALLOW_LOCAL_AUTH is "false" (OAuth-only mode).
 * On failure (server not running), silently continues to AuthScreen.
 */
export function useDevAutoLogin(): void {
  const { state, dispatch } = useAppContext();
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (
      import.meta.env.VITE_DEV_AUTO_LOGIN !== 'true' ||
      import.meta.env.VITE_ALLOW_LOCAL_AUTH === 'false' ||
      state.authenticated ||
      attemptedRef.current
    ) {
      return;
    }

    attemptedRef.current = true;

    (async () => {
      try {
        // Try login first — avoids noisy 409 on register when user exists
        let result;
        try {
          result = await login('dev', 'devdev');
        } catch {
          // Login failed — user may not exist yet, try registering
          result = await register('dev', 'devdev');
        }
        dispatch({ type: 'LOGIN_SUCCESS', token: result.token, playerId: result.playerId, email: result.email });
      } catch {
        // Server not running or other failure — fall back to AuthScreen
      }
    })();
  }, [state.authenticated, dispatch]);
}

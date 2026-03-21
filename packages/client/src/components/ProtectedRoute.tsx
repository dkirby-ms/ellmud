import { Navigate, Outlet } from 'react-router';
import { useAppContext } from '../store.js';

/**
 * Layout route that redirects unauthenticated users to login.
 * Wrap any route that requires auth with this as a parent.
 */
export function ProtectedRoute() {
  const { state } = useAppContext();

  if (!state.authenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

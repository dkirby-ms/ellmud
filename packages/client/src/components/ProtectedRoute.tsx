import { Navigate, Outlet } from 'react-router';
import { useAuthStore } from '../store/auth.js';

/**
 * Layout route that redirects unauthenticated users to login.
 * Wrap any route that requires auth with this as a parent.
 */
export function ProtectedRoute() {
  const authenticated = useAuthStore(s => s.authenticated);

  if (!authenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

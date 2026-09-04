import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

/**
 * ProtectedRoute — wraps role-specific route groups.
 *
 * Props:
 *   role     – the required role to access this route ('technician' | 'foreman' | 'supervisor')
 *   children – the layout / page to render if authorized
 *
 * Behavior:
 *   - Not authenticated → redirect to /login
 *   - Authenticated but wrong role → redirect to /login
 *   - Authorized → render children
 */
export default function ProtectedRoute({ role, children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userRole = useAuthStore((s) => s.role);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (userRole !== role) {
    // User is logged in but doesn't have access to this role section
    return <Navigate to={`/${userRole}/home`} replace />;
  }

  return children;
}

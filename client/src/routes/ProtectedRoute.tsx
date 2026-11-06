import { Navigate, Outlet } from 'react-router';
import { FullPageLoader } from '../components/common/FullPageLoader';
import { useAuth } from '../hooks/useAuth';

const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please log in again.';

/**
 * Only logged-in users get through; everyone else is sent to /login. If the user was logged
 * out because their session expired, the login page is given a short message to show.
 */
export function ProtectedRoute() {
  const { user, isLoading, sessionExpired } = useAuth();

  if (isLoading) return <FullPageLoader />;
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={sessionExpired ? { message: SESSION_EXPIRED_MESSAGE } : undefined}
      />
    );
  }
  return <Outlet />;
}

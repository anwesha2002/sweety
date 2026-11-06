import { Navigate, Outlet } from 'react-router';
import { FullPageLoader } from '../components/common/FullPageLoader';
import { useAuth } from '../hooks/useAuth';

/** For /login and /register: logged-in users are sent to the dashboard instead. */
export function GuestRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <FullPageLoader />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

import { Outlet } from 'react-router';
import { AuthProvider } from '../context/AuthProvider';

/** Top route: gives every page access to the auth state (the provider needs the router). */
export function RootRoute() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

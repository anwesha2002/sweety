import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { setUnauthorizedHandler } from '../services/api';
import * as authService from '../services/auth.service';
import type { User } from '../types/user';
import { AuthContext, type AuthContextValue } from './AuthContext';

/**
 * Holds the logged-in user. The JWT lives in an HttpOnly cookie that the browser manages,
 * so nothing sensitive is kept in JavaScript or localStorage; the user comes from GET /auth/me.
 *
 * When the server rejects the session (any non-auth request answering 401) the user is cleared
 * and `sessionExpired` is set; ProtectedRoute then sends them to /login with a message.
 *
 * The app keeps no copy of server data outside the pages that show it, so logging out leaves
 * nothing behind for the next person using the same browser.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  // On load, ask the server who is logged in (null = nobody; a failed request counts as that too).
  useEffect(() => {
    let ignore = false;
    authService
      .getCurrentUser()
      .then((currentUser) => {
        if (!ignore) setUser(currentUser);
      })
      .catch(() => {
        // Treated as logged out; the login page shows the real error on the next attempt.
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  // Any API call (other than /auth/*) that answers 401 means the session is gone.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setSessionExpired(true);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    function startSession(loggedInUser: User) {
      setSessionExpired(false);
      setUser(loggedInUser);
    }

    return {
      user,
      isLoading,
      sessionExpired,
      login: async (input) => startSession(await authService.login(input)),
      register: async (input) => startSession(await authService.register(input)),
      logout: async () => {
        try {
          await authService.logout();
        } finally {
          setUser(null);
        }
      },
    };
  }, [user, isLoading, sessionExpired]);

  return <AuthContext value={value}>{children}</AuthContext>;
}

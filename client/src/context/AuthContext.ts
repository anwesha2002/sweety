import { createContext } from 'react';
import type { LoginInput, RegisterInput } from '../services/auth.service';
import type { User } from '../types/user';

export interface AuthContextValue {
  /** The logged-in user, or null when logged out (or while loading). */
  user: User | null;
  /** True while the app is checking /auth/me for an existing session. */
  isLoading: boolean;
  /** True when the user was logged out because the server rejected their session (a 401). */
  sessionExpired: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

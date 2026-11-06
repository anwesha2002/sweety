import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { AuthContext, type AuthContextValue } from '../context/AuthContext';

const loggedInUser: AuthContextValue = {
  user: { id: 'user-1', name: 'Asha Rao', email: 'asha@example.com', createdAt: '2026-01-01' },
  isLoading: false,
  sessionExpired: false,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
};

/** Renders a component with a logged-in user, like the real app. */
export function renderWithProviders(ui: ReactElement) {
  return render(<AuthContext value={loggedInUser}>{ui}</AuthContext>);
}

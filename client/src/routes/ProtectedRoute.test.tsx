import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import { AuthContext, type AuthContextValue } from '../context/AuthContext';
import { ProtectedRoute } from './ProtectedRoute';

const baseContext: AuthContextValue = {
  user: null,
  isLoading: false,
  sessionExpired: false,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
};

const asha = { id: 'u1', name: 'Asha Rao', email: 'asha@example.com', createdAt: '2026-01-01' };

/** The login page stand-in shows the message the router was given. */
function LoginStandIn() {
  const location = useLocation();
  const message = (location.state as { message?: string } | null)?.message;
  return <p data-testid="login">{message ?? 'no message'}</p>;
}

function renderAt(context: Partial<AuthContextValue>) {
  return render(
    <AuthContext value={{ ...baseContext, ...context }}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/login" element={<LoginStandIn />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<p>secret page</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext>,
  );
}

describe('ProtectedRoute', () => {
  it('shows a loader while the session is being checked', () => {
    renderAt({ isLoading: true });

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('secret page')).not.toBeInTheDocument();
  });

  it('lets a logged-in user through', () => {
    renderAt({ user: asha });

    expect(screen.getByText('secret page')).toBeInTheDocument();
  });

  it('sends a logged-out user to /login without a message', () => {
    renderAt({ user: null });

    expect(screen.getByTestId('login')).toHaveTextContent('no message');
    expect(screen.queryByText('secret page')).not.toBeInTheDocument();
  });

  it('sends a user whose session expired to /login with a message', () => {
    renderAt({ user: null, sessionExpired: true });

    expect(screen.getByTestId('login')).toHaveTextContent(
      'Your session has expired. Please log in again.',
    );
  });
});

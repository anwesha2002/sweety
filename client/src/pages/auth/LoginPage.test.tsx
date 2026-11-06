import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext, type AuthContextValue } from '../../context/AuthContext';
import { LoginPage } from './LoginPage';

const authStub: AuthContextValue = {
  user: null,
  isLoading: false,
  sessionExpired: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
};

describe('LoginPage', () => {
  it('shows validation errors when the form is submitted empty', async () => {
    render(
      <AuthContext value={authStub}>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </AuthContext>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Enter your email.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
    expect(authStub.login).not.toHaveBeenCalled();
  });
});

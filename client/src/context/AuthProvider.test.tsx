import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../hooks/useAuth';
import { setUnauthorizedHandler } from '../services/api';
import { getCurrentUser, login, logout } from '../services/auth.service';
import type { User } from '../types/user';
import { AuthProvider } from './AuthProvider';

vi.mock('../services/auth.service', () => ({
  getCurrentUser: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}));
vi.mock('../services/api', () => ({ setUnauthorizedHandler: vi.fn() }));

const asha: User = {
  id: 'u1',
  name: 'Asha Rao',
  email: 'asha@example.com',
  createdAt: '2026-01-01',
};

/** Shows what the auth context says. */
function Probe() {
  const { user, isLoading, sessionExpired, login: logIn, logout: logOut } = useAuth();
  return (
    <div>
      <p data-testid="status">
        {isLoading ? 'loading' : user ? `user:${user.name}` : 'logged-out'}
      </p>
      <p data-testid="expired">{String(sessionExpired)}</p>
      <button onClick={() => void logIn({ email: 'asha@example.com', password: 'password123' })}>
        log in
      </button>
      {/* A failed logout request is rethrown by the provider; a real caller would handle it. */}
      <button onClick={() => logOut().catch(() => undefined)}>log out</button>
    </div>
  );
}

function renderProvider() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
}

const status = () => screen.getByTestId('status').textContent;
const expired = () => screen.getByTestId('expired').textContent;

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockReset();
    vi.mocked(login).mockReset();
    vi.mocked(logout).mockReset();
    vi.mocked(setUnauthorizedHandler).mockReset();
  });

  it('is loading first, then has the user the server reports', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(asha);

    renderProvider();

    expect(status()).toBe('loading');
    await waitFor(() => expect(status()).toBe('user:Asha Rao'));
  });

  it('is logged out when the server says nobody is logged in', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    renderProvider();

    await waitFor(() => expect(status()).toBe('logged-out'));
    expect(expired()).toBe('false');
  });

  it('treats a failed session check as logged out and stops loading', async () => {
    vi.mocked(getCurrentUser).mockRejectedValue(new Error('network down'));

    renderProvider();

    await waitFor(() => expect(status()).toBe('logged-out'));
  });

  it('login stores the user, logout clears it', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    vi.mocked(login).mockResolvedValue(asha);
    vi.mocked(logout).mockResolvedValue();
    renderProvider();
    await waitFor(() => expect(status()).toBe('logged-out'));

    await userEvent.click(screen.getByRole('button', { name: 'log in' }));
    await waitFor(() => expect(status()).toBe('user:Asha Rao'));

    await userEvent.click(screen.getByRole('button', { name: 'log out' }));
    await waitFor(() => expect(status()).toBe('logged-out'));
    expect(expired()).toBe('false'); // a normal logout is not an expired session
  });

  it('logs out locally even if the logout request fails', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(asha);
    vi.mocked(logout).mockRejectedValue(new Error('network down'));
    renderProvider();
    await waitFor(() => expect(status()).toBe('user:Asha Rao'));

    await userEvent.click(screen.getByRole('button', { name: 'log out' }));

    await waitFor(() => expect(status()).toBe('logged-out'));
  });

  it('clears the user and flags an expired session when the API answers 401', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(asha);
    renderProvider();
    await waitFor(() => expect(status()).toBe('user:Asha Rao'));

    // The API layer calls this handler when any non-auth request answers 401.
    const onUnauthorized = vi.mocked(setUnauthorizedHandler).mock.calls.at(-1)?.[0];
    expect(onUnauthorized).toBeTypeOf('function');
    act(() => onUnauthorized?.());

    await waitFor(() => expect(status()).toBe('logged-out'));
    expect(expired()).toBe('true');
  });

  it('forgets the expired flag after logging in again', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(asha);
    vi.mocked(login).mockResolvedValue(asha);
    renderProvider();
    await waitFor(() => expect(status()).toBe('user:Asha Rao'));
    act(() => vi.mocked(setUnauthorizedHandler).mock.calls.at(-1)?.[0]?.());
    await waitFor(() => expect(expired()).toBe('true'));

    await userEvent.click(screen.getByRole('button', { name: 'log in' }));

    await waitFor(() => expect(status()).toBe('user:Asha Rao'));
    expect(expired()).toBe('false');
  });
});

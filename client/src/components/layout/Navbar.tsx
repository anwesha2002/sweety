import { LogOut, Menu } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getInitials } from '../../utils/format';
import { Button } from '../common/Button';

interface NavbarProps {
  /** Opens the sidebar drawer on small screens. */
  onMenuClick: () => void;
}

export function Navbar({ onMenuClick }: NavbarProps) {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    // Once the session is cleared, ProtectedRoute sends the user to /login.
    await logout();
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open menu"
        aria-controls="app-sidebar"
        className="rounded-md p-2 text-slate-600 hover:text-slate-900 lg:hidden"
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>

      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="flex size-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-800"
          >
            {user ? getInitials(user.name) : ''}
          </span>
          <span className="hidden max-w-40 truncate text-sm font-medium text-slate-700 sm:block">
            {user?.name}
          </span>
        </div>
        <Button variant="secondary" onClick={handleLogout} isLoading={isLoggingOut}>
          {!isLoggingOut && <LogOut className="size-4" aria-hidden="true" />}
          Log out
        </Button>
      </div>
    </header>
  );
}

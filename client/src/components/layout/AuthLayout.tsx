import type { ReactNode } from 'react';
import { Logo } from '../common/Logo';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Link to the other auth page, shown under the card. */
  footer: ReactNode;
}

/** Centered card used by the login and register pages. */
export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Logo />
      <div className="mt-6 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
      <p className="mt-6 text-sm text-slate-600">{footer}</p>
    </main>
  );
}

import type { ReactNode } from 'react';

type Tone = 'error' | 'info';

const TONE_STYLES: Record<Tone, string> = {
  error: 'border-red-200 bg-red-50 text-red-800',
  info: 'border-emerald-200 bg-emerald-50 text-emerald-900',
};

/** A short message box for form-level errors or notices. Announced to screen readers. */
export function Alert({ tone = 'error', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <div role="alert" className={`rounded-lg border px-3 py-2.5 text-sm ${TONE_STYLES[tone]}`}>
      {children}
    </div>
  );
}

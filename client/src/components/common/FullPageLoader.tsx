import { LoaderCircle } from 'lucide-react';

export function FullPageLoader() {
  return (
    <div role="status" className="flex min-h-screen items-center justify-center text-slate-500">
      <LoaderCircle className="size-6 animate-spin" aria-hidden="true" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

import { Droplet } from 'lucide-react';

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900">
      <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-700 text-white">
        <Droplet className="size-4" aria-hidden="true" />
      </span>
      Sweety
    </span>
  );
}

interface StatCardProps {
  label: string;
  /** Leave undefined when there is no data: the card then shows "—" and the empty hint. */
  value?: number | string | null;
  unit?: string;
  emptyHint?: string;
}

export function StatCard({ label, value, unit, emptyHint = 'No readings yet' }: StatCardProps) {
  const hasValue = value !== undefined && value !== null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">
        {hasValue ? value : '—'}
        {hasValue && unit && (
          <span className="ml-1 text-sm font-normal text-slate-500">{unit}</span>
        )}
      </p>
      {!hasValue && <p className="mt-1 text-xs text-slate-500">{emptyHint}</p>}
    </div>
  );
}

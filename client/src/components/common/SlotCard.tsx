interface SlotCardProps {
  label: string;
  /** Leave undefined when no reading is recorded for this slot. */
  value?: number | null;
  unit?: string;
  /** Shows "Loading…" instead of "No reading recorded" while the data is on its way. */
  isLoading?: boolean;
}

export function SlotCard({ label, value, unit = 'mg/dl', isLoading = false }: SlotCardProps) {
  const hasValue = value !== undefined && value !== null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-medium text-slate-700">{label}</p>
      {hasValue ? (
        <p className="mt-2 text-xl font-semibold text-slate-900">
          {value}
          <span className="ml-1 text-sm font-normal text-slate-500">{unit}</span>
        </p>
      ) : (
        <p className="mt-2 text-sm text-slate-500">
          {isLoading ? 'Loading…' : 'No reading recorded'}
        </p>
      )}
    </div>
  );
}

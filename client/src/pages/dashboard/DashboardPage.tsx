import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Alert } from '../../components/common/Alert';
import { Button } from '../../components/common/Button';
import { SlotCard } from '../../components/common/SlotCard';
import { StatCard } from '../../components/common/StatCard';
import { ReadingDialog } from '../../components/readings/ReadingDialog';
import { GLUCOSE_UNIT } from '../../constants/glucose';
import { SLOT_LABELS, SLOT_ORDER } from '../../constants/slots';
import { useAuth } from '../../hooks/useAuth';
import { useDailyReport, useMonthToDateReport } from '../../hooks/useReports';
import { toLocalDateString } from '../../utils/date';
import { formatLongDate, getFirstName } from '../../utils/format';

export function DashboardPage() {
  const { user } = useAuth();
  const [adding, setAdding] = useState(false);

  // The dashboard reuses the report endpoints: today's readings for the slot cards and the
  // month-to-date summary for the stat cards. Both are loaded again after a reading is added.
  const today = toLocalDateString(new Date());
  const todayReport = useDailyReport(today);
  const monthReport = useMonthToDateReport(today);

  const month = monthReport.data?.summary;
  // With no readings this month the stat cards stay on their "—" empty state.
  const stats = month && month.count > 0 ? month : undefined;
  const statHint = monthReport.isError
    ? 'Could not load'
    : monthReport.isLoading
      ? 'Loading…'
      : 'No readings yet';

  const valueBySlot = new Map(todayReport.data?.readings.map((r) => [r.slot, r.value]));

  function reload() {
    todayReport.refetch();
    monthReport.refetch();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Welcome{user ? `, ${getFirstName(user.name)}` : ''}
          </h1>
          <p className="mt-1 text-sm text-slate-600">{formatLongDate(new Date())}</p>
        </div>
        <Button onClick={() => setAdding(true)}>
          <Plus className="size-4" aria-hidden="true" />
          Add reading
        </Button>
      </div>

      {(todayReport.isError || monthReport.isError) && (
        <div className="space-y-3">
          <Alert>Could not load your readings.</Alert>
          <Button variant="secondary" onClick={reload}>
            Try again
          </Button>
        </div>
      )}

      <section aria-labelledby="overview-heading">
        <h2 id="overview-heading" className="mb-3 text-sm font-semibold text-slate-700">
          This month so far
        </h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Highest"
            value={stats?.highest}
            unit={GLUCOSE_UNIT}
            emptyHint={statHint}
          />
          <StatCard label="Lowest" value={stats?.lowest} unit={GLUCOSE_UNIT} emptyHint={statHint} />
          <StatCard
            label="Average"
            value={stats?.average}
            unit={GLUCOSE_UNIT}
            emptyHint={statHint}
          />
          <StatCard label="Total readings" value={stats?.count} emptyHint={statHint} />
        </div>
      </section>

      <section aria-labelledby="today-heading">
        <h2 id="today-heading" className="mb-3 text-sm font-semibold text-slate-700">
          Today&apos;s readings
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SLOT_ORDER.map((slot) => (
            <SlotCard
              key={slot}
              label={SLOT_LABELS[slot]}
              value={valueBySlot.get(slot)}
              isLoading={todayReport.isLoading}
            />
          ))}
        </div>
      </section>

      <ReadingDialog open={adding} onClose={() => setAdding(false)} onSaved={reload} />
    </div>
  );
}

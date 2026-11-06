import { useState } from 'react';
import { TextField } from '../../components/common/TextField';
import { ReportCard } from '../../components/reports/ReportCard';
import { TrendCard } from '../../components/reports/TrendCard';
import { GLUCOSE_UNIT } from '../../constants/glucose';
import { useDailyReport, useMonthlyReport, useMonthToDateReport } from '../../hooks/useReports';
import {
  formatDateRange,
  formatDisplayDate,
  formatMonthLabel,
  toLocalDateString,
} from '../../utils/date';

export function ReportsPage() {
  const today = toLocalDateString(new Date());
  const [date, setDate] = useState(today);

  // A cleared date input gives '': skip the requests and ask for a date instead.
  const hasDate = date !== '';
  const daily = useDailyReport(date, { enabled: hasDate });
  const monthToDate = useMonthToDateReport(date, { enabled: hasDate });
  const monthly = useMonthlyReport(date, { enabled: hasDate });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>

      <TextField
        label="Report date"
        type="date"
        max={today}
        value={date}
        onChange={(event) => setDate(event.target.value)}
        className="sm:w-56"
      />

      {!hasDate ? (
        <p className="text-sm text-slate-600">Choose a date to see your reports.</p>
      ) : (
        <div className="space-y-6">
          <ReportCard
            title="Daily"
            subtitle={formatDisplayDate(date)}
            summary={daily.data?.summary}
            isLoading={daily.isLoading}
            isError={daily.isError}
            onRetry={daily.refetch}
          >
            <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
              {daily.data?.readings.map((reading) => (
                <li
                  key={reading.slot}
                  className="flex items-center justify-between px-4 py-2.5 text-sm"
                >
                  <span className="text-slate-700">{reading.label}</span>
                  <span className="font-medium text-slate-900">
                    {reading.value} {GLUCOSE_UNIT}
                  </span>
                </li>
              ))}
            </ul>
          </ReportCard>

          <ReportCard
            title="Month to date"
            subtitle={
              monthToDate.data && formatDateRange(monthToDate.data.from, monthToDate.data.to)
            }
            summary={monthToDate.data?.summary}
            isLoading={monthToDate.isLoading}
            isError={monthToDate.isError}
            onRetry={monthToDate.refetch}
          />

          <ReportCard
            title="Previous month"
            subtitle={monthly.data && formatMonthLabel(monthly.data.month)}
            summary={monthly.data?.summary}
            isLoading={monthly.isLoading}
            isError={monthly.isError}
            onRetry={monthly.refetch}
          />
        </div>
      )}

      {/* Has its own period controls (day, month or date range), independent of the date above. */}
      <TrendCard />
    </div>
  );
}

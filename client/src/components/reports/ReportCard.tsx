import { useId, type ReactNode } from 'react';
import { GLUCOSE_UNIT } from '../../constants/glucose';
import type { ReportSummary } from '../../types/report';
import { Alert } from '../common/Alert';
import { Button } from '../common/Button';
import { StatCard } from '../common/StatCard';

interface ReportCardProps {
  title: string; // "Daily", "Month to date", "Previous month"
  subtitle?: string; // the period this card covers, e.g. "4 Nov 2026"
  summary: ReportSummary | undefined;
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  /** Extra content shown under the numbers when there are readings (e.g. the day's list). */
  children?: ReactNode;
}

/** Highest, lowest, average and count for one period, with a friendly empty state. */
export function ReportCard({
  title,
  subtitle,
  summary,
  isLoading,
  isError = false,
  onRetry,
  children,
}: ReportCardProps) {
  const headingId = useId();
  const hasReadings = summary !== undefined && summary.count > 0;

  return (
    <section
      aria-labelledby={headingId}
      className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5"
    >
      <div>
        <h2 id={headingId} className="text-base font-semibold text-slate-900">
          {title}
        </h2>
        {subtitle && <p className="text-sm text-slate-600">{subtitle}</p>}
      </div>

      {isLoading && (
        <p role="status" className="text-sm text-slate-600">
          Loading…
        </p>
      )}

      {isError && (
        <div className="space-y-3">
          <Alert>Could not load this report.</Alert>
          {onRetry && (
            <Button variant="secondary" onClick={onRetry}>
              Try again
            </Button>
          )}
        </div>
      )}

      {summary && !hasReadings && (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-600">
          No readings for this period.
        </p>
      )}

      {summary && hasReadings && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Highest" value={summary.highest} unit={GLUCOSE_UNIT} />
            <StatCard label="Lowest" value={summary.lowest} unit={GLUCOSE_UNIT} />
            <StatCard label="Average" value={summary.average} unit={GLUCOSE_UNIT} />
            <StatCard label="Readings" value={summary.count} />
          </div>
          {children}
        </>
      )}
    </section>
  );
}

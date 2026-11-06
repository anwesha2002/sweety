import { useId, useState } from 'react';
import { GLUCOSE_UNIT } from '../../constants/glucose';
import { SLOT_ORDER, SLOT_SHORT_LABELS } from '../../constants/slots';
import { useDailyReport, useTrendReport } from '../../hooks/useReports';
import { makeDateTicks } from '../../utils/chart';
import {
  daysBetween,
  formatDateRange,
  formatDisplayDate,
  formatMonthLabel,
  formatShortDate,
  lastDayOfMonth,
  shiftDate,
  toLocalDateString,
} from '../../utils/date';
import { LineChart, type ChartPoint, type ChartTick } from '../charts/LineChart';
import { Alert } from '../common/Alert';
import { Button } from '../common/Button';
import { TextField } from '../common/TextField';

type Span = 'day' | 'month' | 'range';

const SPANS: { value: Span; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'month', label: 'Month' },
  { value: 'range', label: 'Date range' },
];

// Mirrors MAX_TREND_DAYS on the server: the longest range, counting both end dates.
const MAX_RANGE_DAYS = 366;

/** What is wrong with a date range, or null when it can be charted. */
function rangeProblem(from: string, to: string): string | null {
  if (from === '' || to === '') return 'Choose a start date and an end date.';
  if (from > to) return 'End date must be on or after the start date.';
  if (daysBetween(from, to) >= MAX_RANGE_DAYS) return 'Choose a range of one year or less.';
  return null;
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

/**
 * A line chart of the user's glucose for a chosen period:
 * - Day: each reading of that day, left to right through the day;
 * - Month or date range: the average of each day's readings.
 */
export function TrendCard() {
  const headingId = useId();
  const today = toLocalDateString(new Date());

  const [span, setSpan] = useState<Span>('month');
  const [day, setDay] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [from, setFrom] = useState(shiftDate(today, -29)); // the last 30 days
  const [to, setTo] = useState(today);

  // The period behind the Month and Date range options, when it can be charted.
  const rangeIssue = rangeProblem(from, to);
  const period =
    span === 'month' && month !== ''
      ? { from: `${month}-01`, to: lastDayOfMonth(month) }
      : span === 'range' && rangeIssue === null
        ? { from, to }
        : null;

  const daily = useDailyReport(day, { enabled: span === 'day' && day !== '' });
  const trend = useTrendReport(period?.from ?? '', period?.to ?? '', { enabled: period !== null });
  const active = span === 'day' ? daily : trend;

  // What to draw.
  let points: ChartPoint[] = [];
  let xTicks: ChartTick[] = [];
  let xDomain: [number, number] = [0, 1];
  let ariaLabel = '';
  let caption = '';

  if (span === 'day' && daily.data) {
    points = daily.data.readings.map((reading) => ({
      x: SLOT_ORDER.indexOf(reading.slot),
      y: reading.value,
      title: `${reading.label}: ${reading.value} ${GLUCOSE_UNIT}`,
    }));
    xTicks = SLOT_ORDER.map((slot, index) => ({ x: index, label: SLOT_SHORT_LABELS[slot] }));
    xDomain = [0, SLOT_ORDER.length - 1];
    ariaLabel = `Glucose readings on ${formatDisplayDate(day)}, by time of day`;
    caption = `Each reading on ${formatDisplayDate(day)}`;
  } else if (span !== 'day' && trend.data) {
    const { from: start, to: end } = trend.data;
    points = trend.data.points.map((point) => ({
      x: daysBetween(start, point.date),
      y: point.average,
      title: `${formatDisplayDate(point.date)}: ${point.average} ${GLUCOSE_UNIT} (${plural(point.count, 'reading')})`,
    }));
    xTicks = makeDateTicks(start, end).map((tick) => ({
      x: tick.x,
      label: formatShortDate(tick.date),
    }));
    xDomain = [0, daysBetween(start, end)];
    ariaLabel = `Average glucose for each day from ${formatDateRange(start, end)}`;
    caption = `Daily averages for ${span === 'month' ? formatMonthLabel(month) : formatDateRange(start, end)} · ${plural(points.length, 'day')} with readings`;
  }

  // Message shown instead of the chart when there is nothing to draw yet.
  let notice: string | null = null;
  if (span === 'day' && day === '') notice = 'Choose a date.';
  else if (span === 'month' && month === '') notice = 'Choose a month.';
  else if (span === 'range' && rangeIssue !== null && (from === '' || to === ''))
    notice = rangeIssue;

  return (
    <section
      aria-labelledby={headingId}
      className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id={headingId} className="text-base font-semibold text-slate-900">
            Glucose trend
          </h2>
          <p className="text-sm text-slate-600">
            {span === 'day'
              ? 'Your readings through the day'
              : 'The average of each day’s readings'}{' '}
            ({GLUCOSE_UNIT})
          </p>
        </div>

        <div
          role="group"
          aria-label="Chart period"
          className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5"
        >
          {SPANS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={span === option.value}
              onClick={() => setSpan(option.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                span === option.value
                  ? 'bg-emerald-700 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-4">
        {span === 'day' && (
          <TextField
            label="Date"
            type="date"
            max={today}
            value={day}
            onChange={(event) => setDay(event.target.value)}
          />
        )}
        {span === 'month' && (
          <TextField
            label="Month"
            type="month"
            max={today.slice(0, 7)}
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          />
        )}
        {span === 'range' && (
          <>
            <TextField
              label="From"
              type="date"
              max={today}
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
            <TextField
              label="To"
              type="date"
              max={today}
              value={to}
              onChange={(event) => setTo(event.target.value)}
              error={from !== '' && to !== '' ? (rangeIssue ?? undefined) : undefined}
            />
          </>
        )}
      </div>

      {notice && <p className="text-sm text-slate-600">{notice}</p>}

      {active.isLoading && (
        <p role="status" className="text-sm text-slate-600">
          Loading…
        </p>
      )}

      {active.isError && (
        <div className="space-y-3">
          <Alert>Could not load the chart.</Alert>
          <Button variant="secondary" onClick={active.refetch}>
            Try again
          </Button>
        </div>
      )}

      {active.data &&
        (points.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-600">
            No readings in this period.
          </p>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <LineChart
              points={points}
              xTicks={xTicks}
              xDomain={xDomain}
              yUnit={GLUCOSE_UNIT}
              ariaLabel={ariaLabel}
            />
            <p className="mt-2 text-center text-xs text-slate-500">{caption}</p>
          </div>
        ))}
    </section>
  );
}

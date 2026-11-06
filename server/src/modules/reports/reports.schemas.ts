import { z } from 'zod';
import type { ReadingSlot } from '../../constants/readings.js';
import { daysBetween, isValidDateString } from '../../utils/date.js';

const DATE_INVALID = 'Enter a valid date.';

const dateField = z.string({ error: DATE_INVALID }).refine(isValidDateString, DATE_INVALID);

/** All three reports take the selected date (the client sends its local date). */
export const reportQuerySchema = z.object({
  date: dateField,
});

export type ReportQuery = z.infer<typeof reportQuerySchema>;

/** The longest span the trend chart accepts, counting both end dates. */
export const MAX_TREND_DAYS = 366;

/** The range checks below only make sense once both dates are real dates. */
function bothValid(query: { from: string; to: string }): boolean {
  return isValidDateString(query.from) && isValidDateString(query.to);
}

export const trendQuerySchema = z
  .object({
    from: dateField,
    to: dateField,
  })
  .refine((query) => !bothValid(query) || query.from <= query.to, {
    path: ['to'],
    message: 'End date must be on or after the start date.',
  })
  .refine(
    (query) =>
      !bothValid(query) ||
      query.from > query.to ||
      daysBetween(query.from, query.to) < MAX_TREND_DAYS,
    { path: ['to'], message: 'Choose a range of one year or less.' },
  );

export type TrendQuery = z.infer<typeof trendQuerySchema>;

/** With no readings in the period, count is 0 and the other fields are null. */
export interface ReportSummary {
  highest: number | null;
  lowest: number | null;
  average: number | null; // rounded to 1 decimal
  count: number;
}

export interface DailyReport {
  date: string;
  summary: ReportSummary;
  readings: { slot: ReadingSlot; label: string; value: number }[];
}

export interface MonthToDateReport {
  from: string;
  to: string;
  summary: ReportSummary;
}

export interface MonthlyReport {
  month: string; // YYYY-MM
  from: string;
  to: string;
  summary: ReportSummary;
}

/** One point of the trend chart: the average of all readings on one day. */
export interface TrendPoint {
  date: string; // YYYY-MM-DD
  average: number; // rounded to 1 decimal
  count: number; // readings that day
}

/** Daily averages from `from` to `to`. Days without readings are left out. */
export interface TrendReport {
  from: string;
  to: string;
  points: TrendPoint[];
}

import { z } from 'zod';
import type { ReadingSlot } from '../../constants/readings.js';
import { isValidDateString } from '../../utils/date.js';

const DATE_INVALID = 'Enter a valid date.';

/** All three reports take the selected date (the client sends its local date). */
export const reportQuerySchema = z.object({
  date: z.string({ error: DATE_INVALID }).refine(isValidDateString, DATE_INVALID),
});

export type ReportQuery = z.infer<typeof reportQuerySchema>;

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

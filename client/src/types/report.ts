import type { ReadingSlot } from './reading';

/** With no readings in the period, `count` is 0 and the other fields are null. */
export interface ReportSummary {
  highest: number | null;
  lowest: number | null;
  average: number | null; // rounded to 1 decimal by the server
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

/** One chart point: the average of all readings on one day. */
export interface TrendPoint {
  date: string; // YYYY-MM-DD
  average: number; // rounded to 1 decimal by the server
  count: number; // readings that day
}

/** Daily averages from `from` to `to`. Days without readings are left out. */
export interface TrendReport {
  from: string;
  to: string;
  points: TrendPoint[];
}

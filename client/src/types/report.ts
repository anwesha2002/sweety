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

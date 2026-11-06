import { SLOT_LABELS } from '../../constants/readings.js';
import { previousMonthRange, startOfMonth } from '../../utils/date.js';
import * as reportsRepository from './reports.repository.js';
import type { ReadingsAggregate } from './reports.repository.js';
import type {
  DailyReport,
  MonthlyReport,
  MonthToDateReport,
  ReportSummary,
} from './reports.schemas.js';

/** The one place that turns database numbers into a summary: all three reports use it. */
export function buildSummary(aggregate: ReadingsAggregate): ReportSummary {
  if (aggregate.count === 0 || aggregate.avg === null) {
    return { highest: null, lowest: null, average: null, count: 0 };
  }

  return {
    highest: aggregate.max,
    lowest: aggregate.min,
    average: Math.round(aggregate.avg * 10) / 10, // 1 decimal
    count: aggregate.count,
  };
}

export async function getDailyReport(userId: string, date: string): Promise<DailyReport> {
  const [aggregate, readings] = await Promise.all([
    reportsRepository.summarizeReadings(userId, date, date),
    reportsRepository.listReadingsOnDate(userId, date),
  ]);

  return {
    date,
    summary: buildSummary(aggregate),
    readings: readings.map((reading) => ({
      slot: reading.slot,
      label: SLOT_LABELS[reading.slot],
      value: reading.value,
    })),
  };
}

/** From the 1st of the month to the selected date, inclusive. */
export async function getMonthToDateReport(
  userId: string,
  date: string,
): Promise<MonthToDateReport> {
  const from = startOfMonth(date);
  const aggregate = await reportsRepository.summarizeReadings(userId, from, date);

  return { from, to: date, summary: buildSummary(aggregate) };
}

/** The whole calendar month before the month of the selected date. */
export async function getMonthlyReport(userId: string, date: string): Promise<MonthlyReport> {
  const { month, from, to } = previousMonthRange(date);
  const aggregate = await reportsRepository.summarizeReadings(userId, from, to);

  return { month, from, to, summary: buildSummary(aggregate) };
}

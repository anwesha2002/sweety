import { SLOT_LABELS } from '../../constants/readings.js';
import { previousMonthRange, startOfMonth } from '../../utils/date.js';
import * as reportsRepository from './reports.repository.js';
import type { ReadingsAggregate } from './reports.repository.js';
import type {
  DailyReport,
  MonthlyReport,
  MonthToDateReport,
  ReportSummary,
  TrendReport,
} from './reports.schemas.js';

/** Averages are shown with 1 decimal everywhere. */
function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

/** The one place that turns database numbers into a summary: all three reports use it. */
export function buildSummary(aggregate: ReadingsAggregate): ReportSummary {
  if (aggregate.count === 0 || aggregate.avg === null) {
    return { highest: null, lowest: null, average: null, count: 0 };
  }

  return {
    highest: aggregate.max,
    lowest: aggregate.min,
    average: roundToOneDecimal(aggregate.avg),
    count: aggregate.count,
  };
}

/** The average of each day's readings from `from` to `to`, for the trend chart. */
export async function getTrendReport(
  userId: string,
  from: string,
  to: string,
): Promise<TrendReport> {
  const days = await reportsRepository.averagesByDay(userId, from, to);

  return {
    from,
    to,
    points: days.map((day) => ({
      date: day.date,
      average: roundToOneDecimal(day.avg),
      count: day.count,
    })),
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

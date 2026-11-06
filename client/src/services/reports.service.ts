import type { ApiSuccess } from '../types/api';
import type { DailyReport, MonthlyReport, MonthToDateReport, TrendReport } from '../types/report';
import { api } from './api';

// `date` is the selected day as YYYY-MM-DD in the user's local time (see utils/date.ts).

export async function getDailyReport(date: string): Promise<DailyReport> {
  const { data } = await api.get<ApiSuccess<DailyReport>>('/reports/daily', { params: { date } });
  return data.data;
}

export async function getMonthToDateReport(date: string): Promise<MonthToDateReport> {
  const { data } = await api.get<ApiSuccess<MonthToDateReport>>('/reports/month-to-date', {
    params: { date },
  });
  return data.data;
}

export async function getMonthlyReport(date: string): Promise<MonthlyReport> {
  const { data } = await api.get<ApiSuccess<MonthlyReport>>('/reports/monthly', {
    params: { date },
  });
  return data.data;
}

/** The average of each day's readings from `from` to `to` (both YYYY-MM-DD), for the chart. */
export async function getTrendReport(from: string, to: string): Promise<TrendReport> {
  const { data } = await api.get<ApiSuccess<TrendReport>>('/reports/trend', {
    params: { from, to },
  });
  return data.data;
}

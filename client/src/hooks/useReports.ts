import { useCallback } from 'react';
import {
  getDailyReport,
  getMonthlyReport,
  getMonthToDateReport,
} from '../services/reports.service';
import { useAsyncData } from './useAsyncData';

interface ReportOptions {
  /** Pass `false` to skip the request, e.g. while no date is chosen. */
  enabled?: boolean;
}

// Choosing another `date` fetches that date's report. Call `refetch()` after readings change.

export function useDailyReport(date: string, options: ReportOptions = {}) {
  const load = useCallback(() => getDailyReport(date), [date]);
  return useAsyncData(load, { enabled: options.enabled });
}

export function useMonthToDateReport(date: string, options: ReportOptions = {}) {
  const load = useCallback(() => getMonthToDateReport(date), [date]);
  return useAsyncData(load, { enabled: options.enabled });
}

export function useMonthlyReport(date: string, options: ReportOptions = {}) {
  const load = useCallback(() => getMonthlyReport(date), [date]);
  return useAsyncData(load, { enabled: options.enabled });
}

import { toLocalDateString } from '../utils/date';

/** Test helper: the local date `days` days after (or before, if negative) `from`, as YYYY-MM-DD. */
export function addLocalDays(from: Date, days: number): string {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() + days);
  return toLocalDateString(date);
}

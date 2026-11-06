// Dates cross the API as "YYYY-MM-DD" strings. On the client a date always means a calendar day
// in the user's LOCAL time zone, so these helpers use local date parts.
// Never use toISOString() for this: it converts to UTC and can show the wrong day.

/** A Date -> "YYYY-MM-DD" using the local year, month and day. */
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** "2026-11-04" -> a Date at local midnight of that day (not UTC, unlike new Date("2026-11-04")). */
export function parseDateString(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
}

const MILLISECONDS_PER_DAY = 86_400_000;

/**
 * A calendar date as a whole number of days (counted from 1970-01-01). Date arithmetic goes
 * through UTC so daylight-saving changes can never make a day 23 or 25 hours long.
 */
function toDayNumber(value: string): number {
  const [year, month, day] = value.split('-').map(Number);
  return Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1) / MILLISECONDS_PER_DAY;
}

/** Days from one date to another: ("2026-11-01", "2026-11-04") -> 3. */
export function daysBetween(from: string, to: string): number {
  return toDayNumber(to) - toDayNumber(from);
}

/** The date `days` days after (or before, if negative) `value`: ("2026-11-30", 1) -> "2026-12-01". */
export function shiftDate(value: string, days: number): string {
  const shifted = new Date((toDayNumber(value) + days) * MILLISECONDS_PER_DAY);
  const month = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const day = String(shifted.getUTCDate()).padStart(2, '0');
  return `${shifted.getUTCFullYear()}-${month}-${day}`;
}

/** "2026-02" -> "2026-02-28" (the last day of that month). */
export function lastDayOfMonth(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  // Day 0 of the next month is the last day of this one.
  const lastDay = new Date(Date.UTC(year ?? 0, monthNumber ?? 1, 0)).getUTCDate();
  return `${month}-${String(lastDay).padStart(2, '0')}`;
}

/** "2026-11-04" -> "4 Nov" (short form for chart axes) */
export function formatShortDate(value: string): string {
  return parseDateString(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** "2026-11-04" -> "4 Nov 2026" */
export function formatDisplayDate(value: string): string {
  return parseDateString(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** "2026-11-01", "2026-11-04" -> "1 Nov 2026 – 4 Nov 2026" */
export function formatDateRange(from: string, to: string): string {
  return `${formatDisplayDate(from)} – ${formatDisplayDate(to)}`;
}

/** "2026-10" -> "October 2026" */
export function formatMonthLabel(month: string): string {
  return parseDateString(`${month}-01`).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });
}

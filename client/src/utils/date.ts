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

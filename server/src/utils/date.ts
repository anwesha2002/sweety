// Date convention: a calendar date always travels as a "YYYY-MM-DD" string: in the API, in the
// database layer (date columns are used in "string" mode) and in these helpers. When one of
// them needs date arithmetic it goes through a Date at UTC midnight, and always in UTC, so
// local time zones can never shift a day (the classic off-by-one-day bug).

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True for a real calendar date written as YYYY-MM-DD (rejects "2025-02-30"). */
export function isValidDateString(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return date.toISOString().slice(0, 10) === value;
}

/** "2025-03-09" -> Date at 2025-03-09T00:00:00.000Z. Throws for an invalid date string. */
export function parseUtcDate(value: string): Date {
  if (!isValidDateString(value)) {
    throw new Error(`Invalid date string: ${value}`);
  }
  return new Date(`${value}T00:00:00.000Z`);
}

/** A Date -> its UTC calendar day as "YYYY-MM-DD". */
export function formatUtcDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/** Today's date in UTC as "YYYY-MM-DD". `now` can be passed in for tests. */
export function todayString(now: Date = new Date()): string {
  return formatUtcDate(now);
}

//daysBetween('2026-11-01', '2026-11-04') -> 3 (negative when `to` is before `from`)
export function daysBetween(from: string, to: string): number {
  const MILLISECONDS_PER_DAY = 86_400_000;
  return Math.round(
    (parseUtcDate(to).getTime() - parseUtcDate(from).getTime()) / MILLISECONDS_PER_DAY,
  );
}

//addDays('2026-11-04', 1)   -> '2026-11-05'
export function addDays(value: string, days: number): string {
  const date = parseUtcDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return formatUtcDate(date);
}

//maxAllowedDate(new Date('2026-11-04T10:00:00Z'))  -> '2026-11-05'
export function maxAllowedDate(now?: Date): string {
  return addDays(todayString(now), 1);
}

//startOfMonth('2026-11-04') -> '2026-11-01'
export function startOfMonth(value: string): string {
  return value.slice(0, 8) + '01';
}

//previousMonthRange('2026-11-04') -> {month: '2026-10', from: '2026-10-01', to: '2026-10-31'}
export function previousMonthRange(value: string): { month: string; from: string; to: string } {
  const today = parseUtcDate(value);
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth(); // 0-11
  const firstDayOfPrevMonth = new Date(Date.UTC(year, month - 1, 1));
  const lastDayOfPrevMonth = new Date(Date.UTC(year, month, 0));
  const from = formatUtcDate(firstDayOfPrevMonth);
  return { month: from.slice(0, 7), from, to: formatUtcDate(lastDayOfPrevMonth) };
}

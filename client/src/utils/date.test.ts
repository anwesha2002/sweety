import { describe, expect, it } from 'vitest';
import {
  daysBetween,
  formatDateRange,
  formatDisplayDate,
  formatMonthLabel,
  formatShortDate,
  lastDayOfMonth,
  parseDateString,
  shiftDate,
  toLocalDateString,
} from './date';

describe('toLocalDateString', () => {
  it('keeps the local day late in the evening', () => {
    expect(toLocalDateString(new Date(2026, 10, 4, 23, 30))).toBe('2026-11-04');
  });

  it('keeps the local day just after midnight (toISOString would give the day before in UTC+ zones)', () => {
    expect(toLocalDateString(new Date(2026, 10, 4, 0, 30))).toBe('2026-11-04');
  });

  it('pads month and day', () => {
    expect(toLocalDateString(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('parseDateString', () => {
  it('returns local midnight of that calendar day', () => {
    const date = parseDateString('2026-11-04');

    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 10, 4]);
    expect(date.getHours()).toBe(0);
  });

  it('round-trips with toLocalDateString', () => {
    for (const value of ['2026-01-01', '2026-03-29', '2026-10-25', '2024-02-29', '2026-12-31']) {
      expect(toLocalDateString(parseDateString(value))).toBe(value);
    }
  });
});

describe('daysBetween', () => {
  it('counts days between two dates', () => {
    expect(daysBetween('2026-11-01', '2026-11-04')).toBe(3);
    expect(daysBetween('2026-11-04', '2026-11-04')).toBe(0);
    expect(daysBetween('2026-11-04', '2026-11-01')).toBe(-3);
  });

  it('is exact across month ends, years, leap days and daylight-saving changes', () => {
    expect(daysBetween('2026-11-30', '2026-12-01')).toBe(1);
    expect(daysBetween('2025-12-31', '2026-01-01')).toBe(1);
    expect(daysBetween('2024-02-28', '2024-03-01')).toBe(2);
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2); // EU clocks change on the 29th
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2); // ...and on the 25th of October
  });
});

describe('shiftDate', () => {
  it('moves forward and backward', () => {
    expect(shiftDate('2026-11-04', 1)).toBe('2026-11-05');
    expect(shiftDate('2026-11-04', -4)).toBe('2026-10-31');
    expect(shiftDate('2026-11-04', 0)).toBe('2026-11-04');
  });

  it('crosses month and year ends, leap days and clock changes', () => {
    expect(shiftDate('2026-11-30', 1)).toBe('2026-12-01');
    expect(shiftDate('2026-12-31', 1)).toBe('2027-01-01');
    expect(shiftDate('2024-02-28', 1)).toBe('2024-02-29');
    expect(shiftDate('2026-03-28', 2)).toBe('2026-03-30');
  });

  it('round-trips with daysBetween', () => {
    for (const days of [-400, -31, -1, 0, 1, 29, 366]) {
      expect(daysBetween('2026-11-04', shiftDate('2026-11-04', days))).toBe(days);
    }
  });
});

describe('lastDayOfMonth', () => {
  it('returns the last day of each kind of month', () => {
    expect(lastDayOfMonth('2026-11')).toBe('2026-11-30');
    expect(lastDayOfMonth('2026-12')).toBe('2026-12-31');
    expect(lastDayOfMonth('2026-02')).toBe('2026-02-28');
    expect(lastDayOfMonth('2024-02')).toBe('2024-02-29');
  });
});

describe('formatShortDate', () => {
  it('formats a date without the year', () => {
    expect(formatShortDate('2026-11-04')).toBe('4 Nov');
    expect(formatShortDate('2026-01-31')).toBe('31 Jan');
  });
});

describe('formatting', () => {
  it('formats a single date', () => {
    expect(formatDisplayDate('2026-11-04')).toBe('4 Nov 2026');
  });

  it('formats a range', () => {
    expect(formatDateRange('2026-11-01', '2026-11-04')).toBe('1 Nov 2026 – 4 Nov 2026');
  });

  it('formats a month', () => {
    expect(formatMonthLabel('2026-10')).toBe('October 2026');
    expect(formatMonthLabel('2025-12')).toBe('December 2025');
  });
});

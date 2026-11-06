import { describe, expect, it } from 'vitest';
import {
  addDays,
  daysBetween,
  formatUtcDate,
  isValidDateString,
  maxAllowedDate,
  parseUtcDate,
  previousMonthRange,
  startOfMonth,
  todayString,
} from '../src/utils/date.js';

describe('isValidDateString', () => {
  it('accepts real calendar dates', () => {
    expect(isValidDateString('2025-03-09')).toBe(true);
    expect(isValidDateString('2024-02-29')).toBe(true); // leap year
  });

  it('rejects wrong formats and impossible dates', () => {
    expect(isValidDateString('2025-02-30')).toBe(false);
    expect(isValidDateString('2025-13-01')).toBe(false);
    expect(isValidDateString('2023-02-29')).toBe(false); // not a leap year
    expect(isValidDateString('09-03-2025')).toBe(false);
    expect(isValidDateString('2025-3-9')).toBe(false);
    expect(isValidDateString('')).toBe(false);
  });
});

describe('parseUtcDate / formatUtcDate', () => {
  it('converts a date string to UTC midnight', () => {
    expect(parseUtcDate('2025-03-09').toISOString()).toBe('2025-03-09T00:00:00.000Z');
  });

  it('round-trips without shifting the day', () => {
    for (const value of ['2025-01-01', '2025-12-31', '2024-02-29']) {
      expect(formatUtcDate(parseUtcDate(value))).toBe(value);
    }
  });

  it('throws for an invalid date string', () => {
    expect(() => parseUtcDate('2025-02-30')).toThrow('Invalid date string');
  });
});

describe('todayString', () => {
  it('returns the UTC date as YYYY-MM-DD', () => {
    expect(todayString(new Date('2025-03-09T23:59:59.000Z'))).toBe('2025-03-09');
    expect(todayString(new Date('2025-03-10T00:00:00.000Z'))).toBe('2025-03-10');
  });

  it('defaults to the current date', () => {
    expect(todayString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('addDays', () => {
  it('moves forward and backward', () => {
    expect(addDays('2026-11-04', 1)).toBe('2026-11-05');
    expect(addDays('2026-11-04', -1)).toBe('2026-11-03');
    expect(addDays('2026-11-04', 0)).toBe('2026-11-04');
  });

  it('crosses month and year ends', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('knows about leap days', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2024-02-29', 1)).toBe('2024-03-01');
    expect(addDays('2025-02-28', 1)).toBe('2025-03-01');
  });
});

describe('daysBetween', () => {
  it('counts the days from one date to another', () => {
    expect(daysBetween('2026-11-01', '2026-11-04')).toBe(3);
    expect(daysBetween('2026-11-04', '2026-11-04')).toBe(0);
    expect(daysBetween('2026-11-04', '2026-11-01')).toBe(-3);
  });

  it('handles month ends, years and leap days', () => {
    expect(daysBetween('2026-11-30', '2026-12-01')).toBe(1);
    expect(daysBetween('2025-12-31', '2026-01-01')).toBe(1);
    expect(daysBetween('2024-02-28', '2024-03-01')).toBe(2);
    expect(daysBetween('2025-02-28', '2025-03-01')).toBe(1);
    expect(daysBetween('2024-01-01', '2024-12-31')).toBe(365);
  });
});

describe('maxAllowedDate', () => {
  it('is today (UTC) plus one day', () => {
    expect(maxAllowedDate(new Date('2026-11-04T10:00:00Z'))).toBe('2026-11-05');
    expect(maxAllowedDate(new Date('2026-11-04T23:59:00Z'))).toBe('2026-11-05');
    expect(maxAllowedDate(new Date('2026-12-31T12:00:00Z'))).toBe('2027-01-01');
  });
});

describe('startOfMonth', () => {
  it('returns the first day of the month', () => {
    expect(startOfMonth('2026-11-04')).toBe('2026-11-01');
    expect(startOfMonth('2026-11-01')).toBe('2026-11-01');
    expect(startOfMonth('2026-11-30')).toBe('2026-11-01');
  });
});

describe('previousMonthRange', () => {
  it('returns the previous month', () => {
    expect(previousMonthRange('2026-11-04')).toEqual({
      month: '2026-10',
      from: '2026-10-01',
      to: '2026-10-31',
    });
  });

  it('rolls January back to December of the previous year', () => {
    expect(previousMonthRange('2026-01-15')).toEqual({
      month: '2025-12',
      from: '2025-12-01',
      to: '2025-12-31',
    });
  });

  it('handles a leap-year February and a regular one', () => {
    expect(previousMonthRange('2024-03-10').to).toBe('2024-02-29');
    expect(previousMonthRange('2025-03-31').to).toBe('2025-02-28');
  });

  it('works on the first day of a month', () => {
    expect(previousMonthRange('2026-05-01')).toEqual({
      month: '2026-04',
      from: '2026-04-01',
      to: '2026-04-30',
    });
  });
});

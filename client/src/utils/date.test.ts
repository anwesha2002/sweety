import { describe, expect, it } from 'vitest';
import {
  formatDateRange,
  formatDisplayDate,
  formatMonthLabel,
  parseDateString,
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

import { describe, expect, it } from 'vitest';
import { makeDateTicks, niceYScale, scaleLinear } from './chart';

describe('niceYScale', () => {
  it('fits the data with a little space and round grid values', () => {
    expect(niceYScale([96, 142])).toEqual({ min: 80, max: 160, ticks: [80, 100, 120, 140, 160] });
  });

  it('always contains every value', () => {
    for (const values of [[40], [600], [90, 91], [100, 250, 180], [60, 420]]) {
      const { min, max } = niceYScale(values);
      expect(min).toBeLessThanOrEqual(Math.min(...values));
      expect(max).toBeGreaterThanOrEqual(Math.max(...values));
    }
  });

  it('copes with a single value', () => {
    expect(niceYScale([130])).toEqual({ min: 125, max: 135, ticks: [125, 130, 135] });
  });

  it('never goes below zero', () => {
    expect(niceYScale([2, 8]).min).toBe(0);
  });

  it('uses larger steps for a wide spread, keeping the grid readable', () => {
    const { ticks } = niceYScale([40, 600]);

    expect(ticks.length).toBeLessThanOrEqual(8);
    expect(ticks[1]! - ticks[0]!).toBeGreaterThanOrEqual(100);
  });
});

describe('scaleLinear', () => {
  it('maps the domain onto the range, including flipped ranges', () => {
    const scale = scaleLinear(0, 10, 100, 200);
    const flipped = scaleLinear(0, 10, 200, 100);

    expect(scale(0)).toBe(100);
    expect(scale(5)).toBe(150);
    expect(scale(10)).toBe(200);
    expect(flipped(0)).toBe(200);
    expect(flipped(10)).toBe(100);
  });

  it('maps a domain without width to the middle of the range', () => {
    expect(scaleLinear(3, 3, 0, 100)(3)).toBe(50);
  });
});

describe('makeDateTicks', () => {
  it('gives about six evenly spaced labels for a month', () => {
    const ticks = makeDateTicks('2026-11-01', '2026-11-30');

    expect(ticks.map((tick) => tick.date)).toEqual([
      '2026-11-01',
      '2026-11-07',
      '2026-11-13',
      '2026-11-19',
      '2026-11-25',
      '2026-11-30',
    ]);
    expect(ticks.map((tick) => tick.x)).toEqual([0, 6, 12, 18, 24, 29]);
  });

  it('labels every other day for a week', () => {
    expect(makeDateTicks('2026-11-01', '2026-11-07').map((tick) => tick.x)).toEqual([0, 2, 4, 6]);
  });

  it('labels each day of a short range', () => {
    expect(makeDateTicks('2026-11-01', '2026-11-02').map((tick) => tick.date)).toEqual([
      '2026-11-01',
      '2026-11-02',
    ]);
  });

  it('gives one label for a single day', () => {
    expect(makeDateTicks('2026-11-04', '2026-11-04')).toEqual([{ x: 0, date: '2026-11-04' }]);
  });

  it('does not crowd the end of the axis with an extra label', () => {
    // 8 days: step 2 -> 0, 2, 4, 6, 8 (already ends on the last day)
    expect(makeDateTicks('2026-11-01', '2026-11-09').map((tick) => tick.x)).toEqual([
      0, 2, 4, 6, 8,
    ]);
    // 10 days: step 2 -> 0..10 would be six labels already, ending exactly on the last day
    const ticks = makeDateTicks('2026-11-01', '2026-11-11');
    expect(ticks.length).toBeLessThanOrEqual(7);
    expect(ticks.at(-1)?.date).toBe('2026-11-11');
  });

  it('works across a year end and for a whole year', () => {
    expect(makeDateTicks('2025-12-30', '2026-01-02').map((tick) => tick.date)).toEqual([
      '2025-12-30',
      '2025-12-31',
      '2026-01-01',
      '2026-01-02',
    ]);
    expect(makeDateTicks('2026-01-01', '2026-12-31').length).toBeLessThanOrEqual(7);
  });
});

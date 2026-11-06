import { daysBetween, shiftDate } from './date';

// Small helpers for the line chart: nice axis values and evenly spaced date labels.

export interface YScale {
  min: number;
  max: number;
  /** Values for the horizontal grid lines and axis labels, from min to max. */
  ticks: number[];
}

const NICE_STEPS = [5, 10, 20, 25, 50, 100, 200];

/**
 * A y-axis that fits all `values` with a little space around them and round numbers on the
 * grid lines, e.g. [96, 142] -> 80 to 160 in steps of 20.
 */
export function niceYScale(values: number[]): YScale {
  const lowest = Math.min(...values);
  const highest = Math.max(...values);

  // Aim for about 4 steps across the data, using round step sizes.
  const span = Math.max(highest - lowest, 10);
  const step = NICE_STEPS.find((candidate) => candidate >= span / 4) ?? 200;

  const min = Math.max(0, Math.floor((lowest - step / 2) / step) * step);
  const max = Math.ceil((highest + step / 2) / step) * step;

  const ticks: number[] = [];
  for (let value = min; value <= max; value += step) ticks.push(value);
  return { min, max, ticks };
}

/**
 * Returns a function that maps a number from [domainMin, domainMax] to [rangeMin, rangeMax].
 * A domain with no width (a single value) maps to the middle of the range.
 */
export function scaleLinear(
  domainMin: number,
  domainMax: number,
  rangeMin: number,
  rangeMax: number,
): (value: number) => number {
  if (domainMax === domainMin) {
    const middle = (rangeMin + rangeMax) / 2;
    return () => middle;
  }
  return (value) =>
    rangeMin + ((value - domainMin) / (domainMax - domainMin)) * (rangeMax - rangeMin);
}

export interface DateTick {
  /** Days since `from`: the chart's x value for this label. */
  x: number;
  date: string;
}

/** Evenly spaced date labels from `from` to `to` (at most about `maxTicks` of them). */
export function makeDateTicks(from: string, to: string, maxTicks = 6): DateTick[] {
  const totalDays = daysBetween(from, to);
  if (totalDays <= 0) return [{ x: 0, date: from }];

  const step = Math.max(1, Math.ceil(totalDays / (maxTicks - 1)));
  const offsets: number[] = [];
  for (let offset = 0; offset <= totalDays; offset += step) offsets.push(offset);

  // End on the last day when there is room for it (otherwise it would crowd the previous label).
  const lastOffset = offsets[offsets.length - 1] ?? 0;
  if (totalDays - lastOffset >= step / 2) offsets.push(totalDays);

  return offsets.map((offset) => ({ x: offset, date: shiftDate(from, offset) }));
}

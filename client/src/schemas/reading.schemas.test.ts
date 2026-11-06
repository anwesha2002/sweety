import { describe, expect, it } from 'vitest';
import { addLocalDays } from '../test/dates';
import { readingFormSchema } from './reading.schemas';

const valid = { date: '2020-01-15', slot: 'AFTER_LUNCH', value: 120 };
const REQUIRED = 'Please enter a glucose value.';
const RANGE = 'Value must be between 40 and 600 mg/dl.';

/** "field: message" for every problem. */
function problems(input: unknown): string[] {
  const result = readingFormSchema.safeParse(input);
  return result.success
    ? []
    : result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
}

describe('readingFormSchema', () => {
  it('accepts a valid reading and the boundary values', () => {
    for (const value of [40, 120, 600]) {
      expect(problems({ ...valid, value })).toEqual([]);
    }
  });

  it('asks for a value when the field is empty (NaN) or missing', () => {
    expect(problems({ ...valid, value: NaN })).toEqual([`value: ${REQUIRED}`]);
    expect(problems({ date: valid.date, slot: valid.slot })).toEqual([`value: ${REQUIRED}`]);
  });

  it('gives the range message for values outside 40-600 or not whole', () => {
    for (const value of [39, 601, 0, -5, 120.5]) {
      expect(problems({ ...valid, value })).toEqual([`value: ${RANGE}`]);
    }
  });

  it('asks to choose a slot when none is selected', () => {
    expect(problems({ ...valid, slot: '' })).toEqual(['slot: Choose a reading time.']);
  });

  it('rejects an empty date and a date in the future', () => {
    expect(problems({ ...valid, date: '' })).toEqual(['date: Enter a valid date.']);
    expect(problems({ ...valid, date: addLocalDays(new Date(), 1) })).toEqual([
      'date: Date cannot be in the future.',
    ]);
  });
});

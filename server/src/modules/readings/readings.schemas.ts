import { z } from 'zod';
import {
  GLUCOSE_MAX,
  GLUCOSE_MIN,
  READING_SLOTS,
  type ReadingSlot,
} from '../../constants/readings.js';
import { isValidDateString } from '../../utils/date.js';

// Exact messages from the brief: do not reword.
const VALUE_REQUIRED = 'Please enter a glucose value.';
const VALUE_RANGE = `Value must be between ${GLUCOSE_MIN} and ${GLUCOSE_MAX} mg/dl.`;
const DATE_INVALID = 'Enter a valid date.';

/** A real calendar date written as YYYY-MM-DD (see utils/date.ts for the date convention). */
const dateString = z.string({ error: DATE_INVALID }).refine(isValidDateString, DATE_INVALID);

// "Required" when the value is missing or null; the range message for anything else that is
// not a whole number from 40 to 600.
const value = z
  .number({
    error: (issue) =>
      issue.input === undefined || issue.input === null ? VALUE_REQUIRED : VALUE_RANGE,
  })
  .int(VALUE_RANGE)
  .max(GLUCOSE_MAX, VALUE_RANGE)
  .min(GLUCOSE_MIN, VALUE_RANGE);

export const createReadingSchema = z.object({
  date: dateString,
  slot: z.enum(READING_SLOTS, { error: 'Choose a reading time.' }),
  value,
});

export const updateReadingSchema = createReadingSchema
  .partial()
  .refine(
    (data) => Object.keys(data).length > 0,
    'At least one field must be provided for update.',
  );

export const listReadingsQuerySchema = z
  .object({
    from: dateString.optional(),
    to: dateString.optional(),
    // Query strings arrive as text, so coerce to numbers. The defaults apply when the param is absent.
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .refine((query) => !query.from || !query.to || query.from <= query.to, {
    path: ['to'],
    message: 'End date must be on or after the start date.',
  });

export type CreateReadingInput = z.infer<typeof createReadingSchema>;
export type UpdateReadingInput = z.infer<typeof updateReadingSchema>;
export type ListReadingsQueryInput = z.infer<typeof listReadingsQuerySchema>;

/** Reading as sent over the API: date is a YYYY-MM-DD string. */
export interface ReadingDto {
  id: string;
  date: string;
  slot: ReadingSlot;
  value: number;
  createdAt: string;
}

export interface ListReadingsPages {
  items: ReadingDto[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

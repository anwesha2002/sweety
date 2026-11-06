import { z } from 'zod';
import { GLUCOSE_MAX, GLUCOSE_MIN, GLUCOSE_UNIT } from '../constants/glucose';
import { SLOT_ORDER } from '../constants/slots';
import { toLocalDateString } from '../utils/date';

// These rules and messages mirror server/src/modules/readings/readings.schemas.ts (the server
// stays the final judge). Keep the two in sync.
const VALUE_REQUIRED = 'Please enter a glucose value.';
const VALUE_RANGE = `Value must be between ${GLUCOSE_MIN} and ${GLUCOSE_MAX} ${GLUCOSE_UNIT}.`;

export const readingFormSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date.')
    // The date picker already stops at today. Today in the user's local zone is never later
    // than the server's limit (today in UTC + 1 day), so this can never reject a valid date.
    .refine((date) => date <= toLocalDateString(new Date()), 'Date cannot be in the future.'),
  // An unselected <select> gives '', which is not a slot.
  slot: z.enum(SLOT_ORDER, { error: 'Choose a reading time.' }),
  // The form reads the input with `valueAsNumber`: an empty field becomes NaN.
  value: z
    .number({
      error: (issue) =>
        issue.input === undefined || issue.input === null || Number.isNaN(issue.input)
          ? VALUE_REQUIRED
          : VALUE_RANGE,
    })
    .int(VALUE_RANGE)
    .min(GLUCOSE_MIN, VALUE_RANGE)
    .max(GLUCOSE_MAX, VALUE_RANGE),
});

export type ReadingFormValues = z.infer<typeof readingFormSchema>;

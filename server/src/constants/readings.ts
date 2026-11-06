/** The four fixed reading times of a day, in the order they happen. */
export const READING_SLOTS = ['MORNING', 'AFTER_BREAKFAST', 'AFTER_LUNCH', 'AFTER_DINNER'] as const;

export type ReadingSlot = (typeof READING_SLOTS)[number];

//Four slots in the order they happen. Used for sorting and for the <select> in ReadingForm.
export const SLOT_LABELS: Record<ReadingSlot, string> = {
  MORNING: 'Morning (fasting)',
  AFTER_BREAKFAST: 'After breakfast',
  AFTER_LUNCH: 'After lunch',
  AFTER_DINNER: 'After dinner',
};

export const GLUCOSE_MIN = 40;
export const GLUCOSE_MAX = 600;
export const MAX_READINGS_PER_DAY = 4;

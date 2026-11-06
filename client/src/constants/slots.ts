import type { ReadingSlot } from '../types/reading';

// Mirrors SLOT_LABELS in server/src/constants/readings.ts. Keep the two in sync.
export const SLOT_LABELS: Record<ReadingSlot, string> = {
  MORNING: 'Morning (fasting)',
  AFTER_BREAKFAST: 'After breakfast',
  AFTER_LUNCH: 'After lunch',
  AFTER_DINNER: 'After dinner',
};

/** Short names for places with little room, such as chart axes. */
export const SLOT_SHORT_LABELS: Record<ReadingSlot, string> = {
  MORNING: 'Morning',
  AFTER_BREAKFAST: 'Breakfast',
  AFTER_LUNCH: 'Lunch',
  AFTER_DINNER: 'Dinner',
};

/** Slots in the order they happen during the day. */
export const SLOT_ORDER: ReadingSlot[] = [
  'MORNING',
  'AFTER_BREAKFAST',
  'AFTER_LUNCH',
  'AFTER_DINNER',
];

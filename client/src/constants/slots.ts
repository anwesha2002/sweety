import type { ReadingSlot } from '../types/reading';

// Mirrors SLOT_LABELS in server/src/constants/readings.ts. Keep the two in sync.
export const SLOT_LABELS: Record<ReadingSlot, string> = {
  MORNING: 'Morning (fasting)',
  AFTER_BREAKFAST: 'After breakfast',
  AFTER_LUNCH: 'After lunch',
  AFTER_DINNER: 'After dinner',
};

/** Slots in the order they happen during the day. */
export const SLOT_ORDER: ReadingSlot[] = [
  'MORNING',
  'AFTER_BREAKFAST',
  'AFTER_LUNCH',
  'AFTER_DINNER',
];

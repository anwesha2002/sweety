import type { GlucoseReading } from '../../db/schema.js';
import type { ReadingDto } from './readings.schemas.js';

/** Converts a database row to the API shape: `date` is already "YYYY-MM-DD", createdAt becomes ISO. */
export function toReadingDto(reading: GlucoseReading): ReadingDto {
  return {
    id: reading.id,
    date: reading.date,
    slot: reading.slot,
    value: reading.value,
    createdAt: reading.createdAt.toISOString(),
  };
}

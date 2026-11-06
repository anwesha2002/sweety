import { and, asc, avg, count, eq, gte, lte, max, min } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { glucoseReadings, type GlucoseReading } from '../../db/schema.js';

/** Unrounded numbers straight from the database; the service turns them into a summary. */
export interface ReadingsAggregate {
  max: number | null;
  min: number | null;
  avg: number | null;
  count: number;
}

// Like the readings repository, every function filters by userId so reports only ever
// contain the logged-in user's readings.

/** Highest, lowest, average and count of the user's readings from `from` to `to` (inclusive). */
export async function summarizeReadings(
  userId: string,
  from: string,
  to: string,
): Promise<ReadingsAggregate> {
  const [row] = await db
    .select({
      max: max(glucoseReadings.value),
      min: min(glucoseReadings.value),
      avg: avg(glucoseReadings.value),
      count: count(),
    })
    .from(glucoseReadings)
    .where(
      and(
        eq(glucoseReadings.userId, userId),
        gte(glucoseReadings.date, from),
        lte(glucoseReadings.date, to),
      ),
    );

  return {
    max: row?.max ?? null,
    min: row?.min ?? null,
    // Postgres returns AVG as an exact decimal, which the driver gives us as a string.
    avg: row?.avg == null ? null : Number(row.avg),
    count: row?.count ?? 0,
  };
}

/**
 * The average value and number of readings for each day that has readings between `from` and
 * `to` (inclusive), oldest day first. Days without readings do not appear.
 */
export async function averagesByDay(
  userId: string,
  from: string,
  to: string,
): Promise<{ date: string; avg: number; count: number }[]> {
  const rows = await db
    .select({ date: glucoseReadings.date, avg: avg(glucoseReadings.value), count: count() })
    .from(glucoseReadings)
    .where(
      and(
        eq(glucoseReadings.userId, userId),
        gte(glucoseReadings.date, from),
        lte(glucoseReadings.date, to),
      ),
    )
    .groupBy(glucoseReadings.date)
    .orderBy(asc(glucoseReadings.date));

  // AVG comes back from Postgres as a string (an exact decimal).
  return rows.map((row) => ({ date: row.date, avg: Number(row.avg), count: row.count }));
}

/** The user's readings for one day, in slot order (Morning first). */
export function listReadingsOnDate(userId: string, date: string): Promise<GlucoseReading[]> {
  return db
    .select()
    .from(glucoseReadings)
    .where(and(eq(glucoseReadings.userId, userId), eq(glucoseReadings.date, date)))
    .orderBy(asc(glucoseReadings.slot));
}

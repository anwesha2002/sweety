import { and, asc, count, desc, eq, gte, lte, ne } from 'drizzle-orm';
import { db } from '../../config/db.js';
import type { ReadingSlot } from '../../constants/readings.js';
import { glucoseReadings, type GlucoseReading } from '../../db/schema.js';

export interface ReadingData {
  date: string; // YYYY-MM-DD
  slot: ReadingSlot;
  value: number;
}

// Every function takes userId first and puts it in the `where`, so one user can never read or
// change another user's readings. Dates are plain "YYYY-MM-DD" strings end to end.
// `and()` ignores undefined conditions, which keeps the optional filters short.

export async function createReading(userId: string, data: ReadingData): Promise<GlucoseReading> {
  const [reading] = await db
    .insert(glucoseReadings)
    .values({ userId, date: data.date, slot: data.slot, value: data.value })
    .returning();
  if (!reading) throw new Error('Creating the reading returned no row.');
  return reading;
}

export async function findReadingById(userId: string, id: string): Promise<GlucoseReading | null> {
  const [reading] = await db
    .select()
    .from(glucoseReadings)
    .where(and(eq(glucoseReadings.id, id), eq(glucoseReadings.userId, userId)))
    .limit(1);
  return reading ?? null;
}

export async function listReadings(
  userId: string,
  opts: { from?: string; to?: string; skip: number; take: number },
): Promise<{ rows: GlucoseReading[]; total: number }> {
  const where = and(
    eq(glucoseReadings.userId, userId),
    opts.from ? gte(glucoseReadings.date, opts.from) : undefined,
    opts.to ? lte(glucoseReadings.date, opts.to) : undefined,
  );

  // The same `where` for the page and for the total.
  const [rows, totals] = await Promise.all([
    db
      .select()
      .from(glucoseReadings)
      .where(where)
      .orderBy(desc(glucoseReadings.date), asc(glucoseReadings.slot))
      .limit(opts.take)
      .offset(opts.skip),
    db.select({ total: count() }).from(glucoseReadings).where(where),
  ]);
  return { rows, total: totals[0]?.total ?? 0 };
}

/** `excludeId` leaves one reading out of the count (used when editing that reading). */
export async function countReadingsOnDate(
  userId: string,
  date: string,
  excludeId?: string,
): Promise<number> {
  const [result] = await db
    .select({ total: count() })
    .from(glucoseReadings)
    .where(
      and(
        eq(glucoseReadings.userId, userId),
        eq(glucoseReadings.date, date),
        excludeId ? ne(glucoseReadings.id, excludeId) : undefined,
      ),
    );
  return result?.total ?? 0;
}

export async function findReadingByDateAndSlot(
  userId: string,
  date: string,
  slot: ReadingSlot,
  excludeId?: string,
): Promise<GlucoseReading | null> {
  const [reading] = await db
    .select()
    .from(glucoseReadings)
    .where(
      and(
        eq(glucoseReadings.userId, userId),
        eq(glucoseReadings.date, date),
        eq(glucoseReadings.slot, slot),
        excludeId ? ne(glucoseReadings.id, excludeId) : undefined,
      ),
    )
    .limit(1);
  return reading ?? null;
}

/** Returns the updated reading, or null when it does not exist or belongs to someone else. */
export async function updateReading(
  userId: string,
  id: string,
  data: Partial<ReadingData>,
): Promise<GlucoseReading | null> {
  // Drizzle skips undefined fields, but refuses an update with nothing to set.
  if (Object.values(data).every((value) => value === undefined)) {
    return findReadingById(userId, id);
  }

  const [updated] = await db
    .update(glucoseReadings)
    .set(data)
    .where(and(eq(glucoseReadings.id, id), eq(glucoseReadings.userId, userId)))
    .returning();
  return updated ?? null;
}

/** True when a reading was deleted; false when it does not exist or belongs to someone else. */
export async function deleteReading(userId: string, id: string): Promise<boolean> {
  const deleted = await db
    .delete(glucoseReadings)
    .where(and(eq(glucoseReadings.id, id), eq(glucoseReadings.userId, userId)))
    .returning({ id: glucoseReadings.id });
  return deleted.length > 0;
}

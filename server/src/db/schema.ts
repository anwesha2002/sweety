import { sql } from 'drizzle-orm';
import {
  check,
  date,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { GLUCOSE_MAX, GLUCOSE_MIN, READING_SLOTS } from '../constants/readings.js';

// The database schema, written as code. `npm run db:generate` turns changes to this file into
// SQL migrations (server/drizzle/), and `npm run db:migrate` applies them.

// Dates (`date` columns) are used in "string" mode: they are read and written as plain
// "YYYY-MM-DD" strings, which is exactly what the API sends, so no time-zone conversion happens.

export const readingSlotEnum = pgEnum('reading_slot', READING_SLOTS);

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true, precision: 3 }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, precision: 3 })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(), // stored trimmed + lowercase (normalized by the API)
  passwordHash: text('password_hash').notNull(),
  ...timestamps,
});

export const glucoseReadings = pgTable(
  'glucose_readings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    date: date('date', { mode: 'string' }).notNull(),
    slot: readingSlotEnum('slot').notNull(),
    value: integer('value').notNull(), // mg/dl
    ...timestamps,
  },
  (table) => [
    // One reading per slot per day. This index starts with (user_id, date), so it also serves
    // "a user's readings for a date range" queries; no second index is needed.
    unique('glucose_readings_user_id_date_slot_key').on(table.userId, table.date, table.slot),
    check(
      'glucose_readings_value_check',
      sql`${table.value} BETWEEN ${sql.raw(String(GLUCOSE_MIN))} AND ${sql.raw(String(GLUCOSE_MAX))}`,
    ),
  ],
);

export type User = typeof users.$inferSelect;
export type GlucoseReading = typeof glucoseReadings.$inferSelect;

import { sql } from 'drizzle-orm';
import { afterAll, beforeEach } from 'vitest';
import { db, pool } from '../src/config/db.js';
import { assertTestEnvironment } from './helpers/testEnvironment.js';

// Runs inside every test file. (src/config/env.ts has already loaded .env.test at this point.)
assertTestEnvironment();

beforeEach(async () => {
  await db.execute(sql`TRUNCATE TABLE glucose_readings, users RESTART IDENTITY CASCADE`);
});

afterAll(async () => {
  await pool.end();
});

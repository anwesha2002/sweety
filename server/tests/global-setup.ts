import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { assertTestEnvironment } from './helpers/testEnvironment.js';

// Runs once before all test files: load .env.test, check it is safe, apply the migrations
// (the same ones `npm run db:migrate` applies).
export default async function globalSetup(): Promise<void> {
  process.env.NODE_ENV = 'test';
  dotenv.config({ path: fileURLToPath(new URL('../.env.test', import.meta.url)), quiet: true });
  assertTestEnvironment();

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await migrate(drizzle({ client: pool }), {
      migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)),
    });
  } finally {
    await pool.end();
  }
}

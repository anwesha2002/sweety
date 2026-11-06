import dotenv from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Settings for the drizzle-kit commands (db:generate, db:migrate, db:studio).
// `generate` only reads the schema, so a missing DATABASE_URL is fine for it; `migrate` and
// `studio` will report the problem themselves.
dotenv.config({ quiet: true });

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
});

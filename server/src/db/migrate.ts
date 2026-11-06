import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { fileURLToPath } from 'node:url';
import { db, pool } from '../config/db.js';

// Applies the SQL migrations in server/drizzle to the database in DATABASE_URL, then exits.
// The production container runs this before the server starts (see `npm run start:prod`), so a
// new deployment brings the database up to date by itself. Safe to run repeatedly: migrations
// that were already applied are skipped.
//
// The path works from src/db/ (tsx) and from dist/db/ (compiled): both are two levels below server/.
const migrationsFolder = fileURLToPath(new URL('../../drizzle', import.meta.url));

migrate(db, { migrationsFolder })
  .then(() => {
    console.log('Database migrations are up to date.');
  })
  .catch((error: unknown) => {
    console.error('Database migration failed:', error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

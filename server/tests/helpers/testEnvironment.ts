import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

/** Host and database name of a connection string, e.g. "db.example.com/sweety_test". */
function describeDatabase(connectionString: string): { host: string; name: string } {
  const url = new URL(connectionString);
  return { host: url.host, name: url.pathname.replace(/^\//, '') };
}

/** The development database from server/.env, if that file exists. */
function readDevelopmentDatabase(): { host: string; name: string } | null {
  try {
    const envFile = fileURLToPath(new URL('../../.env', import.meta.url));
    const devUrl = dotenv.parse(readFileSync(envFile)).DATABASE_URL;
    return devUrl ? describeDatabase(devUrl) : null;
  } catch {
    return null;
  }
}

/**
 * The tests TRUNCATE tables, so refuse to run unless we are clearly pointed at a test database:
 * either one whose name ends in "_test", or (for hosted setups such as a separate Neon branch,
 * where the database keeps its original name) one on a different server than the
 * development database in server/.env.
 */
export function assertTestEnvironment(): void {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error(
      `Refusing to run tests: NODE_ENV is "${process.env.NODE_ENV}", expected "test".`,
    );
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('Refusing to run tests: DATABASE_URL is not set. Create server/.env.test.');
  }

  const test = describeDatabase(databaseUrl);
  if (test.name.endsWith('_test')) return;

  const dev = readDevelopmentDatabase();
  if (dev && dev.host !== test.host) return;

  throw new Error(
    `Refusing to run tests: database "${test.name}" on ${test.host} does not look like a test ` +
      'database. Its name must end with "_test", or it must be on a different server than the ' +
      'development database in server/.env (for example a separate Neon branch). Check server/.env.test.',
  );
}

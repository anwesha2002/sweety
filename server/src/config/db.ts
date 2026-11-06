import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env } from './env.js';

// The one shared database connection pool and Drizzle client. Repositories import `db`;

export const pool = new pg.Pool({ connectionString: env.DATABASE_URL });

export const db = drizzle({ client: pool });

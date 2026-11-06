import { sql } from 'drizzle-orm';
import { db } from '../../config/db.js';

/** Resolves when the database answers a trivial query; rejects otherwise. */
export async function pingDatabase(): Promise<void> {
  await db.execute(sql`SELECT 1`);
}

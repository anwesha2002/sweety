/** Postgres error code for "unique constraint violated". */
const UNIQUE_VIOLATION = '23505';

interface PostgresErrorLike {
  code: string;
  detail?: unknown;
}

/**
 * Finds the Postgres error behind a thrown value. Drizzle wraps driver errors and keeps the
 * original one in `cause`, so look at the error itself and then at its cause.
 */
function findPostgresError(error: unknown): PostgresErrorLike | null {
  let current: unknown = error;
  for (let depth = 0; depth < 3 && typeof current === 'object' && current !== null; depth++) {
    if ('code' in current && typeof current.code === 'string') {
      return current as PostgresErrorLike;
    }
    current = 'cause' in current ? current.cause : null;
  }
  return null;
}

/** True when a query failed because a unique index/constraint would have been violated. */
export function isUniqueViolation(error: unknown): boolean {
  return findPostgresError(error)?.code === UNIQUE_VIOLATION;
}

/**
 * The fields named by a unique violation, e.g. ["email"], taken from Postgres' message
 * "Key (email)=(...) already exists." Only column names are returned, never the values.
 * Snake_case column names become camelCase field names.
 */
export function uniqueViolationFields(error: unknown): string[] {
  const detail = findPostgresError(error)?.detail;
  if (typeof detail !== 'string') return [];

  const columns = /^Key \(([^)]+)\)=/.exec(detail)?.[1];
  if (!columns) return [];

  return columns
    .split(', ')
    .map((column) => column.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase()));
}

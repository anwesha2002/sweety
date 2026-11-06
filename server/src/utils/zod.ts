import type { ZodError } from 'zod';
import type { FieldError } from './ApiError.js';

/** Converts Zod issues to the API's { field, message } items (nested paths become "a.b"). */
export function zodIssuesToFieldErrors(issues: ZodError['issues']): FieldError[] {
  return issues.map((issue) => ({
    field: issue.path.join('.') || 'body',
    message: issue.message,
  }));
}

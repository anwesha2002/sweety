import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

/**
 * Shows server-side field errors next to the matching form fields.
 * Returns true if at least one error was placed on a field, so the caller can decide
 * whether it still needs to show a general message.
 */
export function applyServerErrors<T extends FieldValues>(
  setError: UseFormSetError<T>,
  fieldErrors: Record<string, string>,
  formFields: readonly Path<T>[],
): boolean {
  let applied = false;
  for (const field of formFields) {
    const message = fieldErrors[field];
    if (message) {
      setError(field, { type: 'server', message });
      applied = true;
    }
  }
  return applied;
}

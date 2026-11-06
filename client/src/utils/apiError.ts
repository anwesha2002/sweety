import { isAxiosError } from 'axios';
import type { ApiFailure } from '../types/api';

export interface ParsedApiError {
  /** A message safe to show to the user. */
  message: string;
  /** Server validation errors keyed by field name, e.g. { email: "Enter a valid email." } */
  fieldErrors: Record<string, string>;
}

const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';
const NETWORK_MESSAGE = 'Cannot reach the server. Check your connection and try again.';

/** Turns any thrown value (usually an Axios error) into { message, fieldErrors }. */
export function getApiError(error: unknown): ParsedApiError {
  if (!isAxiosError<Partial<ApiFailure>>(error)) {
    return { message: FALLBACK_MESSAGE, fieldErrors: {} };
  }

  if (!error.response) {
    return { message: NETWORK_MESSAGE, fieldErrors: {} };
  }

  const { message, errors } = error.response.data ?? {};
  const fieldErrors: Record<string, string> = {};
  for (const item of errors ?? []) {
    // Keep the first message per field
    fieldErrors[item.field] ??= item.message;
  }

  return { message: message ?? FALLBACK_MESSAGE, fieldErrors };
}

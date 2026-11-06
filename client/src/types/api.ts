export interface FieldError {
  field: string;
  message: string;
}

/** Success format used by every endpoint: { success: true, message, data } */
export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}

/** Error format used by every endpoint, with optional per-field messages. */
export interface ApiFailure {
  success: false;
  message: string;
  errors?: FieldError[];
}

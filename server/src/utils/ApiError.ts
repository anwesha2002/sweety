export interface FieldError {
  field: string;
  message: string;
}

/** An error that is safe to show to the client. Thrown anywhere, formatted by the error handler. */
export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly errors?: FieldError[],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

import type { ErrorRequestHandler, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { ZodError } from 'zod';
import { ApiError, type FieldError } from '../utils/ApiError.js';
import { isUniqueViolation, uniqueViolationFields } from '../utils/dbErrors.js';
import { zodIssuesToFieldErrors } from '../utils/zod.js';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.path}`));
};

interface ErrorBody {
  statusCode: number;
  message: string;
  errors?: FieldError[];
}

/** Errors thrown by Express/body-parser itself (malformed JSON, body too large). */
function fromBodyParserError(err: unknown): ErrorBody | null {
  if (typeof err !== 'object' || err === null || !('type' in err)) return null;
  if (err.type === 'entity.parse.failed') {
    return { statusCode: 400, message: 'Request body is not valid JSON.' };
  }
  if (err.type === 'entity.too.large') {
    return { statusCode: 413, message: 'Request body is too large.' };
  }
  return null;
}

function fromUniqueConstraintError(err: unknown): ErrorBody {
  const errors = uniqueViolationFields(err).map((field) => ({
    field,
    message: `This ${field} is already in use.`,
  }));
  return { statusCode: 409, message: 'A record with these details already exists.', errors };
}

/** Maps any thrown value to the standard error format. Internal details are never exposed. */
function toErrorBody(err: unknown): ErrorBody | null {
  if (err instanceof ApiError) {
    return { statusCode: err.statusCode, message: err.message, errors: err.errors };
  }
  if (err instanceof ZodError) {
    return {
      statusCode: 400,
      message: 'Validation failed',
      errors: zodIssuesToFieldErrors(err.issues),
    };
  }
  if (isUniqueViolation(err)) {
    return fromUniqueConstraintError(err);
  }
  if (err instanceof jwt.TokenExpiredError) {
    return { statusCode: 401, message: 'Your session has expired. Please log in again.' };
  }
  if (err instanceof jwt.JsonWebTokenError) {
    return { statusCode: 401, message: 'Invalid session. Please log in again.' };
  }
  return fromBodyParserError(err);
}

// Express identifies error middleware by its four parameters, so `_next` must stay.
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const known = toErrorBody(err);

  if (known) {
    res.status(known.statusCode).json({
      success: false,
      message: known.message,
      ...(known.errors && known.errors.length > 0 && { errors: known.errors }),
    });
    return;
  }

  // Unexpected error: log the details server-side, send a generic message to the client.
  req.log.error({ err }, 'Unhandled error');
  res
    .status(500)
    .json({ success: false, message: 'Something went wrong. Please try again later.' });
};

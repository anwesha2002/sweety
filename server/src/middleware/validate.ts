import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { ApiError, type FieldError } from '../utils/ApiError.js';
import { zodIssuesToFieldErrors } from '../utils/zod.js';

interface ValidationSchemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

//  Validates body, query and/or params with Zod and replaces them with the parsed values Responds 400 with field errors when anything is invalid.

export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req, _res, next) => {
    const errors: FieldError[] = [];

    for (const part of ['body', 'query', 'params'] as const) {
      const schema = schemas[part];
      if (!schema) continue;

      const parsed = schema.safeParse(req[part]);
      if (!parsed.success) {
        errors.push(...zodIssuesToFieldErrors(parsed.error.issues));
        continue;
      }
      // Express 5 exposes req.query as a read-only getter, so redefine it as a plain property.
      Object.defineProperty(req, part, { value: parsed.data, writable: true, configurable: true });
    }

    if (errors.length > 0) {
      next(new ApiError(400, 'Validation failed', errors));
      return;
    }
    next();
  };
}

import type { RequestHandler } from 'express';
import { ApiError } from '../../utils/ApiError.js';
import { sendSuccess } from '../../utils/response.js';
import type {
  CreateReadingInput,
  ListReadingsQueryInput,
  UpdateReadingInput,
} from './readings.schemas.js';
import * as readingsService from './readings.service.js';

// Controllers stay thin: read the request, call the service, send the response.
// req.body and req.query have already been validated by the validate() middleware. The user id
// always comes from req.user (set by requireAuth), never from the request.

function currentUserId(req: Parameters<RequestHandler>[0]): string {
  if (!req.user) {
    throw new ApiError(401, 'Please log in to continue.');
  }
  return req.user.id;
}

export const create: RequestHandler = async (req, res) => {
  const reading = await readingsService.createReading(
    currentUserId(req),
    req.body as CreateReadingInput,
  );
  sendSuccess(res, 'Reading added', { reading }, 201);
};

export const list: RequestHandler = async (req, res) => {
  const page = await readingsService.listReadings(
    currentUserId(req),
    req.query as unknown as ListReadingsQueryInput,
  );
  sendSuccess(res, 'Readings', page);
};

export const getById: RequestHandler = async (req, res) => {
  const reading = await readingsService.getReading(currentUserId(req), String(req.params.id));
  sendSuccess(res, 'Reading', { reading });
};

export const update: RequestHandler = async (req, res) => {
  const reading = await readingsService.updateReading(
    currentUserId(req),
    String(req.params.id),
    req.body as UpdateReadingInput,
  );
  sendSuccess(res, 'Reading updated', { reading });
};

export const remove: RequestHandler = async (req, res) => {
  await readingsService.deleteReading(currentUserId(req), String(req.params.id));
  sendSuccess(res, 'Reading deleted', null);
};

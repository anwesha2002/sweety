import { Router } from 'express';
import { ApiError } from '../../utils/ApiError.js';
import { sendSuccess } from '../../utils/response.js';
import { pingDatabase } from './health.repository.js';

export const healthRouter = Router();

healthRouter.get('/', async (req, res) => {
  try {
    await pingDatabase();
  } catch (error) {
    req.log.error({ err: error }, 'Health check: database unreachable');
    throw new ApiError(503, 'Database is not reachable.');
  }
  sendSuccess(res, 'OK', { status: 'ok', database: 'up' });
});

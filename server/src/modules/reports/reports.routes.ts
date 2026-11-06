import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import { validate } from '../../middleware/validate.js';
import { daily, monthly, monthToDate } from './reports.controller.js';
import { reportQuerySchema } from './reports.schemas.js';

export const reportsRouter = Router();

reportsRouter.use(requireAuth);

reportsRouter.get('/daily', validate({ query: reportQuerySchema }), daily);
reportsRouter.get('/month-to-date', validate({ query: reportQuerySchema }), monthToDate);
reportsRouter.get('/monthly', validate({ query: reportQuerySchema }), monthly);

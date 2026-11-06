import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import { validate } from '../../middleware/validate.js';
import { create, getById, list, remove, update } from './readings.controller.js';
import {
  createReadingSchema,
  listReadingsQuerySchema,
  updateReadingSchema,
} from './readings.schemas.js';

export const readingsRouter = Router();

readingsRouter.use(requireAuth);

readingsRouter.post('/', validate({ body: createReadingSchema }), create);
readingsRouter.get('/', validate({ query: listReadingsQuerySchema }), list);
readingsRouter.get('/:id', getById);
readingsRouter.put('/:id', validate({ body: updateReadingSchema }), update);
readingsRouter.delete('/:id', remove);

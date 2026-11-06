import { Router } from 'express';
import { authRouter } from './modules/auth/auth.routes.js';
import { healthRouter } from './modules/health/health.routes.js';
import { readingsRouter } from './modules/readings/readings.routes.js';
import { reportsRouter } from './modules/reports/reports.routes.js';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/readings', readingsRouter);
apiRouter.use('/reports', reportsRouter);

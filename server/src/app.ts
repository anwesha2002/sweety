import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { serveClient } from './middleware/serveClient.js';
import { apiRouter } from './routes.js';

// The app is built here and started in server.ts, so tests can import it without opening a port.
// Express 5 forwards errors from async handlers to the error handler, so no wrapper is needed.
export const app = express();

app.set('trust proxy', env.TRUST_PROXY);

app.use(pinoHttp({ logger }));
app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

app.use('/api/v1', apiRouter);

// Single-container deployments: the API also serves the built React app (same origin).
if (env.CLIENT_DIST_DIR) {
  app.use(serveClient(env.CLIENT_DIST_DIR));
}

app.use(notFoundHandler);
app.use(errorHandler);

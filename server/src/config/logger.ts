import { pino } from 'pino';
import { env } from './env.js';

// pino-http logs request/response metadata but never request bodies.
// Sensitive headers are redacted so cookies and tokens never reach the logs.
export const logger = pino({
  level: env.isTest ? 'silent' : env.isProduction ? 'info' : 'debug',
  redact: {
    paths: ['req.headers.cookie', 'req.headers.authorization', 'res.headers["set-cookie"]'],
    censor: '[Redacted]',
  },
});

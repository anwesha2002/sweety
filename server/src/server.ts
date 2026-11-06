import { app } from './app.js';
import { pool } from './config/db.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';

const server = app.listen(env.PORT, () => {
  logger.info(`Sweety API listening on port ${env.PORT} (${env.NODE_ENV})`);
});

// Graceful shutdown: stop accepting requests, then close the database connections.
function shutdown(signal: string): void {
  logger.info(`${signal} received, shutting down`);

  server.close((closeError) => {
    pool
      .end()
      .catch((error: unknown) => logger.error({ err: error }, 'Error closing the database pool'))
      .finally(() => process.exit(closeError ? 1 : 0));
  });

  // Safety net in case open connections never close.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

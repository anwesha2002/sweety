import { defineConfig } from 'vitest/config';

// Must be set before anything reads the environment (config/env.ts picks .env.test from this).
process.env.NODE_ENV = 'test';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globalSetup: ['./tests/global-setup.ts'],
    setupFiles: ['./tests/setup.ts'],
    // Test files share one database, so run them one after another.
    fileParallelism: false,
  },
});

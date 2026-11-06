import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env (or .env.test when running tests).
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: fileURLToPath(new URL(`../../${envFile}`, import.meta.url)), quiet: true });

const SECONDS_PER_UNIT = { s: 1, m: 60, h: 3600, d: 86400 } as const;

// "1d", "12h", "30m" or "45s"; converted to seconds so the same value drives the JWT and the cookie.
const durationSchema = z
  .string()
  .regex(/^\d+[smhd]$/, 'Use a number followed by s, m, h or d (for example 1d or 12h).')
  .default('1d')
  .transform((value) => {
    const unit = value.slice(-1) as keyof typeof SECONDS_PER_UNIT;
    return Number(value.slice(0, -1)) * SECONDS_PER_UNIT[unit];
  });

// "false" | "true" | a number of proxy hops (e.g. "1")
const trustProxySchema = z
  .string()
  .optional()
  .transform((value): boolean | number => {
    if (value === undefined || value === '' || value === 'false') return false;
    if (value === 'true') return true;
    return Number(value);
  })
  .refine((value) => typeof value === 'boolean' || (Number.isInteger(value) && value >= 0), {
    message: 'Use true, false or a number of proxy hops.',
  });

//Node Environment for the application
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z
    .string()
    .regex(/^postgres(ql)?:\/\//, 'Must be a PostgreSQL connection string (postgresql://...).'),
  JWT_SECRET: z.string().min(32, 'Must be at least 32 characters long.'),
  JWT_EXPIRES_IN: durationSchema,
  CLIENT_URL: z.url('Must be a full URL such as http://localhost:5173.'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
  TRUST_PROXY: trustProxySchema,
  // Set to the folder with the built React app to have the API serve it too (single-container
  // deployments). Leave unset in development, where Vite serves the app.
  CLIENT_DIST_DIR: z.string().min(1).optional(),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const problems = result.error.issues
    .map((issue) => `  - ${issue.path.join('.') || 'env'}: ${issue.message}`)
    .join('\n');
  console.error(`\nInvalid environment configuration:\n${problems}\n`);
  console.error(`Check server/${envFile} (see server/.env.example for the expected variables).\n`);
  process.exit(1);
}

const { JWT_EXPIRES_IN, ...rest } = result.data;

export const env = {
  ...rest,
  /** Token lifetime in seconds; the auth cookie maxAge uses the same value. */
  JWT_EXPIRES_IN_SECONDS: JWT_EXPIRES_IN,
  isProduction: rest.NODE_ENV === 'production',
  isTest: rest.NODE_ENV === 'test',
};

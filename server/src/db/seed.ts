import bcrypt from 'bcrypt';
import { pool } from '../config/db.js';
import { env } from '../config/env.js';
import { createUser, findUserByEmail } from '../modules/users/user.repository.js';

// Creates one demo user (no readings). Safe to run more than once.
// Run with: npm run db:seed
const DEMO_USER = {
  name: 'Demo User',
  email: 'demo@example.com',
  password: 'demo-password-123',
};

async function main(): Promise<void> {
  if (env.isProduction) {
    throw new Error('Refusing to seed a production database.');
  }

  if (await findUserByEmail(DEMO_USER.email)) {
    console.log(`Demo user already exists (${DEMO_USER.email}).`);
    return;
  }

  const passwordHash = await bcrypt.hash(DEMO_USER.password, env.BCRYPT_ROUNDS);
  await createUser({ name: DEMO_USER.name, email: DEMO_USER.email, passwordHash });
  console.log(`Created demo user: ${DEMO_USER.email} / ${DEMO_USER.password}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

import { z } from 'zod';

// bcrypt only uses the first 72 bytes of a password, so longer passwords are rejected.
const email = z
  .string({ error: 'Enter your email.' })
  .trim()
  .toLowerCase()
  .pipe(z.email('Enter a valid email.'));

export const registerSchema = z.object({
  name: z
    .string({ error: 'Enter your name.' })
    .trim()
    .min(1, 'Enter your name.')
    .max(100, 'Name must be 100 characters or fewer.'),
  email,
  password: z
    .string({ error: 'Enter a password.' })
    .min(8, 'Password must be at least 8 characters.')
    .max(72, 'Password must be 72 characters or fewer.'),
});

export const loginSchema = z.object({
  email,
  password: z.string({ error: 'Enter your password.' }).min(1, 'Enter your password.'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

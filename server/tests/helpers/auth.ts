import request from 'supertest';
import { app } from '../../src/app.js';

export const testUser = {
  name: 'Asha Rao',
  email: 'asha@example.com',
  password: 'password123',
};

/** Cookies from a response, in the form supertest's .set('Cookie', ...) expects. */
export function getCookies(response: request.Response): string[] {
  const header = response.headers['set-cookie'];
  return Array.isArray(header) ? header : [];
}

export function registerUser(overrides: Partial<typeof testUser> = {}): request.Test {
  return request(app)
    .post('/api/v1/auth/register')
    .send({ ...testUser, ...overrides });
}

/**
 * Registers a user and returns the auth cookie of the resulting session.
 * Pass overrides (e.g. a different email) to create a second user.
 */
export async function registerAndGetCookie(
  overrides: Partial<typeof testUser> = {},
): Promise<string[]> {
  const response = await registerUser(overrides);
  return getCookies(response);
}

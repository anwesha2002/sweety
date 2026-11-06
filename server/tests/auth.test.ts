import bcrypt from 'bcrypt';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { findUserByEmail } from '../src/modules/users/user.repository.js';
import { getCookies, registerAndGetCookie, registerUser, testUser } from './helpers/auth.js';

describe('POST /api/v1/auth/register', () => {
  it('registers a user and sets an HttpOnly auth cookie', async () => {
    const response = await registerUser();

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user).toMatchObject({ name: testUser.name, email: testUser.email });
    expect(response.body.data.user.passwordHash).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toContain('token');

    const [cookie] = getCookies(response);
    expect(cookie).toMatch(/^token=.+/);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
  });

  it('returns 409 for a duplicate email, ignoring letter case', async () => {
    await registerUser();
    const response = await registerUser({ email: 'ASHA@Example.COM' });

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
    expect(response.body.errors).toEqual([{ field: 'email', message: expect.any(String) }]);
  });

  it('stores a bcrypt hash, never the plain password', async () => {
    await registerUser();

    const stored = await findUserByEmail(testUser.email);
    if (!stored) throw new Error('The registered user was not saved.');
    expect(stored.passwordHash).not.toBe(testUser.password);
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(await bcrypt.compare(testUser.password, stored.passwordHash)).toBe(true);
  });

  it('returns 400 with field errors for invalid input', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: '   ', email: 'not-an-email', password: 'short' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Validation failed');
    const fields = response.body.errors.map((error: { field: string }) => error.field);
    expect(fields).toEqual(expect.arrayContaining(['name', 'email', 'password']));
  });
});

describe('POST /api/v1/auth/login', () => {
  it('logs in with correct credentials and sets the cookie', async () => {
    await registerUser();

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: testUser.password });

    expect(response.status).toBe(200);
    expect(response.body.data.user.email).toBe(testUser.email);
    expect(getCookies(response)[0]).toMatch(/^token=.+/);
  });

  it('gives the same 401 message for a wrong password and an unknown email', async () => {
    await registerUser();

    const wrongPassword = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: 'wrong-password' });
    const unknownEmail = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@example.com', password: testUser.password });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.message).toBe('Invalid email or password.');
    expect(unknownEmail.body.message).toBe(wrongPassword.body.message);
  });
});

describe('GET /api/v1/auth/me', () => {
  it('returns 401 without a cookie', async () => {
    const response = await request(app).get('/api/v1/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('returns the current user, without passwordHash, when logged in', async () => {
    const cookie = await registerAndGetCookie();

    const response = await request(app).get('/api/v1/auth/me').set('Cookie', cookie);

    expect(response.status).toBe(200);
    expect(response.body.data.user).toMatchObject({ email: testUser.email, name: testUser.name });
    expect(response.body.data.user.passwordHash).toBeUndefined();
  });

  it('returns 401 for a tampered token', async () => {
    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', 'token=not-a-real-jwt');

    expect(response.status).toBe(401);
  });
});

describe('POST /api/v1/auth/logout', () => {
  it('clears the auth cookie', async () => {
    const cookie = await registerAndGetCookie();

    const response = await request(app).post('/api/v1/auth/logout').set('Cookie', cookie);

    expect(response.status).toBe(200);
    const [cleared] = getCookies(response);
    expect(cleared).toMatch(/^token=;/);
    expect(cleared).toContain('Expires=Thu, 01 Jan 1970');
  });

  it('works even when nobody is logged in', async () => {
    const response = await request(app).post('/api/v1/auth/logout');

    expect(response.status).toBe(200);
  });
});
